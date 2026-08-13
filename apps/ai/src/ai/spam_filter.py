"""
A2.4 Spam Filtresi v0: Kural tabanlı spam tespit sınıfı.

Öncelik: High Precision (>= 0.90 DoD hedefi), False Positive oranını
en aza indirmek.
"""

from __future__ import annotations

import json
import re
from typing import Dict, List, Tuple

from .text_cleaner import turkce_lower


class RuleBasedSpamFilter:
    """A2.4 Spam Filtresi v0: Kural tabanlı spam tespit sınıfı."""

    def __init__(self):
        # 1. Takipçi, beğeni, hesap satışı ve bot hizmet kalıpları
        self.follower_spam_keywords = [
            r"\btakipç[ii]\b",
            r"\btakipci\b",  # mock veri üretimindeki ç->c dönüşümü (distort())
            r"\bbeg?en[ii]\b",
            r"izlenme (sat[ıi]n al|paketi|hizmeti)",  # bağlamsız "izlenme" yanlış pozitif üretir
            r"(ucuz|sahte|h[ıi]zl[ıi]) izlenme",
            r"ucuz takipçi",
            r"şifresiz takipçi",
            r"sosyal medya hizmet",
            r"jet takipçi",
            r"garantili takipçi",
            r"oto beğeni",
            r"hesap sat(ıl|ış|ıyor|ilir)",  # satılır/satışı/satıyor çekim varyasyonları
            r"hesap alım",
            r"organik takipçi",
            r"paketleri incele",
            r"kaydetme satın al",
            r"geri takip yap[ıi]l?[ıi]r",
            r"takip et(mek|meyi)? (kazan|unutma)",
            r"kripto yat[ıi]r[ıi]m f[ıi]rsat[ıi]",
            r"bio link",
            r"para kazanmak isteyenler",
            r"dm['’]?den yazın",
        ]

        # 2. URL ve Link Tespiti
        self.url_pattern = re.compile(
            r"https?://\S+|www\.\S+|\b[a-zA-Z0-9.-]+\.(com|net|org|xyz|tk|site|online|store|info|co)\b",
            re.IGNORECASE,
        )

        # 3. İletişim / Yönlendirme / DM / Telefon Kalıpları
        self.contact_pattern = re.compile(
            r"(\+?90)?\s*5\d{2}\s*\d{3}\s*\d{2}\s*\d{2}|dm['’]?den|biyodaki link|profildeki link|whatsapp|iletişime geç",
            re.IGNORECASE,
        )

    def _has_follower_patterns(self, text: str) -> bool:
        """Takipçi / Beğeni satışı terimlerini kontrol eder."""
        text_lower = turkce_lower(text)
        return any(re.search(kw, text_lower) for kw in self.follower_spam_keywords)

    def _has_link(self, text: str) -> bool:
        """Açık link veya alan adı içerip içermediğini kontrol eder."""
        return bool(self.url_pattern.search(text))

    def _has_contact_or_action_call(self, text: str) -> bool:
        """DM'e çağırma, iletişim veya profildeki linke yönlendirme kontrolü."""
        return bool(self.contact_pattern.search(text))

    def _has_excessive_repetition(self, text: str) -> bool:
        """Aşırı harf/sembol veya kelime tekrarı kontrolü."""
        char_rep = bool(re.search(r"(.)\1{4,}", text))
        word_rep = bool(re.search(r"\b(\w+)\s+\1\s+\1\b", text, re.IGNORECASE))
        return char_rep or word_rep

    def predict(self, text: str) -> bool:
        """Metnin spam olup olmadığını döndürür (True: Spam, False: Normal)."""
        if self._has_follower_patterns(text):
            return True
        if self._has_link(text) and (
            self._has_contact_or_action_call(text) or self._has_excessive_repetition(text)
        ):
            return True
        if self._has_contact_or_action_call(text) and self._has_excessive_repetition(text):
            return True
        return False


def evaluate_on_jsonl(
    jsonl_path: str, text_key: str = "text", label_key: str = "is_spam"
) -> Dict[str, float]:
    """
    Eval set (data/eval_v1.jsonl) dosyasını okur, filtrenin tahminlerini
    dosyadaki gerçek is_spam etiketleriyle karşılaştırır, Precision/Recall/F1
    hesaplar.
    """
    filter_model = RuleBasedSpamFilter()

    tp, fp, fn, tn = 0, 0, 0, 0
    fp_samples: List[Tuple[str, str]] = []

    with open(jsonl_path, "r", encoding="utf-8") as f:
        for line_num, line in enumerate(f, 1):
            if not line.strip():
                continue
            data = json.loads(line)

            text = data[text_key]
            actual_is_spam = bool(data[label_key])
            predicted_is_spam = filter_model.predict(text)

            if predicted_is_spam and actual_is_spam:
                tp += 1
            elif predicted_is_spam and not actual_is_spam:
                fp += 1
                fp_samples.append((text, f"Satır {line_num}"))
            elif not predicted_is_spam and actual_is_spam:
                fn += 1
            else:
                tn += 1

    precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
    f1 = (
        2 * (precision * recall) / (precision + recall)
        if (precision + recall) > 0
        else 0.0
    )

    print("=" * 50)
    print(f"EVAL SET SONUÇLARI ({jsonl_path})")
    print("=" * 50)
    print(f"Toplam Veri     : {tp + fp + fn + tn}")
    print(f"False Positive  : {fp}  <-- (Yanlışlıkla spam denen normal yorumlar)")
    print(f"PRECISION       : {precision:.4f} (Hedef DoD: >= 0.90)")
    print(f"RECALL          : {recall:.4f}")
    print(f"F1-SCORE        : {f1:.4f}")
    print("=" * 50)

    if precision >= 0.90:
        print("✅ DoD Başarılı: Precision >= 0.90 şartı sağlandı!")
    else:
        print("❌ DoD Başarısız: Precision 0.90 altında. False Positive örnekleri:")
        for sample, loc in fp_samples:
            print(f" - [{loc}] Metin: {sample}")

    return {"precision": precision, "recall": recall, "f1": f1, "fp_count": fp}


if __name__ == "__main__":
    # Eval set üzerinde karne çıkar:
    # uv run python -m ai.spam_filter
    evaluate_on_jsonl("data/eval_v1.jsonl")