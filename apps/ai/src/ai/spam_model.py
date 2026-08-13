"""
A3.4 — Spam/bot tespiti v1: kural tabanlıdan öğrenmeli modele geçiş.

spam_filter.py (A2.4) DEĞİŞTİRİLMEDİ — RuleBasedSpamFilter'ın regex kuralları
burada ATILMIYOR, aksine FEATURE olarak kullanılıyor (precision >= 0.90'ı zaten
sağladıkları için sinyal değerleri var). Bu dosya üç feature grubunu birleştirip
üstüne öğrenmeli bir sınıflandırıcı (LogisticRegression) koyuyor:

  1. Kural çıktıları (spam_filter.py'daki regex'lerden, binary):
     has_follower_pattern, has_link, has_contact_pattern, has_excessive_repetition

  2. Davranışsal özellikler (comments.author_hash + commented_at + post_id
     üzerinden, YORUMU YAZAN TARAFIN geçmişinden):
     author_comment_count, author_distinct_posts, author_distinct_accounts,
     author_min_interval_seconds, author_duplicate_text_ratio
     NOT: Comment.authorHash HMAC ile pseudonymize edilmiş (bkz. Prisma şeması,
     KVKK/veri-minimizasyonu gereği) — gerçek kullanıcı kimliği DEĞİL, sadece
     "bu mu o mu" ayrımını yapan tutarlı bir işaret. Feature'lar bunun ÜZERİNDEN
     hesaplanıyor, kimliğe değil davranışa bakılıyor.

  3. Metin istatistikleri (kural regex'lerinin yakalamadığı ek sinyal):
     text_length, digit_ratio, uppercase_ratio, exclamation_count, emoji_count

BİLİNEN SINIRLAMA (dürüstçe not edilmeli — model raporunda tekrarlanacak):
Şu anki mock_comments.json üreteci, davranışsal özellikleri (yorum hacmi,
hesap yayılımı, zamanlama, tekrar) spam etiketiyle KORELASYONLU üretmiyor
(bkz. proje notları) — yani bu veriyle eğitilen modelde davranışsal
feature'ların katsayıları anlamlı bir ağırlık ÖĞRENEMEZ, kazanım büyük
ölçüde metin tabanlı feature'lardan gelir. Kod, gerçek/korelasyonlu veri
geldiğinde (yeni bir mock üretimi ya da gerçek Instagram verisi) davranışsal
sinyali otomatik olarak yakalayacak şekilde tasarlandı; sadece eğitim
verisinin bunu şu an içermediğini bilerek ilerliyoruz.

Train/eval ayrımı: eval_v1.jsonl'deki 400 örnek DIŞARIDA TUTULUYOR (train'e
hiç girmiyor) — precision/recall raporu bu ayrı test setinde hesaplanıyor,
mock_comments.json'daki geri kalan ~2100 satır train havuzu.
"""

from __future__ import annotations

import json
import os
import re
from dataclasses import dataclass
from datetime import datetime, timezone

import joblib
import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import precision_recall_curve
from sklearn.model_selection import StratifiedKFold
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

from .spam_filter import RuleBasedSpamFilter

MIN_PRECISION = 0.90  # A2.4/A3.4 ortak DoD hedefi

# Model dosyası nereye kaydediliyor / spam_serving.py buradan okuyor.
# Ortam değişkeniyle override edilebilir (örn. farklı repo düzeni için).
DEFAULT_MODEL_PATH = os.environ.get(
    "SPAM_MODEL_PATH", os.path.join(os.path.dirname(__file__), "models", "spam_classifier.joblib")
)
EMOJI_RE = re.compile(
    "[\U0001F300-\U0001FAFF\U00002600-\U000027BF\U0001F1E6-\U0001F1FF]", re.UNICODE
)

FEATURE_COLUMNS = [
    # kural çıktıları (spam_filter.py'dan)
    "has_follower_pattern",
    "has_link",
    "has_contact_pattern",
    "has_excessive_repetition",
    # davranışsal (authorHash bazlı)
    "author_comment_count",
    "author_distinct_posts",
    "author_distinct_accounts",
    "author_min_interval_seconds",
    "author_duplicate_text_ratio",
    # metin istatistikleri
    "text_length",
    "digit_ratio",
    "uppercase_ratio",
    "exclamation_count",
    "emoji_count",
]

# author_min_interval_seconds için: tek yorumu olan / hiç komşusu olmayan yazarlarda
# NaN oluşur — "burst yok" anlamına gelecek şekilde büyük bir sayıyla dolduruluyor
# (StandardScaler NaN'ı kabul etmiyor, 0 ile doldurmak ise tam tersi anlam verirdi:
# 0 saniye = en burst'lü davranış).
NO_BURST_SENTINEL_SECONDS = 7 * 24 * 3600  # bir hafta


# ---------- Kural + metin feature çıkarımı (tek bir yorum için, bağlamsız) ----------

def _text_features(text: str, rule_filter: RuleBasedSpamFilter) -> dict:
    # spam_filter.py'daki metodlar "private" (_ ön ekli) ama dosyayı DEĞİŞTİRMEMEK
    # için doğrudan çağrılıyor — aynı regex mantığını burada TEKRAR YAZMAK yerine.
    return {
        "has_follower_pattern": int(rule_filter._has_follower_patterns(text)),
        "has_link": int(rule_filter._has_link(text)),
        "has_contact_pattern": int(rule_filter._has_contact_or_action_call(text)),
        "has_excessive_repetition": int(rule_filter._has_excessive_repetition(text)),
        "text_length": len(text),
        "digit_ratio": (sum(c.isdigit() for c in text) / len(text)) if text else 0.0,
        "uppercase_ratio": (sum(c.isupper() for c in text) / len(text)) if text else 0.0,
        "exclamation_count": text.count("!"),
        "emoji_count": len(EMOJI_RE.findall(text)),
    }


def _normalize_for_dup_check(text: str) -> str:
    t = text.lower()
    t = re.sub(r"[^\w\s]", "", t)
    return re.sub(r"\s+", " ", t).strip()


# ---------- Davranışsal (authorHash) feature çıkarımı — corpus genelinde ----------

def build_behavioral_lookup(all_comments: pd.DataFrame) -> pd.DataFrame:
    """
    Her yorum satırı için, YAZARIN O YORUM HARİÇ diğer yorumlarından (leave-one-out)
    türetilmiş davranışsal feature'ları hesaplar. all_comments en az şu kolonları
    içermeli: id, authorHash, postId, account_id, commentedAt, text.

    Leave-one-out kullanılıyor ki bir yorumun kendi varlığı, kendi author-level
    istatistiğini şişirmesin (örn. tek yorumu olan bir yazar "author_comment_count=1"
    yerine yanlışlıkla kendi dışında 0 yorumu varmış gibi görünsün — gerçek geçmişi
    yansıtır, o anki yorumu değil).
    """
    df = all_comments.copy()
    df["_norm_text"] = df["text"].apply(_normalize_for_dup_check)
    df["_ts"] = pd.to_datetime(df["commentedAt"])

    rows = []
    for author_hash, group in df.groupby("authorHash"):
        group = group.sort_values("_ts")
        ids = group["id"].tolist()
        timestamps = group["_ts"].tolist()
        norm_texts = group["_norm_text"].tolist()
        posts = group["postId"].tolist()
        accounts = group["account_id"].tolist()

        n = len(group)
        for i in range(n):
            others_idx = [j for j in range(n) if j != i]
            other_count = len(others_idx)

            if other_count == 0:
                distinct_posts = 0
                distinct_accounts = 0
                min_interval = NO_BURST_SENTINEL_SECONDS
                dup_ratio = 0.0
            else:
                other_posts = {posts[j] for j in others_idx}
                other_accounts = {accounts[j] for j in others_idx}
                distinct_posts = len(other_posts)
                distinct_accounts = len(other_accounts)

                # bu yoruma zaman olarak en yakın DİĞER yorumla arasındaki fark
                gaps = [abs((timestamps[i] - timestamps[j]).total_seconds()) for j in others_idx]
                min_interval = min(gaps)

                same_text_count = sum(1 for j in others_idx if norm_texts[j] == norm_texts[i])
                dup_ratio = same_text_count / other_count

            rows.append(
                {
                    "id": ids[i],
                    "author_comment_count": other_count,
                    "author_distinct_posts": distinct_posts,
                    "author_distinct_accounts": distinct_accounts,
                    "author_min_interval_seconds": min_interval,
                    "author_duplicate_text_ratio": dup_ratio,
                }
            )

    return pd.DataFrame(rows).set_index("id")


# ---------- Veri yükleme / birleştirme ----------

def load_mock_comments(path: str) -> pd.DataFrame:
    with open(path, "r", encoding="utf-8") as f:
        records = json.load(f)
    df = pd.DataFrame(records)
    df["is_spam"] = df["mock_category"] == "spam"
    return df


def load_eval_set(eval_jsonl_path: str, mock_comments_path: str) -> pd.DataFrame:
    """eval_v1.jsonl (id/text/sentiment/is_spam) ile mock_comments.json'u id
    üzerinden birleştirir — davranışsal feature'lar için authorHash/postId/
    account_id/commentedAt gerekiyor, eval dosyasının kendisinde yok."""
    eval_rows = []
    with open(eval_jsonl_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                eval_rows.append(json.loads(line))
    eval_df = pd.DataFrame(eval_rows)[["id", "text", "is_spam"]]

    mock_df = load_mock_comments(mock_comments_path)
    meta_cols = mock_df[["id", "authorHash", "postId", "account_id", "commentedAt"]]

    merged = eval_df.merge(meta_cols, on="id", how="left")
    if merged["authorHash"].isna().any():
        missing = merged[merged["authorHash"].isna()]["id"].tolist()
        raise ValueError(
            f"eval_v1.jsonl'deki {len(missing)} id, mock_comments.json'da bulunamadı: {missing[:5]}..."
        )
    return merged


def build_feature_frame(comments_df: pd.DataFrame, behavioral_lookup: pd.DataFrame) -> pd.DataFrame:
    """comments_df: id, text, authorHash, postId, account_id, commentedAt, is_spam
    (is_spam olmayabilir, serving'de gerekmez). behavioral_lookup: build_behavioral_lookup()
    çıktısı — TÜM corpus'tan (train+eval birlikte, çünkü davranışsal geçmiş global) hesaplanmış olmalı."""
    rule_filter = RuleBasedSpamFilter()
    text_feats = comments_df["text"].apply(lambda t: _text_features(t, rule_filter))
    text_feats_df = pd.DataFrame(text_feats.tolist(), index=comments_df.index)

    joined = comments_df[["id"]].join(text_feats_df)
    joined = joined.merge(
        behavioral_lookup.reset_index(), on="id", how="left"
    )
    return joined


# ---------- Öğrenmeli sınıflandırıcı ----------

@dataclass
class LearnedSpamReport:
    threshold: float
    precision: float
    recall: float
    f1: float
    n_eval: int
    fp_count: int
    rule_precision: float
    rule_recall: float
    rule_f1: float


def _build_pipeline() -> Pipeline:
    return Pipeline(
        steps=[
            ("scale", StandardScaler()),
            (
                "clf",
                LogisticRegression(
                    class_weight="balanced", max_iter=1000, random_state=42
                ),
            ),
        ]
    )


def tune_threshold_for_precision(
    y_true: np.ndarray, y_proba: np.ndarray, min_precision: float = MIN_PRECISION
) -> float:
    """precision >= min_precision şartını sağlayan EN DÜŞÜK threshold'u seçer
    (= recall'u maksimize eder). Şart hiçbir threshold'da sağlanamıyorsa,
    ulaşılabilen en yüksek precision'ı veren threshold'a düşer (uyarı basılır)."""
    precisions, recalls, thresholds = precision_recall_curve(y_true, y_proba)
    # precision_recall_curve, thresholds'tan bir fazla precision/recall döner
    # (son nokta threshold'suz "hepsini pozitif say" durumu) — hizalamak için kırp.
    precisions, recalls = precisions[:-1], recalls[:-1]

    eligible = [(t, p, r) for t, p, r in zip(thresholds, precisions, recalls) if p >= min_precision]
    if eligible:
        eligible.sort(key=lambda x: x[2], reverse=True)  # en yüksek recall
        return float(eligible[0][0])

    print(
        f"⚠️  UYARI: precision >= {min_precision} hiçbir threshold'da sağlanamadı. "
        "En yüksek precision'ı veren threshold kullanılıyor."
    )
    best_idx = int(np.argmax(precisions))
    return float(thresholds[best_idx])


class LearnedSpamFilter:
    """A3.4 öğrenmeli spam sınıflandırıcı. RuleBasedSpamFilter (A2.4) ile AYNI
    predict(text) arayüzünü SUNMAZ — çünkü davranışsal feature'lar tek bir metinden
    çıkarılamaz, comments tablosundaki bağlama (authorHash geçmişi) ihtiyaç var.
    Bunun yerine predict_frame(feature_df) kullanılıyor."""

    def __init__(self):
        self.pipeline = _build_pipeline()
        self.threshold: float | None = None

    def fit(self, X: pd.DataFrame, y: pd.Series, threshold: float) -> None:
        self.pipeline.fit(X[FEATURE_COLUMNS], y)
        self.threshold = threshold

    def predict_proba(self, X: pd.DataFrame) -> np.ndarray:
        return self.pipeline.predict_proba(X[FEATURE_COLUMNS])[:, 1]

    def predict(self, X: pd.DataFrame) -> np.ndarray:
        if self.threshold is None:
            raise RuntimeError("Model henüz fit edilmedi / threshold ayarlanmadı.")
        return self.predict_proba(X) >= self.threshold


def save_model(model: LearnedSpamFilter, report: LearnedSpamReport, path: str = DEFAULT_MODEL_PATH) -> str:
    """Eğitilmiş modeli + threshold'u + rapor metadata'sını diske yazar.
    spam_serving.py, canlı istekleri bununla skorlar — DB'den YENİDEN EĞİTMEZ
    (gerçek comments tablosunda is_spam etiketi yok, eğitim etiketli mock/eval
    veriyle offline yapılıyor, bkz. dosya başındaki not)."""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    artifact = {
        "pipeline": model.pipeline,
        "threshold": model.threshold,
        "feature_columns": FEATURE_COLUMNS,
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "report": report,
        "model_version": "spam-learned-logreg-v1",
    }
    joblib.dump(artifact, path)
    return path


def load_model(path: str = DEFAULT_MODEL_PATH) -> tuple[LearnedSpamFilter, dict]:
    """save_model()'in yazdığı artifact'ı geri yükler. spam_serving.py bunu kullanır."""
    artifact = joblib.load(path)
    model = LearnedSpamFilter()
    model.pipeline = artifact["pipeline"]
    model.threshold = artifact["threshold"]
    return model, artifact


def train_and_evaluate(
    mock_comments_path: str, eval_jsonl_path: str
) -> tuple[LearnedSpamFilter, LearnedSpamReport]:
    """
    - eval_v1.jsonl'deki 400 id TRAIN'E HİÇ GİRMEZ.
    - Davranışsal feature'lar TÜM corpus (mock_comments.json, 2500 satır) üzerinden
      hesaplanır — yazarın geçmişi gerçek hayatta da train/test sınırını bilmez,
      DB'deki tüm geçmişinden hesaplanır. Sızıntı riski: bir yazarın train VE eval'de
      ortak yorumu varsa davranışsal istatistikleri ikisi arasında sızabilir — bu
      mock veride davranış zaten spam'le korelasyonsuz olduğu için ETKİSİZ, ama
      gerçek veriyle çalışırken bu noktayı tekrar değerlendirmek gerekir (bkz. dosya
      başındaki not).
    - Threshold, TRAIN üzerinde 5-fold stratified cross-validation ile seçilir
      (eval set'e hiç bakılmadan) — sonra eval set'te TEK SEFER ölçülür.
    """
    all_comments = load_mock_comments(mock_comments_path)
    eval_df = load_eval_set(eval_jsonl_path, mock_comments_path)
    eval_ids = set(eval_df["id"])

    train_df = all_comments[~all_comments["id"].isin(eval_ids)].reset_index(drop=True)

    behavioral_lookup = build_behavioral_lookup(all_comments)  # tüm corpus

    train_features = build_feature_frame(train_df, behavioral_lookup)
    train_features = train_features.merge(train_df[["id", "is_spam"]], on="id")

    eval_features = build_feature_frame(eval_df, behavioral_lookup)
    eval_features = eval_features.merge(eval_df[["id", "is_spam"]], on="id")

    X_train = train_features[FEATURE_COLUMNS]
    y_train = train_features["is_spam"].astype(int)

    # --- Threshold: train üzerinde cross-validated out-of-fold olasılıklarla ---
    skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    oof_proba = np.zeros(len(X_train))
    for train_idx, val_idx in skf.split(X_train, y_train):
        fold_pipeline = _build_pipeline()
        fold_pipeline.fit(X_train.iloc[train_idx], y_train.iloc[train_idx])
        oof_proba[val_idx] = fold_pipeline.predict_proba(X_train.iloc[val_idx])[:, 1]

    threshold = tune_threshold_for_precision(y_train.values, oof_proba, MIN_PRECISION)

    # --- Final model: TÜM train ile fit, threshold cross-val'den geliyor ---
    model = LearnedSpamFilter()
    model.fit(X_train, y_train, threshold)

    # --- Tek seferlik eval ---
    X_eval = eval_features[FEATURE_COLUMNS]
    y_eval = eval_features["is_spam"].astype(int).values
    y_pred = model.predict(eval_features)

    tp = int(np.sum((y_pred == 1) & (y_eval == 1)))
    fp = int(np.sum((y_pred == 1) & (y_eval == 0)))
    fn = int(np.sum((y_pred == 0) & (y_eval == 1)))

    precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
    f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0.0

    # --- Aynı eval set'te kural tabanlı (A2.4) karşılaştırması ---
    rule_filter = RuleBasedSpamFilter()
    rule_pred = eval_df["text"].apply(rule_filter.predict).values
    rtp = int(np.sum((rule_pred == True) & (y_eval == 1)))  # noqa: E712
    rfp = int(np.sum((rule_pred == True) & (y_eval == 0)))  # noqa: E712
    rfn = int(np.sum((rule_pred == False) & (y_eval == 1)))  # noqa: E712
    rule_precision = rtp / (rtp + rfp) if (rtp + rfp) > 0 else 0.0
    rule_recall = rtp / (rtp + rfn) if (rtp + rfn) > 0 else 0.0
    rule_f1 = (
        2 * rule_precision * rule_recall / (rule_precision + rule_recall)
        if (rule_precision + rule_recall) > 0
        else 0.0
    )

    report = LearnedSpamReport(
        threshold=threshold,
        precision=precision,
        recall=recall,
        f1=f1,
        n_eval=len(eval_df),
        fp_count=fp,
        rule_precision=rule_precision,
        rule_recall=rule_recall,
        rule_f1=rule_f1,
    )
    return model, report


if __name__ == "__main__":
    # uv run python -m ai.spam_model
    _model, _report = train_and_evaluate(
        mock_comments_path="mock_comments.json", eval_jsonl_path="data/eval_v1.jsonl"
    )
    print("=" * 55)
    print(f"ÖĞRENMELİ MODEL  (threshold={_report.threshold:.3f})")
    print(f"  precision={_report.precision:.4f}  recall={_report.recall:.4f}  f1={_report.f1:.4f}")
    print(f"KURAL TABANLI (A2.4, aynı eval set)")
    print(f"  precision={_report.rule_precision:.4f}  recall={_report.rule_recall:.4f}  f1={_report.rule_f1:.4f}")
    print("=" * 55)
    if _report.precision >= MIN_PRECISION and _report.recall > _report.rule_recall:
        print("✅ DoD Başarılı: precision korunarak recall arttı.")
    else:
        print("❌ DoD Başarısız — precision/recall hedefini kontrol et.")

    saved_path = save_model(_model, _report)
    print(f"Model kaydedildi: {saved_path}")
    print("(spam_serving.py servis başlarken bu dosyayı yükleyip cache'leyecek.)")