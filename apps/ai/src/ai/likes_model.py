"""
A3.3 — Etkileşim (beğeni) tahmini baseline modelinin serving için cache'lenmesi.

sentiment_model.py / topic_model.py ile AYNI singleton-cache deseni: model,
servis ayağa kalkarken (lifespan) bir kez eğitilir; her /internal/analyze-account
isteğinde YENİDEN eğitilmez — sadece cache'lenmiş global pipeline'ın o hesaba
ait test kesitindeki (önceden hesaplanmış) sonucu okunur.

Neden global (havuzlanmış) model, hesap başına ayrı model DEĞİL:
  - Tek hesabın postu genelde ridge/GBM için yetersiz.
  - account_id feature olsaydı yeni/az veri olan hesaplarda cold-start sorunu
    olurdu. Bunun yerine account_growth_rate feature olarak kullanılıyor.
  - Hesap bazlılık DEĞERLENDİRME katmanında (bkz. likes_baseline.per_account_reports).

Yeniden eğitim tetikleyicileri: servis başlangıcı (lifespan) VEYA
POST /internal/retrain-likes-baseline — HER predict-likes çağrısında DEĞİL.

predict_likes(): canlı tahmin. "Bu postu Cuma 15:00'te paylaşsam kaç beğeni
alır?" sorusuna cevap. Modeli YENİDEN EĞİTMEZ — zaten cache'lenmiş pipeline'a
TEK satırlık bir soru sorar. hashtag_count ve caption_length, kullanıcının
girdiği HAM caption metninden burada otomatik çıkarılıyor (kullanıcı bu iki
teknik alanı hiç görmüyor/girmiyor).
"""

from __future__ import annotations

import logging

import pandas as pd

from .db import _get_pool
from .likes_baseline import (
    AccountBaselineReport,
    BaselineReport,
    HASHTAG_RE,
    NAIVE_WINDOW,
    build_feature_dataframe,
    fetch_account_growth,
    fetch_post_rows,
    per_account_reports,
    train_evaluate_and_score,
)

logger = logging.getLogger(__name__)

# Notebook denemesinin sonucuna göre karar verildi: küçük/orta veri
# boyutunda Ridge daha güvenilir.
MODEL_TYPE = "ridge"
MODEL_VERSION = "likes-baseline-ridge-v1"


class LikesModelNotReady(RuntimeError):
    """Model henüz hiç eğitilmedi (train_likes_model() çağrılmamış) ya da
    son eğitim denemesinde yeterli veri yoktu."""


_state: dict = {
    "pipeline": None,
    "global_report": None,
    "account_reports": None,  # dict[account_id, AccountBaselineReport]
}


def train_likes_model() -> BaselineReport | None:
    """Global pooled modeli DB'deki TÜM hesap verisiyle eğitir ve cache'ler.
    Yeterli veri yoksa (test seti boş) servis çökmesin diye None döner ve
    cache'i temizler.

    Atomik güncelleme: yeni state tamamen hazırlanmadan _state'e YAZILMAZ —
    Python'da tek bir isim bağlamanın (name binding) GIL altında atomik
    olması, okuyan tarafın hiçbir zaman yarım güncellenmiş bir kombinasyon
    görmemesini garantiler."""
    global _state

    post_df = fetch_post_rows()
    account_growth = fetch_account_growth()
    feature_df = build_feature_dataframe(post_df, account_growth)

    try:
        report, pipeline, test_df = train_evaluate_and_score(feature_df, model_type=MODEL_TYPE)
    except ValueError as e:
        logger.warning("Likes baseline modeli eğitilemedi (yetersiz veri): %s", e)
        _state = {"pipeline": None, "global_report": None, "account_reports": None}
        return None

    new_state = {
        "pipeline": pipeline,
        "global_report": report,
        "account_reports": {
            r.account_id: r for r in per_account_reports(test_df, model_type=MODEL_TYPE)
        },
    }
    _state = new_state  # tek atomik swap

    logger.info(
        "Likes baseline modeli eğitildi: [%s] MAE=%.2f naive_MAE=%.2f n_train=%d n_test=%d",
        report.model_type, report.mae, report.naive_mae, report.n_train, report.n_test,
    )
    return report


def get_account_likes_report(account_id: str) -> AccountBaselineReport | None:
    """Bu hesap için, global modelden türetilmiş, hesaba özgü MAE raporunu döner.

    Raises:
        LikesModelNotReady: train_likes_model() hiç çağrılmadıysa ya da son
            denemede yeterli veri yoktuysa.
    """
    if _state["account_reports"] is None:
        raise LikesModelNotReady("Likes baseline modeli henüz eğitilmedi / yeterli veri yok.")
    return _state["account_reports"].get(account_id)


def get_global_report() -> BaselineReport | None:
    """docs/model-report.md (A4.1) ve /internal/retrain-likes-baseline yanıtı için."""
    return _state["global_report"]


# ---------- canlı tahmin ----------

def _fetch_account_recent_avg_likes(account_id: str, window: int = NAIVE_WINDOW) -> float:
    """
    Hesabın EN SON (en fazla `window` adet) postunun beğeni ortalaması —
    likes_baseline.py'daki add_naive_predictions()'ın YAPTIĞI hesaplamanın
    "şu an" (canlı tahmin anındaki) karşılığı. Hesabın hiç postu yoksa 0.0
    döner (account_growth_rate'in aynı durumda 0.0'a düşmesiyle tutarlı).
    """
    pool = _get_pool()
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT pm.likes
                FROM posts p
                JOIN post_metrics pm ON pm.post_id = p.id
                WHERE p.account_id = %s AND p.posted_at IS NOT NULL
                ORDER BY p.posted_at DESC
                LIMIT %s
                """,
                (account_id, window),
            )
            rows = cur.fetchall()

    if not rows:
        return 0.0
    likes_values = [r[0] for r in rows]
    return sum(likes_values) / len(likes_values)


def predict_likes(
    account_id: str,
    hour: int,
    day_of_week: int,
    caption: str,
    content_type: str,
) -> float:
    """
    Canlı beğeni tahmini. Kullanıcının girdiği HAM caption metninden
    hashtag_count ve caption_length BURADA (Python'da, likes_baseline.py'daki
    EĞİTİMDE kullanılan AYNI HASHTAG_RE regex'iyle) otomatik hesaplanıyor —
    kullanıcı bu iki teknik alanı hiç görmüyor/girmiyor, sadece doğal
    metnini yazıyor. Eğitim ve tahmin AYNI regex'i kullandığı için (import
    edilen sabit, kopyalanmış bir regex değil), iki taraf arasında sessiz
    bir tutarsızlık riski yok.

    account_growth_rate ve account_recent_avg_likes, hesabın DB'deki
    geçmişinden otomatik çekiliyor — kullanıcı bunları da hiç görmüyor.

    Modeli hiç YENİDEN EĞİTMEZ — sadece var olan pipeline.predict() çağrısı.

    Raises:
        LikesModelNotReady: pipeline henüz hiç eğitilmediyse / yeterli
            veri yoksa.
    """
    if _state["pipeline"] is None:
        raise LikesModelNotReady(
            "Likes baseline modeli henüz eğitilmedi / yeterli veri yok — canlı tahmin yapılamıyor."
        )

    hashtag_count = len(HASHTAG_RE.findall(caption))
    caption_length = len(caption)

    account_growth_rate = fetch_account_growth().get(account_id, 0.0)
    account_recent_avg_likes = _fetch_account_recent_avg_likes(account_id)

    # ÖNEMLİ: sütun adları, likes_baseline.py'daki FEATURE_COLUMNS_NUMERIC +
    # FEATURE_COLUMNS_CATEGORICAL ile BİREBİR uyumlu olmalı.
    input_row = pd.DataFrame([{
        "hour": hour,
        "day_of_week": day_of_week,
        "hashtag_count": hashtag_count,
        "caption_length": caption_length,
        "account_growth_rate": account_growth_rate,
        "account_recent_avg_likes": account_recent_avg_likes,
        "content_type": content_type,
    }])

    raw_prediction = _state["pipeline"].predict(input_row)[0]

    # Negatif beğeni fiziksel olarak anlamsız — Ridge doğrusal olduğu için
    # teorik olarak negatif üretebilir, 0'ın altına düşmesin diye kırpıyoruz.
    return max(0.0, float(raw_prediction))