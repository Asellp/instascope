import os
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException, Header, status
from pydantic import BaseModel

from .besttime import build_besttime_heatmap
from .db import close_pool, init_pool, write_analysis_results, _get_pool
from .likes_model import (
    LikesModelNotReady,
    MODEL_VERSION as LIKES_MODEL_VERSION,
    get_account_likes_report,
    get_global_report as get_likes_global_report,
    train_likes_model,
)
from .pipeline import on_isle_sentiment
from .schemas import (
    AccountAnalyzeRequest,
    AccountAnalyzeResponse,
    AnalysisResultRow,
    AnalyzeRequest,
    AnalyzeResponse,
    KeywordScore,
    LikesBaselinePayload,
    PostEngagementInput,
    SentimentPayload,
    SpamPayload,
    TopicItem,
    TopicPayload,
)
from .sentiment_model import SentimentModel, get_model
from .spam_serving import SpamModelNotReady, load_spam_model, score_comments_for_spam
from .topic_model import TopicAnalysisModel, get_topic_model, prepare_text_for_topics

from dotenv import load_dotenv
load_dotenv()  # .env dosyasını yükler

_DB_ENABLED = os.environ.get("SKIP_DB_WRITE") != "1"


# Güvenlik Kontrolü: Servisler arası imzalı token doğrulaması
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
    # Pool ve modeller uygulama başlarken BİR KEZ kurulur — her istekte değil.
    if _DB_ENABLED:
        init_pool()
    get_model()        # sentiment model
    get_topic_model()  # BERTopic model
    if _DB_ENABLED:
        # Likes baseline (A3.3): global/pooled model burada BİR KEZ eğitilir ve
        # cache'lenir. Yeterli veri yoksa (proje henüz başlangıçtaysa) train_likes_model
        # None döner, servis yine de ayakta kalır — likes_baseline kind'i o durumda
        # analyze-account yanıtlarından atlanır.
        train_likes_model()
        # Spam modeli (A3.4): DB'den YENİDEN EĞİTİLMİYOR (comments tablosunda
        # is_spam etiketi yok) — offline eğitilip diske kaydedilmiş artifact
        # burada sadece YÜKLENİYOR. Artifact yoksa servis yine ayakta kalır,
        # kind="spam" o durumda /internal/analyze yanıtlarından atlanır.
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
    """
    Servis sağlık kontrolü ucu (Health Check).
    Docker ve orkestrasyon araçları servisin ayakta olup olmadığını buradan denetler.
    """
    return HealthResponse(status="ok", service="instascope-ai", version="0.1.0")


@app.post(
    "/internal/analyze",
    response_model=AnalyzeResponse,
    dependencies=[Depends(verify_internal_token)],
)
def analyze(payload: AnalyzeRequest, model: SentimentModel = Depends(get_model)):
    """
    A2.3 — kind=sentiment için batch skorlama + analysis_results tablosuna yazım.
    A3.4 — AYNI batch için kind=spam de üretilir (sentiment akışı KESİLMİYOR,
    spam yorumlar da sentiment alır — filtrelemeyi backend/frontend, is_spam
    flag'ine bakarak kendi aggregation'ında yapar).
    AI servisi aynı Postgres'e doğrudan yazıyor, ayrı bir Backend endpoint'i yok.

    DÜZELTME (gerçek veri bulgusu): artık on_isle(c.text).temiz_metin YERİNE
    on_isle_sentiment(c.text) kullanılıyor — emoji normalizasyonu sentiment
    için BİLEREK ATLANIYOR. Gerçek veriyle doğrulandı: emoji-ağırlıklı
    yorumlarda ("😍😍😍" gibi) eski yol modelin anlayamadığı soyut kodlara
    ([EMOJI_POZITIF]) çeviriyordu, macro F1'i 0.4826'ya düşürüyordu.
    on_isle_sentiment ile 0.6922'ye çıktı (+%43). Diğer kind'lar (topics,
    spam) bu değişiklikten etkilenmiyor — hâlâ kendi ayrı ön işleme
    yollarını kullanıyorlar.
    """
    temiz_metinler = [on_isle_sentiment(c.text) for c in payload.comments]
    predictions = model.predict_batch(temiz_metinler)

    results = [
        AnalysisResultRow(
            subject_type="comment",
            subject_id=comment.comment_id,
            kind="sentiment",
            payload=SentimentPayload(label=pred.label, score=pred.score),
            model_version=model.model_name,
        )
        for comment, pred in zip(payload.comments, predictions)
    ]

    # --- Spam/bot tespiti (A3.4) ---
    # Model DB'den eğitilmiyor, sadece davranışsal feature'lar (authorHash
    # geçmişi) DB'den canlı çekiliyor — sentiment'in aksine DB okuması ŞART,
    # bu yüzden _DB_ENABLED=False (test modu) burada da atlanmalı. Diskte
    # eğitilmiş artifact yoksa (SpamModelNotReady) da sessizce atlanır.
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
    """
    NestJS tarafı hesap bazlı veri toplama bittiğinde buraya istek atar.
    Tek tetiklemede iki analiz birden üretilir:
      - kind="topics"   (A3.1, BERTopic — yorum + caption metinlerinden)
      - kind="besttime" (A3.2, ısı haritası — gönderi zamanı + engagementRate'ten)

    DÜZELTMELER (önceki sürüme göre):
      - subject_type artık "account" (küçük harf), "ACCOUNT" değil.
      - Metinler artık prepare_text_for_topics() ile ön işlemeden geçiyor
        (hashtag'ler kelime olarak korunuyor, emoji etiketleri temizleniyor).
      - Ham SQL INSERT yerine, sentiment endpoint'iyle aynı, test edilmiş
        write_analysis_results() kullanılıyor — tek, tutarlı yazım yolu.
    """
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
                # 1. Konu modelleme için metinler: yorumlar + gönderi açıklamaları
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

                # 2. En iyi zaman analizi için: gönderi zamanı + etkileşim oranı
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

        # --- Konu modelleme (A3.1) ---
        raw_texts = [r[0] for r in text_rows if r[0] and len(r[0].strip()) > 0]
        texts = [prepare_text_for_topics(t) for t in raw_texts]

        if texts:
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
        else:
            topic_payload = TopicPayload(status="no_data", total_topics=0, topics=[])

        # --- En iyi zaman analizi (A3.2) ---
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
                model_version="besttime-heuristic-v1",  # gerçek ML modeli değil, kural tabanlı hesaplama
            ),
        ]

        # --- Etkileşim (beğeni) tahmini baseline (A3.3) ---
        # Model GLOBAL/havuzlanmış (bkz. likes_model.py) — burada YENİDEN eğitilmiyor,
        # sadece bu hesabın önceden hesaplanmış test-kesiti sonucu okunuyor.
        try:
            account_likes_report = get_account_likes_report(data.accountId)
        except LikesModelNotReady:
            account_likes_report = None  # servis henüz hiç eğitim yapamadı (yetersiz veri)

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
        # account_likes_report None ise (hesabın test kesitinde postu yok / model hiç
        # eğitilemedi) likes_baseline kind'i bu yanıttan sessizce atlanıyor — hata değil.

        write_analysis_results(results)

    except Exception as e:
        print(f"Kayıt sırasında hata oluştu: {e}")
        raise HTTPException(status_code=500, detail=str(e))

    return AccountAnalyzeResponse(
        success=True,
        message="Hesap analizi (konu + en iyi zaman) tamamlandı ve veritabanına kaydedildi",
        accountId=data.accountId,
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
    """
    Likes baseline (A3.3) global modelini DB'deki güncel veriyle yeniden eğitir.
    /internal/analyze-account BUNU tetiklemez — her hesap analizinde yeniden eğitim
    hem gereksiz hem de latency hedefiyle (A4.4) çelişir. Bu uç, servis dışından
    (örn. periyodik bir job/cron ile) manuel tetiklenmek için var.
    """
    if not _DB_ENABLED:
        return LikesRetrainResponse(
            success=True, message="SKIP_DB_WRITE aktif, retrain atlandı (test modu)"
        )

    report = train_likes_model()
    if report is None:
        # Servis çökmesin diye 503 — "henüz veri yetersiz", programatik bir hata değil.
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