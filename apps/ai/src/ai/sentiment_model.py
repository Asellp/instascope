"""
Duygu analizi model wrapper'ı.

A1.4'te (notebooks/02_model_comparison.ipynb) yapılan karşılaştırmaya göre
seçilen model: cardiffnlp/twitter-xlm-roberta-base-sentiment.

Etiket eşlemesi notebook'taki ile birebir aynı:
  LABEL_0 -> negative
  LABEL_1 -> neutral
  LABEL_2 -> positive
"""

from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache

from transformers import pipeline

MODEL_NAME = "cardiffnlp/twitter-xlm-roberta-base-sentiment"

_LABEL_MAP = {
    "LABEL_0": "negative",
    "LABEL_1": "neutral",
    "LABEL_2": "positive",
}


@dataclass
class SentimentPrediction:
    label: str  # "positive" | "negative" | "neutral"
    score: float


class SentimentModel:
    def __init__(self, model_name: str = MODEL_NAME):
        self.model_name = model_name
        self._pipe = pipeline(
            "sentiment-analysis",
            model=model_name,
            tokenizer=model_name,
            use_fast=False,
        )

    def _map(self, raw_label: str, score: float) -> SentimentPrediction:
        label = _LABEL_MAP.get(raw_label, raw_label.lower())
        return SentimentPrediction(label=label, score=score)

    def predict_one(self, text: str) -> SentimentPrediction:
        out = self._pipe(text, truncation=True, max_length=128)[0]
        return self._map(out["label"], float(out["score"]))

    def predict_batch(self, texts: list[str]) -> list[SentimentPrediction]:
        outs = self._pipe(texts, truncation=True, max_length=128, batch_size=32)
        return [self._map(o["label"], float(o["score"])) for o in outs]


@lru_cache(maxsize=1)
def get_model() -> SentimentModel:
    """Model bir kez yüklenir, süreç boyunca yeniden kullanılır (FastAPI dependency)."""
    return SentimentModel()