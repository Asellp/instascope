"""
A3.3 — Etkileşim (beğeni) tahmini baseline modelinin serving için cache'lenmesi.

sentiment_model.py / topic_model.py ile AYNI singleton-cache deseni: model,
servis ayağa kalkarken (lifespan) bir kez eğitilir; her /internal/analyze-account
isteğinde YENİDEN eğitilmez — sadece cache'lenmiş global pipeline'ın o hesaba
ait test kesitindeki (önceden hesaplanmış) sonucu okunur.

Neden global (havuzlanmış) model, hesap başına ayrı model DEĞİL:
  - Tek hesabın postu genelde ridge/GBM için yetersiz (bkz. notebook: 150/hesap
    örneklemde GBM naif'i geçemedi, overfit).
  - account_id feature olsaydı yeni/az veri olan hesaplarda cold-start sorunu
    olurdu. Bunun yerine account_growth_rate (hesaba özgü, sayısal, genellenebilir
    bir sinyal) feature olarak kullanılıyor.
  - Hesap bazlılık DEĞERLENDİRME katmanında: global modelin test tahminleri
    hesap hesap kırılıyor (bkz. likes_baseline.per_account_reports).

Yeniden eğitim tetikleyicileri: servis başlangıcı (lifespan) VEYA
POST /internal/retrain-likes-baseline. Her analyze-account çağrısında DEĞİL
(latency hedefi A4.4: 100 yorumluk batch < 10 sn ile çelişir + gereksiz).
"""

from __future__ import annotations

import logging

from .likes_baseline import (
    AccountBaselineReport,
    BaselineReport,
    build_feature_dataframe,
    fetch_account_growth,
    fetch_post_rows,
    per_account_reports,
    train_evaluate_and_score,
)

logger = logging.getLogger(__name__)

# Notebook denemesinin sonucuna göre karar verildi (bkz. 04_ikes_baseline_test.ipynb,
# "Sonuç ve Öneri" bölümü): küçük/orta veri boyutunda Ridge daha güvenilir.
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
    cache'i temizler — sonraki analyze-account çağrıları likes_baseline
    kind'ini atlar (besttime'daki "yetersiz veri" mantığına benzer).

    Atomik güncelleme: yeni state tamamen hazırlanmadan _state'e YAZILMAZ.
    Bu fonksiyon artık BullMQ'daki periyodik bir job'dan (retrain-likes-baseline
    ucu üzerinden) tetikleniyor — aynı anda bir /internal/analyze-account isteği
    get_account_likes_report() ile _state'i OKUYOR olabilir. Tek bir dict'i
    (pipeline/global_report/account_reports) parça parça değil, TEK atomada
    (_state = new_state) değiştirmek, okuyan tarafın hiçbir zaman yarım
    güncellenmiş (örn. yeni pipeline + eski account_reports) bir kombinasyon
    görmemesini garantiler. Python'da tek bir isim bağlamanın (name binding)
    GIL altında atomik olması bu garantiyi sağlıyor."""
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
    _state = new_state  # tek atomik swap — bkz. yukarıdaki docstring

    logger.info(
        "Likes baseline modeli eğitildi: [%s] MAE=%.2f naive_MAE=%.2f n_train=%d n_test=%d",
        report.model_type, report.mae, report.naive_mae, report.n_train, report.n_test,
    )
    return report


def get_account_likes_report(account_id: str) -> AccountBaselineReport | None:
    """Bu hesap için, global modelden türetilmiş, hesaba özgü MAE raporunu döner.
    Hesabın test kesitinde postu yoksa (örn. çok yeni/az postlu hesap) None döner
    — bu bir hata değil, sadece o hesap için henüz değerlendirilecek veri yok demektir.

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