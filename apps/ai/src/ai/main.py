import os
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException
from pydantic import BaseModel

from .besttime import build_besttime_heatmap
from .db import close_pool, init_pool, write_analysis_results, _get_pool
from .pipeline import on_isle
from .schemas import (
    AccountAnalyzeRequest,
    AccountAnalyzeResponse,
    AnalysisResultRow,
    AnalyzeRequest,
    AnalyzeResponse,
    KeywordScore,
    PostEngagementInput,
    SentimentPayload,
    TopicItem,
    TopicPayload,
)
from .sentiment_model import SentimentModel, get_model
from .topic_model import TopicAnalysisModel, get_topic_model, prepare_text_for_topics

_DB_ENABLED = os.environ.get("SKIP_DB_WRITE") != "1"


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Pool ve modeller uygulama başlarken BİR KEZ kurulur — her istekte değil.
    if _DB_ENABLED:
        init_pool()
    get_model()        # sentiment model
    get_topic_model()  # BERTopic model
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


@app.post("/internal/analyze", response_model=AnalyzeResponse)
def analyze(payload: AnalyzeRequest, model: SentimentModel = Depends(get_model)):
    """
    A2.3 — kind=sentiment için batch skorlama + analysis_results tablosuna yazım.
    AI servisi aynı Postgres'e doğrudan yazıyor, ayrı bir Backend endpoint'i yok.
    """
    temiz_metinler = [on_isle(c.text).temiz_metin for c in payload.comments]
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

    if _DB_ENABLED:
        write_analysis_results(results)

    return AnalyzeResponse(results=results, model_version=model.model_name, count=len(results))


@app.post("/internal/analyze-account", response_model=AccountAnalyzeResponse)
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
            raw_topics = topic_m.fit_transform_topics(texts, nr_topics=6)
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

        write_analysis_results(results)

    except Exception as e:
        print(f"Kayıt sırasında hata oluştu: {e}")
        raise HTTPException(status_code=500, detail=str(e))

    return AccountAnalyzeResponse(
        success=True,
        message="Hesap analizi (konu + en iyi zaman) tamamlandı ve veritabanına kaydedildi",
        accountId=data.accountId,
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("src.ai.main:app", host="0.0.0.0", port=8000, reload=True)