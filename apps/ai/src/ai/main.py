import os
from collections import Counter, defaultdict
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException, Header, status
from pydantic import BaseModel
from sklearn.feature_extraction.text import CountVectorizer

from .besttime import build_besttime_heatmap
from .db import close_pool, init_pool, write_analysis_results, _get_pool
from .likes_model import (
    LikesModelNotReady,
    MODEL_VERSION as LIKES_MODEL_VERSION,
    get_account_likes_report,
    get_global_report as get_likes_global_report,
    predict_likes,
    train_likes_model,
)
from .pipeline import on_isle_sentiment
from .schemas import (
    AccountAnalyzeRequest,
    AccountAnalyzeResponse,
    AnalysisResultRow,
    AnalyzeRequest,
    AnalyzeResponse,
    KeywordCount,
    KeywordScore,
    LikesBaselinePayload,
    PostEngagementInput,
    PredictLikesRequest,
    PredictLikesResponse,
    SentimentPayload,
    SentimentReasonPayload,
    SpamPayload,
    TopicItem,
    TopicPayload,
)
from .sentiment_model import SentimentModel, get_model
from .spam_serving import SpamModelNotReady, load_spam_model, score_comments_for_spam
from .topic_model import (
    TopicAnalysisModel,
    TopicModelError,
    TURKISH_STOPWORDS,
    get_topic_model,
    prepare_text_for_topics,
)

from dotenv import load_dotenv
load_dotenv()  # .env dosyasını yükler

_DB_ENABLED = os.environ.get("SKIP_DB_WRITE") != "1"

# --- sentiment_reasons ayarları ---
MIN_COMMENTS_FOR_REASON = 3
TOP_N_KEYWORDS = 5
SENTIMENT_REASON_MODEL_VERSION = "sentiment-reason-keywords-v1"


def verify_internal_token(x_internal_token: str = Header(None)):
    expected_token = (os.environ.get("INTERNAL_SECRET_TOKEN"))
    if not x_internal_token or x_internal_token != expected_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="İmzasız veya geçersiz iç token.",
        )
    return x_internal_token


@asynccontextmanager
async def lifespan(app: FastAPI):
    if _DB_ENABLED:
        init_pool()
    get_model()
    get_topic_model()
    if _DB_ENABLED:
        train_likes_model()
        load_spam_model()
    yield
    if _DB_ENABLED:
        close_pool()


app = FastAPI(
    title="InstaScope AI Service",
    description="Sosyal Medya Analiz Platformu - AI & NLP Servisi",
    version="0.1.0",
    lifespan=lifespan,
)


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str


@app.get("/health", response_model=HealthResponse)
def health_check():
    return HealthResponse(status="ok", service="instascope-ai", version="0.1.0")


def _extract_top_keywords(texts: list[str]) -> list[dict]:
    cleaned = [prepare_text_for_topics(t) for t in texts]
    cleaned = [c for c in cleaned if c.strip()]
    if len(cleaned) < MIN_COMMENTS_FOR_REASON:
        return []

    try:
        vectorizer = CountVectorizer(stop_words=TURKISH_STOPWORDS, min_df=1, ngram_range=(1, 1))
        X = vectorizer.fit_transform(cleaned)
    except ValueError:
        return []

    freqs = X.sum(axis=0).A1
    vocab = vectorizer.get_feature_names_out()
    pairs = sorted(zip(vocab, freqs), key=lambda p: -p[1])[:TOP_N_KEYWORDS]
    return [{"word": w, "count": int(c)} for w, c in pairs]


def _build_sentiment_reason_results(
    valid_comments: list, predictions: list
) -> list[AnalysisResultRow]:
    post_groups: dict[str, list[tuple[str, str]]] = defaultdict(list)
    for comment, pred in zip(valid_comments, predictions):
        if getattr(comment, "post_id", None):
            post_groups[comment.post_id].append((comment.text, pred.label))

    reason_results = []
    for post_id, items in post_groups.items():
        label_counts = Counter(label for _, label in items)
        dominant_label, dominant_count = label_counts.most_common(1)[0]

        if dominant_count < MIN_COMMENTS_FOR_REASON:
            continue

        dominant_texts = [text for text, label in items if label == dominant_label]
        keywords = _extract_top_keywords(dominant_texts)
        if not keywords:
            continue

        reason_results.append(
            AnalysisResultRow(
                subject_type="post",
                subject_id=post_id,
                kind="sentiment_reasons",
                payload=SentimentReasonPayload(
                    dominant_label=dominant_label,
                    comment_count=dominant_count,
                    keywords=[KeywordCount(**k) for k in keywords],
                ),
                model_version=SENTIMENT_REASON_MODEL_VERSION,
            )
        )

    return reason_results


@app.post(
    "/internal/analyze",
    response_model=AnalyzeResponse,
    dependencies=[Depends(verify_internal_token)],
)
def analyze(payload: AnalyzeRequest, model: SentimentModel = Depends(get_model)):
    valid_comments = [c for c in payload.comments if c.text and c.text.strip()]
    skipped = len(payload.comments) - len(valid_comments)
    if skipped:
        print(f"[analyze] {skipped} boş metinli yorum atlandı (analiz edilecek içerik yok).")

    if not valid_comments:
        return AnalyzeResponse(results=[], model_version=model.model_name, count=0)

    temiz_metinler = [on_isle_sentiment(c.text) for c in valid_comments]
    predictions = model.predict_batch(temiz_metinler)

    results = [
        AnalysisResultRow(
            subject_type="comment",
            subject_id=comment.comment_id,
            kind="sentiment",
            payload=SentimentPayload(label=pred.label, score=pred.score),
            model_version=model.model_name,
        )
        for comment, pred in zip(valid_comments, predictions)
    ]

    reason_results = _build_sentiment_reason_results(valid_comments, predictions)
    if reason_results:
        print(f"[analyze] {len(reason_results)} post için sentiment_reasons üretildi.")
    results.extend(reason_results)

    spam_scores: dict = {}
    if _DB_ENABLED:
        try:
            comment_ids = [c.comment_id for c in payload.comments]
            spam_scores = score_comments_for_spam(comment_ids)
        except SpamModelNotReady:
            pass

    for comment_id, (is_spam, confidence) in spam_scores.items():
        results.append(
            AnalysisResultRow(
                subject_type="comment",
                subject_id=comment_id,
                kind="spam",
                payload=SpamPayload(is_spam=is_spam, confidence=confidence),
                model_version="spam-learned-logreg-v1",
            )
        )

    if _DB_ENABLED:
        write_analysis_results(results)

    return AnalyzeResponse(results=results, model_version=model.model_name, count=len(results))


@app.post(
    "/internal/analyze-account",
    response_model=AccountAnalyzeResponse,
    dependencies=[Depends(verify_internal_token)],
)
def analyze_account(
    data: AccountAnalyzeRequest,
    topic_m: TopicAnalysisModel = Depends(get_topic_model),
):
    print(f"Hesap analizi tetiklendi: {data.igUsername} (ID: {data.accountId})")

    if not _DB_ENABLED:
        return AccountAnalyzeResponse(
            success=True,
            message="SKIP_DB_WRITE aktif, DB okuma/yazma atlandı (test modu)",
            accountId=data.accountId,
        )

    try:
        pool = _get_pool()
        with pool.connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT c.text 
                    FROM comments c
                    JOIN posts p ON p.id = c.post_id
                    WHERE p.account_id = %s
                    UNION ALL
                    SELECT caption AS text FROM posts WHERE account_id = %s AND caption IS NOT NULL
                    LIMIT 1000
                    """,
                    (data.accountId, data.accountId),
                )
                text_rows = cur.fetchall()

                cur.execute(
                    """
                    SELECT p.posted_at, pm.engagement_rate
                    FROM posts p
                    JOIN post_metrics pm ON pm.post_id = p.id
                    WHERE p.account_id = %s AND p.posted_at IS NOT NULL
                    """,
                    (data.accountId,),
                )
                engagement_rows = cur.fetchall()

        raw_texts = [r[0] for r in text_rows if r[0] and len(r[0].strip()) > 0]
        texts = [prepare_text_for_topics(t) for t in raw_texts]

        if texts:
            try:
                raw_topics = topic_m.fit_transform_topics(texts, nr_topics=8)
                topic_payload = TopicPayload(
                    status="completed",
                    total_topics=len(raw_topics),
                    topics=[
                        TopicItem(
                            topic_id=t["topic_id"],
                            topic_name=t["topic_name"],
                            document_count=t["document_count"],
                            keywords=[KeywordScore(**k) for k in t["keywords"]],
                        )
                        for t in raw_topics
                    ],
                )
            except TopicModelError as exc:
                print(
                    f"Topic modelleme başarısız oldu ({data.igUsername}): {exc} — "
                    "besttime/likes_baseline yine de yazılacak."
                )
                topic_payload = TopicPayload(status="error", total_topics=0, topics=[])
        else:
            topic_payload = TopicPayload(status="no_data", total_topics=0, topics=[])

        posts_for_besttime = [
            PostEngagementInput(posted_at=posted_at, engagement_rate=engagement_rate)
            for posted_at, engagement_rate in engagement_rows
            if engagement_rate is not None
        ]
        besttime_payload = build_besttime_heatmap(posts_for_besttime)

        results = [
            AnalysisResultRow(
                subject_type="account",
                subject_id=data.accountId,
                kind="topics",
                payload=topic_payload,
                model_version=topic_m.model_name,
            ),
            AnalysisResultRow(
                subject_type="account",
                subject_id=data.accountId,
                kind="besttime",
                payload=besttime_payload,
                model_version="besttime-heuristic-v1",
            ),
        ]

        try:
            account_likes_report = get_account_likes_report(data.accountId)
        except LikesModelNotReady:
            account_likes_report = None

        if account_likes_report is not None:
            results.append(
                AnalysisResultRow(
                    subject_type="account",
                    subject_id=data.accountId,
                    kind="likes_baseline",
                    payload=LikesBaselinePayload(
                        model_type=account_likes_report.model_type,
                        mae=account_likes_report.mae,
                        naive_mae=account_likes_report.naive_mae,
                        beats_naive=account_likes_report.beats_naive,
                        sample_size=account_likes_report.n_test,
                    ),
                    model_version=LIKES_MODEL_VERSION,
                )
            )

        write_analysis_results(results)

    except Exception as e:
        print(f"Kayıt sırasında hata oluştu: {e}")
        raise HTTPException(status_code=500, detail=str(e))

    return AccountAnalyzeResponse(
        success=True,
        message="Hesap analizi (konu + en iyi zaman) tamamlandı ve veritabanına kaydedildi",
        accountId=data.accountId,
    )


@app.post(
    "/internal/predict-likes",
    response_model=PredictLikesResponse,
    dependencies=[Depends(verify_internal_token)],
)
def predict_likes_endpoint(payload: PredictLikesRequest):
    """
    Canlı beğeni tahmini ("Bu postu Cuma 15:00'te paylaşsam kaç beğeni
    alır?"). Modeli YENİDEN EĞİTMEZ — zaten cache'lenmiş global pipeline'a
    tek satırlık bir soru sorar. Hiçbir AnalysisResult satırı YAZMIYOR.

    hashtag_count/caption_length'i ARTIK BURADA hesaplamıyoruz — ikisi de
    predict_likes() içinde, payload.caption'dan (likes_baseline.py'daki
    EĞİTİMDE kullanılan aynı HASHTAG_RE ile) çıkarılıyor. Tek yerde
    hesaplama, eğitim/tahmin arasında tutarsızlık riskini ortadan kaldırır.
    """
    try:
        predicted = predict_likes(
            account_id=payload.account_id,
            hour=payload.hour,
            day_of_week=payload.day_of_week,
            caption=payload.caption,
            content_type=payload.content_type,
        )
    except LikesModelNotReady as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    return PredictLikesResponse(
        predicted_likes=round(predicted, 1),
        model_version=LIKES_MODEL_VERSION,
    )


class LikesRetrainResponse(BaseModel):
    success: bool
    message: str
    model_type: str | None = None
    mae: float | None = None
    naive_mae: float | None = None
    beats_naive: bool | None = None
    n_train: int | None = None
    n_test: int | None = None


@app.post("/internal/retrain-likes-baseline", response_model=LikesRetrainResponse)
def retrain_likes_baseline():
    if not _DB_ENABLED:
        return LikesRetrainResponse(
            success=True, message="SKIP_DB_WRITE aktif, retrain atlandı (test modu)"
        )

    report = train_likes_model()
    if report is None:
        raise HTTPException(
            status_code=503,
            detail="Likes baseline modeli eğitilemedi: yeterli veri yok (test seti boş).",
        )

    return LikesRetrainResponse(
        success=True,
        message="Likes baseline modeli yeniden eğitildi.",
        model_type=report.model_type,
        mae=report.mae,
        naive_mae=report.naive_mae,
        beats_naive=report.beats_naive,
        n_train=report.n_train,
        n_test=report.n_test,
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("src.ai.main:app", host="0.0.0.0", port=8000, reload=True)