"""
A3.3 — Etkileşim (beğeni) tahmini baseline modeli.

Görev tanımı: içerik tipi, saat/gün, hashtag sayısı, açıklama uzunluğu,
hesap trendi -> beğeni tahmini. Basit model (ridge/gradient boosting),
MAE raporla. DoD: baseline MAE, naif tahminden (son 10 gönderi
ortalaması) iyi olmalı.

Backend ile netleşen sözleşme (Prisma şeması üzerinden teyit edildi):
  - content_type: posts.type kolonu doğrudan kullanılıyor.
  - hedef değişken: post_metrics.likes (Int) — "beğeni tahmini" görev
    adıyla birebir örtüşüyor, engagement_rate DEĞİL.
  - hashtag_count / caption_length: posts.caption'dan bu modülde
    hesaplanıyor (ayrı kolon yok).
  - saat/gün: besttime.py (A3.2) ile TUTARLI olacak şekilde posted_at
    UTC kabul edilip Europe/Istanbul'a çevriliyor (REPORTING_TZ).
  - hesap trendi: account_metrics.followers zaman serisinden
    (captured_at sıralı) hesaplanan basit takipçi büyüme eğimi
    (gün başına takipçi değişimi, ilk<->son ölçüm arası).
    BASİTLEŞTİRME (bilinçli): post-zamanına özel değil, hesabın genel
    büyüme oranı — "önce basit model" ilkesine uygun ilk yaklaşım.
    Sonraki iterasyonda post_time'a en yakın iki ölçüm arası anlık
    eğime geçilebilir; bu, ileride ayrı bir görev olarak not edilmeli.

Naif karşılaştırma (DoD): her hesap için, o postan ÖNCEKİ en fazla 10
gönderinin likes ortalaması — kronolojik, leakage yok (shift(1) ile
sadece geçmiş veri kullanılıyor). İlk gönderinin geçmişi olmadığından
o satırlar hem model hem naif değerlendirmeden hariç tutuluyor (adil
karşılaştırma için).

Train/test ayrımı: leakage'ı önlemek için KRONOLOJİK — her hesabın
gönderileri zaman sırasına göre ilk %80 train, son %20 test (rastgele
split kullanılmıyor, çünkü gelecekteki bir postu geçmişi tahmin etmek
için kullanmak gerçek kullanım senaryosunu yansıtmaz).
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import timezone
from zoneinfo import ZoneInfo

import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.linear_model import Ridge
from sklearn.metrics import mean_absolute_error
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

from .db import _get_pool

REPORTING_TZ = ZoneInfo("Europe/Istanbul")  # besttime.py (A3.2) ile tutarlı
HASHTAG_RE = re.compile(r"#\w+", re.UNICODE)
NAIVE_WINDOW = 10
TRAIN_RATIO = 0.8

FEATURE_COLUMNS_NUMERIC = ["hour", "day_of_week", "hashtag_count", "caption_length", "account_growth_rate"]
FEATURE_COLUMNS_CATEGORICAL = ["content_type"]
TARGET_COLUMN = "likes"


@dataclass
class BaselineReport:
    model_type: str
    mae: float
    naive_mae: float
    beats_naive: bool
    n_train: int
    n_test: int


@dataclass
class AccountBaselineReport:
    """Global (havuzlanmış) modelin, tek bir hesabın test kesitindeki performansı.
    Model TÜM hesaplardan öğrenilir — bu sadece o hesaba özel DEĞERLENDİRME kesitidir."""

    account_id: str
    model_type: str
    mae: float
    naive_mae: float
    beats_naive: bool
    n_test: int


# ---------- Veri çekme ----------

def fetch_post_rows() -> pd.DataFrame:
    """posts + post_metrics tablolarından, tüm hesaplardan eğitim verisi çeker."""
    pool = _get_pool()
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT p.account_id, p.type, p.caption, p.posted_at, pm.likes
                FROM posts p
                JOIN post_metrics pm ON pm.post_id = p.id
                WHERE p.posted_at IS NOT NULL
                ORDER BY p.account_id, p.posted_at ASC
                """
            )
            rows = cur.fetchall()
    return pd.DataFrame(rows, columns=["account_id", "type", "caption", "posted_at", "likes"])


def fetch_account_growth() -> dict[str, float]:
    """
    Her hesap için basit takipçi büyüme eğimi: (son ölçüm - ilk ölçüm) / geçen gün.
    Tek ölçüm veya 0 gün fark varsa 0.0 döner.
    """
    pool = _get_pool()
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT account_id, followers, captured_at
                FROM account_metrics
                ORDER BY account_id, captured_at ASC
                """
            )
            rows = cur.fetchall()

    by_account: dict[str, list[tuple]] = {}
    for account_id, followers, captured_at in rows:
        by_account.setdefault(account_id, []).append((captured_at, followers))

    growth: dict[str, float] = {}
    for account_id, points in by_account.items():
        if len(points) < 2:
            growth[account_id] = 0.0
            continue
        first_ts, first_followers = points[0]
        last_ts, last_followers = points[-1]
        days = (last_ts - first_ts).total_seconds() / 86400.0
        growth[account_id] = (last_followers - first_followers) / days if days > 0 else 0.0

    return growth


# ---------- Özellik mühendisliği ----------

def _to_reporting_tz(dt):
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(REPORTING_TZ)


def build_feature_dataframe(post_df: pd.DataFrame, account_growth: dict[str, float]) -> pd.DataFrame:
    df = post_df.copy()
    local_dt = df["posted_at"].apply(_to_reporting_tz)

    df["hour"] = local_dt.apply(lambda d: d.hour)
    df["day_of_week"] = local_dt.apply(lambda d: d.isoweekday())  # ISO: 1=Pazartesi
    df["caption"] = df["caption"].fillna("")
    df["hashtag_count"] = df["caption"].apply(lambda t: len(HASHTAG_RE.findall(t)))
    df["caption_length"] = df["caption"].apply(len)
    df["content_type"] = df["type"].fillna("unknown")
    df["account_growth_rate"] = df["account_id"].map(account_growth).fillna(0.0)

    return df


# ---------- Naif taban çizgisi ----------

def add_naive_predictions(df: pd.DataFrame) -> pd.DataFrame:
    """Hesap başına, önceki en fazla 10 gönderinin likes ortalamasını ekler (leakage yok)."""
    df = df.sort_values(["account_id", "posted_at"]).reset_index(drop=True)
    df["naive_pred"] = (
        df.groupby("account_id")["likes"]
        .apply(lambda s: s.shift(1).rolling(window=NAIVE_WINDOW, min_periods=1).mean())
        .reset_index(level=0, drop=True)
    )
    return df


# ---------- Train/test ayrımı (kronolojik, hesap başına) ----------

def chronological_split(df: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame]:
    df = df.sort_values(["account_id", "posted_at"]).reset_index(drop=True)
    train_idx, test_idx = [], []
    for _, group in df.groupby("account_id"):
        cut = max(1, int(len(group) * TRAIN_RATIO))
        train_idx.extend(group.index[:cut].tolist())
        test_idx.extend(group.index[cut:].tolist())
    return df.loc[train_idx], df.loc[test_idx]


# ---------- Model eğitimi + değerlendirme ----------

def _build_pipeline(estimator) -> Pipeline:
    preprocessor = ColumnTransformer(
        transformers=[
            ("num", StandardScaler(), FEATURE_COLUMNS_NUMERIC),
            ("cat", OneHotEncoder(handle_unknown="ignore"), FEATURE_COLUMNS_CATEGORICAL),
        ]
    )
    return Pipeline(steps=[("preprocess", preprocessor), ("model", estimator)])


def _fit_and_score(df: pd.DataFrame, model_type: str) -> tuple[BaselineReport, Pipeline, pd.DataFrame]:
    """Ortak eğitim/değerlendirme mantığı. Rapor + fit edilmiş pipeline + tahminli
    test seti (model_pred kolonu eklenmiş) döner — ikincisi ve üçüncüsü serving
    (likes_model.py) tarafında, model_type: "ridge" | "gradient_boosting" """
    df = add_naive_predictions(df)
    # İlk gönderinin naif geçmişi yok -> hem model hem naif için adil olsun diye hariç tut.
    evaluable = df.dropna(subset=["naive_pred"]).copy()

    train_df, test_df = chronological_split(evaluable)
    if len(test_df) == 0:
        raise ValueError(
            "Test seti boş — yeterli veri yok. Daha fazla gönderi/hesap toplanmadan "
            "baseline değerlendirilemez."
        )

    X_train = train_df[FEATURE_COLUMNS_NUMERIC + FEATURE_COLUMNS_CATEGORICAL]
    y_train = train_df[TARGET_COLUMN]
    X_test = test_df[FEATURE_COLUMNS_NUMERIC + FEATURE_COLUMNS_CATEGORICAL]
    y_test = test_df[TARGET_COLUMN]

    if model_type == "ridge":
        estimator = Ridge(alpha=1.0, random_state=42)
    elif model_type == "gradient_boosting":
        estimator = GradientBoostingRegressor(random_state=42)
    else:
        raise ValueError(f"Bilinmeyen model_type: {model_type}")

    pipeline = _build_pipeline(estimator)
    pipeline.fit(X_train, y_train)
    predictions = pipeline.predict(X_test)

    mae = mean_absolute_error(y_test, predictions)
    naive_mae = mean_absolute_error(y_test, test_df["naive_pred"])

    report = BaselineReport(
        model_type=model_type,
        mae=float(mae),
        naive_mae=float(naive_mae),
        beats_naive=mae < naive_mae,
        n_train=len(train_df),
        n_test=len(test_df),
    )

    test_df = test_df.copy()
    test_df["model_pred"] = predictions

    return report, pipeline, test_df


def train_and_evaluate(df: pd.DataFrame, model_type: str = "ridge") -> BaselineReport:
    """Geriye dönük uyumluluk için — notebook (04_ikes_baseline_test.ipynb) bunu
    kullanıyor. Sadece raporu döner, pipeline/tahminleri döndürmez.
    Serving/entegrasyon için train_evaluate_and_score() kullanılmalı."""
    report, _pipeline, _test_df = _fit_and_score(df, model_type)
    return report


def train_evaluate_and_score(df: pd.DataFrame, model_type: str = "ridge") -> tuple[BaselineReport, Pipeline, pd.DataFrame]:
    """Serving amaçlı: rapor + fit edilmiş global pipeline + hesap bazlı kırılım
    çıkarmak için tahminli (model_pred kolonlu) test seti döner. Bkz. likes_model.py."""
    return _fit_and_score(df, model_type)


def per_account_reports(test_df_with_preds: pd.DataFrame, model_type: str) -> list[AccountBaselineReport]:
    """Global modelin test kesitini hesap bazında kırar — her hesap için o hesabın
    KENDİ postlarında MAE ve naif MAE'yi ayrı ayrı raporlar. Model tek (global/pooled)
    kalır; kırılan sadece değerlendirmedir."""
    reports = []
    for account_id, group in test_df_with_preds.groupby("account_id"):
        mae = mean_absolute_error(group[TARGET_COLUMN], group["model_pred"])
        naive_mae = mean_absolute_error(group[TARGET_COLUMN], group["naive_pred"])
        reports.append(
            AccountBaselineReport(
                account_id=account_id,
                model_type=model_type,
                mae=float(mae),
                naive_mae=float(naive_mae),
                beats_naive=mae < naive_mae,
                n_test=len(group),
            )
        )
    return reports


def run_baseline_comparison() -> list[BaselineReport]:
    """Ridge ve GradientBoosting'i eğitip ikisinin de raporunu döner."""
    post_df = fetch_post_rows()
    account_growth = fetch_account_growth()
    feature_df = build_feature_dataframe(post_df, account_growth)

    return [train_and_evaluate(feature_df, model_type=mt) for mt in ("ridge", "gradient_boosting")]


if __name__ == "__main__":
    from .db import init_pool, close_pool

    init_pool()
    try:
        for report in run_baseline_comparison():
            status = "GEÇTİ ✅" if report.beats_naive else "GEÇEMEDİ ❌"
            print(
                f"[{report.model_type}] MAE={report.mae:.2f} | "
                f"naive_MAE={report.naive_mae:.2f} | "
                f"n_train={report.n_train} n_test={report.n_test} | DoD: {status}"
            )
    finally:
        close_pool()