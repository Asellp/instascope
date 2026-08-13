"""
A3.4 — Spam/bot tespitinin serving (canlı istek) katmanı.

ÖNEMLİ FARK — likes_model.py İLE AYNI PATERN DEĞİL:
likes_model.py canlı DB'deki GERÇEK etiketle (post_metrics.likes) eğitilip
cache'lenebiliyordu. Burada durum farklı: gerçek `comments` tablosunda
`is_spam` etiketi YOK (tahmin etmeye çalıştığımız şey bu). Bu yüzden model
CANLI İSTEKTE DEĞİL, offline (spam_model.py'daki train_and_evaluate, etiketli
mock/eval veriyle) eğitilip diske kaydediliyor (bkz. spam_model.save_model).
Bu dosya SADECE:
  1. Diskteki eğitilmiş modeli servis başlarken YÜKLER (yeniden eğitmez).
  2. Canlı gelen bir yorum batch'i için DB'den davranışsal feature'ları
     hesaplar (authorHash geçmişi) ve modeli çalıştırır.

Yeni etiketli veri geldiğinde (örn. gerçek Instagram verisiyle yeniden eval)
model spam_model.py ile OFFLINE yeniden eğitilip diske kaydedilir, bu dosya
sadece yeni artifact'ı okur — spam_serving.py'ın kendisi değişmez.
"""

from __future__ import annotations

import logging

import pandas as pd

from .db import _get_pool
from .spam_model import (
    DEFAULT_MODEL_PATH,
    LearnedSpamFilter,
    build_behavioral_lookup,
    build_feature_frame,
    load_model,
)

logger = logging.getLogger(__name__)

_state: dict = {"model": None, "model_version": None}


class SpamModelNotReady(RuntimeError):
    """Diskte eğitilmiş bir spam modeli artifact'ı bulunamadı
    (spam_model.py hiç çalıştırılıp kaydedilmemiş)."""


def load_spam_model(path: str = DEFAULT_MODEL_PATH) -> None:
    """Servis başlarken (lifespan) BİR KEZ çağrılır. Diskte artifact yoksa
    servis çökmesin diye None'da bırakır — spam kind'i o durumda
    /internal/analyze yanıtlarından sessizce atlanır (LikesModelNotReady
    ile aynı 'yetersiz hazırlık' mantığı)."""
    try:
        model, artifact = load_model(path)
    except FileNotFoundError:
        logger.warning(
            "Spam modeli artifact'ı bulunamadı (%s). Önce `python -m ai.spam_model` "
            "ile offline eğitip kaydetmen gerekiyor. Servis ayakta kalıyor, "
            "kind='spam' bu ayarda üretilmeyecek.",
            path,
        )
        _state["model"] = None
        _state["model_version"] = None
        return

    _state["model"] = model
    _state["model_version"] = artifact.get("model_version", "spam-learned-unknown")
    logger.info(
        "Spam modeli yüklendi: %s (eğitim tarihi: %s, threshold=%.3f)",
        _state["model_version"], artifact.get("trained_at"), model.threshold,
    )


def get_spam_model() -> tuple[LearnedSpamFilter, str]:
    if _state["model"] is None:
        raise SpamModelNotReady("Spam modeli yüklenmedi (artifact eksik ya da servis henüz başlamadı).")
    return _state["model"], _state["model_version"]


# ---------- Canlı istekte davranışsal feature çıkarımı ----------

def _fetch_author_history(comment_ids: list[str]) -> pd.DataFrame:
    """Verilen comment_id'lerin authorHash'lerini bulur, sonra AYNI yazarların
    TÜM diğer yorumlarını (hesap sınırı olmadan — bot'lar hesaplar arası
    yayılır) çeker. build_behavioral_lookup ile aynı şema: id, authorHash,
    postId, account_id, commentedAt, text."""
    pool = _get_pool()
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                WITH target_authors AS (
                    SELECT DISTINCT author_hash FROM comments WHERE id = ANY(%s)
                )
                SELECT c.id, c.author_hash AS "authorHash", c.post_id AS "postId",
                       p.account_id, c.commented_at AS "commentedAt", c.text
                FROM comments c
                JOIN posts p ON p.id = c.post_id
                WHERE c.author_hash IN (SELECT author_hash FROM target_authors)
                """,
                (comment_ids,),
            )
            rows = cur.fetchall()
            columns = [desc.name for desc in cur.description]
    return pd.DataFrame(rows, columns=columns)


def score_comments_for_spam(comment_ids: list[str]) -> dict[str, tuple[bool, float]]:
    """Verilen comment_id listesi için {comment_id: (is_spam, confidence)} döner.
    Modeli DEĞİŞTİRMEZ/eğitmez — sadece cache'lenmiş modeli DB'den o an
    çekilen davranışsal geçmişle skorlar.

    Raises:
        SpamModelNotReady: diskte eğitilmiş model artifact'ı yüklenmediyse.
    """
    model, _version = get_spam_model()  # erken hata fırlatsın, DB'ye gitmeden önce

    author_history_df = _fetch_author_history(comment_ids)
    if author_history_df.empty:
        return {}

    behavioral_lookup = build_behavioral_lookup(author_history_df)
    feature_df = build_feature_frame(author_history_df, behavioral_lookup)
    feature_df = feature_df[feature_df["id"].isin(comment_ids)].reset_index(drop=True)

    proba = model.predict_proba(feature_df)
    predictions = proba >= model.threshold

    return {
        row_id: (bool(pred), float(p))
        for row_id, pred, p in zip(feature_df["id"], predictions, proba)
    }