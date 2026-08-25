"""
İstek/yanıt şemaları — POST /internal/analyze, POST /internal/analyze-account,
POST /internal/predict-likes

Backend'in gerçek Prisma şeması (teyit edildi):

    model AnalysisResult {
      id           String   @id @default(uuid())
      subjectType  String   @map("subject_type")
      subjectId    String   @map("subject_id")
      kind         String
      payload      Json
      modelVersion String   @map("model_version")
      createdAt    DateTime @default(now()) @map("created_at")
      @@map("analysis_results")
    }

`id` ve `createdAt` DB tarafında otomatik üretiliyor.

Beş kind destekleniyor:
  - "sentiment" (subject_type="comment"): POST /internal/analyze
  - "spam" (subject_type="comment"): POST /internal/analyze
  - "sentiment_reasons" (subject_type="post"): POST /internal/analyze.
    Backend'in CommentInput'a post_id eklemesi ŞART.
  - "topics" (subject_type="account"): POST /internal/analyze-account
  - "besttime" (subject_type="account"): POST /internal/analyze-account

POST /internal/predict-likes bir "kind" DEĞİL — hiçbir AnalysisResult satırı
yazmıyor. Durumsuz (stateless), o anlık bir tahmin sorgusu.
"""

from __future__ import annotations
from datetime import datetime
from typing import Literal, Union

from pydantic import BaseModel, Field

SentimentLabel = Literal["positive", "negative", "neutral"]
AnalysisKind = Literal["sentiment", "topics", "besttime", "likes_baseline", "spam", "sentiment_reasons"]
SubjectType = Literal["comment", "account", "post"]


# ---------- kind="sentiment" (POST /internal/analyze) ----------

class CommentInput(BaseModel):
    comment_id: str = Field(..., description="comments tablosundaki id")
    text: str = Field(...)
    post_id: str | None = Field(
        default=None,
        description="(sentiment_reasons için) — hangi posta ait olduğu. "
        "Backend göndermezse bu yorum sentiment_reasons analizine dahil edilmez.",
    )


class AnalyzeRequest(BaseModel):
    kind: Literal["sentiment"] = "sentiment"
    comments: list[CommentInput] = Field(..., min_length=1, max_length=500)


class SentimentPayload(BaseModel):
    label: SentimentLabel
    score: float = Field(..., ge=0.0, le=1.0)


# ---------- kind="spam" (POST /internal/analyze) ----------

class SpamPayload(BaseModel):
    is_spam: bool
    confidence: float = Field(..., ge=0.0, le=1.0, description="Modelin pozitif sınıf olasılığı")


# ---------- kind="sentiment_reasons" (POST /internal/analyze) ----------

class KeywordCount(BaseModel):
    word: str
    count: int = Field(..., ge=1)


class SentimentReasonPayload(BaseModel):
    dominant_label: SentimentLabel
    comment_count: int = Field(..., ge=3, description="Baskın etikete sahip yorum sayısı")
    keywords: list[KeywordCount]


# ---------- kind="topics" (POST /internal/analyze-account) ----------

class KeywordScore(BaseModel):
    word: str
    score: float


class TopicItem(BaseModel):
    topic_id: int
    topic_name: str
    document_count: int
    keywords: list[KeywordScore]


class TopicPayload(BaseModel):
    status: str = "completed"  # "completed" | "no_data" | "error"
    total_topics: int
    topics: list[TopicItem]


# ---------- kind="besttime" (POST /internal/analyze-account) ----------

class PostEngagementInput(BaseModel):
    posted_at: datetime
    engagement_rate: float


class BesttimeCell(BaseModel):
    dayOfWeek: int = Field(..., ge=1, le=7, description="ISO 8601: 1=Pazartesi, 7=Pazar")
    hour: int = Field(..., ge=0, le=23)
    avgEngagement: float | None
    sampleSize: int = Field(..., ge=0)


class BesttimePayload(BaseModel):
    heatmap: list[BesttimeCell] = Field(..., description="Her zaman 7*24=168 hücre")


# ---------- kind="likes_baseline" (POST /internal/analyze-account) ----------

class LikesBaselinePayload(BaseModel):
    model_type: str  # "ridge" | "gradient_boosting"
    mae: float = Field(..., ge=0.0)
    naive_mae: float = Field(..., ge=0.0, description="Naif taban çizgisi: son 10 gönderi ortalaması")
    beats_naive: bool
    sample_size: int = Field(..., ge=0, description="Bu hesabın test kesitindeki gönderi sayısı")


# ---------- POST /internal/predict-likes ----------

class PredictLikesRequest(BaseModel):
    """
    Canlı beğeni tahmini isteği. Kullanıcı sadece DÖRT şeyi girer: hangi
    hesap, hangi saat, hangi gün, hangi içerik tipi, ve bir taslak
    açıklama METNİ. hashtag_count/caption_length gibi teknik alanlar YOK —
    `caption`'dan otomatik çıkarılıyor (bkz. likes_model.predict_likes).
    account_growth_rate/account_recent_avg_likes de kullanıcıdan İSTENMİYOR,
    hesabın DB'deki geçmişinden otomatik çekiliyor.
    """

    account_id: str
    hour: int = Field(..., ge=0, le=23)
    day_of_week: int = Field(
        ...,
        ge=1,
        le=7,
        description="ISO 8601: 1=Pazartesi, 7=Pazar. DİKKAT: JavaScript'in "
        "Date.getDay()'i (0=Pazar, 1=Pazartesi...6=Cumartesi) İLE AYNI DEĞİL — "
        "frontend'de dönüştürme gerekiyor, ya da (önerilen) kullanıcıya hiç "
        "sayı göstermeyip 7 seçenekli bir gün seçici sunup her seçeneğin "
        "arkasında sabit ISO değerini (1-7) tutmak.",
    )
    caption: str = Field(
        default="",
        description="Taslak açıklama METNİ (sayı DEĞİL). Hem uzunluk "
        "(caption_length) hem hashtag SAYISI (hashtag_count) bu metinden "
        "otomatik hesaplanıyor — frontend başka bir alan göndermek zorunda değil.",
    )
    content_type: str = Field(..., description="IMAGE | VIDEO | CAROUSEL")


class PredictLikesResponse(BaseModel):
    predicted_likes: float = Field(..., ge=0.0)
    model_version: str


# ---------- ortak ----------

class AnalysisResultRow(BaseModel):
    """analysis_results tablosuna karşılık gelen satır (id/created_at DB'de otomatik)."""

    subject_type: SubjectType
    subject_id: str
    kind: AnalysisKind
    payload: Union[
        SentimentPayload, TopicPayload, BesttimePayload,
        LikesBaselinePayload, SpamPayload, SentimentReasonPayload,
    ]
    model_version: str


class AnalyzeResponse(BaseModel):
    results: list[AnalysisResultRow]
    model_version: str
    count: int


# ---------- POST /internal/analyze-account tetikleme isteği ----------

class AccountAnalyzeRequest(BaseModel):
    accountId: str
    igUsername: str


class AccountAnalyzeResponse(BaseModel):
    success: bool
    message: str
    accountId: str | None = None