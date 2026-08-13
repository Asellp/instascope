"""
DoD (A2.3): F1 (macro) raporlanmalı — hedef >= 0.75; altındaysa hata
analiziyle birlikte sunulmalı.

Kullanım (apps/ai dizininden):
    uv run python scripts/evaluate_f1.py --eval-file data/eval_v1.jsonl

Eval dosyası formatı (basitleştirilmiş):
    { "id": "...", "text": "...", "sentiment": "positive"|"negative"|"neutral"|null, "is_spam": bool }

is_spam=true olan satırlar sentiment F1'e dahil edilmiyor (kılavuz 2.5 —
spam'i nötr saymak yanıltıcı olur). sentiment=null olan satırlar da atlanır.

DÜZELTME (gerçek veri bulgusu): artık on_isle(text).temiz_metin YERİNE
on_isle_sentiment(text) kullanılıyor — emoji normalizasyonu sentiment için
BİLEREK ATLANIYOR. Gerçek veriyle (real_data_pool.json) doğrulandı: emoji
normalizasyonu, emoji-ağırlıklı yorumları modelin anlayamadığı soyut kodlara
çeviriyordu, macro F1'i 0.4826'ya düşürüyordu. on_isle_sentiment ile bu
0.6922'ye çıktı (+%43). Diğer modüller (topic modelleme, spam) hâlâ eski
on_isle()'ı kullanmaya devam ediyor, bu değişiklik SADECE sentiment'i
etkiliyor.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from sklearn.metrics import classification_report, f1_score

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))
from ai.pipeline import on_isle_sentiment  # noqa: E402
from ai.sentiment_model import SentimentModel  # noqa: E402

LABELS = ["positive", "negative", "neutral"]
TARGET_F1 = 0.75


def load_eval_set(path: Path) -> list[dict]:
    rows = []
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            r = json.loads(line)
            if r.get("is_spam"):
                continue  # spam ayrı kategori, sentiment F1'e dahil edilmiyor (kılavuz 2.5)
            if r.get("sentiment") not in LABELS:
                continue
            rows.append(r)
    return rows


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--eval-file", type=Path, default=Path("data/eval_v1.jsonl"))
    args = ap.parse_args()

    rows = load_eval_set(args.eval_file)
    if not rows:
        print(f"Değerlendirilecek satır bulunamadı: {args.eval_file}")
        return

    y_true = [r["sentiment"] for r in rows]
    temiz_metinler = [on_isle_sentiment(r["text"]) for r in rows]

    model = SentimentModel()
    preds = model.predict_batch(temiz_metinler)
    y_pred = [p.label for p in preds]

    macro_f1 = f1_score(y_true, y_pred, labels=LABELS, average="macro", zero_division=0)

    print(f"Model: {model.model_name}")
    print(f"Değerlendirilen örnek sayısı: {len(rows)}")
    print(f"Macro F1: {macro_f1:.4f}  (hedef >= {TARGET_F1})")
    print(f"Sonuç: {'GEÇTİ ✅' if macro_f1 >= TARGET_F1 else 'HEDEFİN ALTINDA ❌ — hata analizi gerekli'}")
    print()
    print(classification_report(y_true, y_pred, labels=LABELS, zero_division=0))

    if macro_f1 < TARGET_F1:
        print("--- Hata analizi (yanlış sınıflananlardan örnekler) ---")
        wrong = [(r["text"], t, p) for r, t, p in zip(rows, y_true, y_pred) if t != p]
        for text, true_label, pred_label in wrong[:15]:
            print(f"  gerçek={true_label:8s} tahmin={pred_label:8s} | {text}")
        print(f"  ... toplam {len(wrong)} yanlış tahmin")


if __name__ == "__main__":
    main()