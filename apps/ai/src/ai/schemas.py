"""
İstek/yanıt şemaları — POST /internal/analyze, POST /internal/analyze-account

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

DÜZELTME NOTU: Önceki sürümde AnalysisResultRow.payload sadece
SentimentPayload kabul ediyordu — TopicPayload tanımlıydı ama tip
sistemine hiç bağlanmamıştı, bu yüzden analyze-account endpoint'i
Pydantic'i atlayıp ham SQL yazmak zorunda kalmıştı. Artık payload
Union[...] — üç kind de write_analysis_results() üzerinden,
tutarlı tek yoldan yazılabiliyor.

Üç kind destekleniyor:
  - "sentiment" (subject_type="comment"): POST /internal/analyze
  - "topics" (subject_type="account"): POST /internal/analyze-account,
    BERTopic çıktısı (bkz. topic_model.py)
  - "besttime" (subject_type="account"): POST /internal/analyze-account,
    168 hücrelik ısı haritası (bkz. besttime.py). dayOfWeek ISO 8601,
    insufficientData yok — eşik kararı Backend/Frontend'de.
"""

from __future__ import annotations
from datetime import datetime
from typing import Literal, Union

from pydantic import BaseModel, Field

SentimentLabel = Literal["positive", "negative", "neutral"]
AnalysisKind = Literal["sentiment", "topics", "besttime"]
SubjectType = Literal["comment", "account"]  # DÜZELTME: hep küçük harf — "ACCOUNT" değil


# ---------- kind="sentiment" (POST /internal/analyze) ----------

class CommentInput(BaseModel):
    comment_id: str = Field(..., description="comments tablosundaki id")
    text: str = Field(..., min_length=1)


class AnalyzeRequest(BaseModel):
    kind: Literal["sentiment"] = "sentiment"
    comments: list[CommentInput] = Field(..., min_length=1, max_length=500)


class SentimentPayload(BaseModel):
    label: SentimentLabel
    score: float = Field(..., ge=0.0, le=1.0)


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
    status: str = "completed"  # "completed" | "no_data"
    total_topics: int
    topics: list[TopicItem]


# ---------- kind="besttime" (POST /internal/analyze-account) ----------

class PostEngagementInput(BaseModel):
    posted_at: datetime
    engagement_rate: float


class BesttimeCell(BaseModel):
    """
    Alan adları BİLEREK camelCase — Backend ile kesinleşen JSON sözleşmesine
    (dayOfWeek/hour/avgEngagement/sampleSize) birebir uymak için.
    """

    dayOfWeek: int = Field(..., ge=1, le=7, description="ISO 8601: 1=Pazartesi, 7=Pazar")
    hour: int = Field(..., ge=0, le=23)
    avgEngagement: float | None
    sampleSize: int = Field(..., ge=0)


class BesttimePayload(BaseModel):
    heatmap: list[BesttimeCell] = Field(..., description="Her zaman 7*24=168 hücre")


# ---------- ortak ----------

class AnalysisResultRow(BaseModel):
    """analysis_results tablosuna karşılık gelen satır (id/created_at DB'de otomatik)."""

    subject_type: SubjectType
    subject_id: str
    kind: AnalysisKind
    payload: Union[SentimentPayload, TopicPayload, BesttimePayload]
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