"""
A2.1 - Emoji Normalizasyonu (Emoji Sentiment Ranking Tabanlı)

Amaç: Ham metindeki emojileri, projenin A1.5 etiketleme kılavuzuna uyumlu
sabit anlam etiketlerine çevirmek (ör. "😍" -> "[EMOJI_POZITIF]").
"""

import re
import emoji
import json
import os

# ESR JSON dosyasını yükleme
def load_esr_mapping() -> dict:
    json_path = os.path.join(os.path.dirname(__file__), "data","esr_emojis.json")
    if os.path.exists(json_path):
        with open(json_path, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}

ESR_EMOJI_MAP = load_esr_mapping()


def extract_emojis(text: str) -> list[str]:
    """Metindeki tüm emojileri liste halinde döndürür."""
    return [e['emoji'] for e in emoji.emoji_list(text)]


def remove_skin_tone(emoji_char: str) -> str:
    """Emoji üzerindeki cilt tonu ekini kaldırır."""
    return re.sub(r'[\U0001F3FB-\U0001F3FF]', '', emoji_char)


def remove_variation_selector(emoji_char: str) -> str:
    """Emoji üzerindeki VS16 (U+FE0F, 'emoji stili' varyasyon seçici) karakterini kaldırır."""
    return emoji_char.replace('\uFE0F', '')


def get_emoji_label(emoji_char: str) -> str:
    """ESR veritabanında arar; bulunamazsa cilt tonu ve/veya varyasyon seçiciyi
    kaldırıp tekrar dener."""

    if emoji_char in ESR_EMOJI_MAP:
        return ESR_EMOJI_MAP[emoji_char]
 
    candidates = [
        remove_skin_tone(emoji_char),
        remove_variation_selector(emoji_char),
        remove_variation_selector(remove_skin_tone(emoji_char)),
    ]
 
    for candidate in candidates:
        if candidate in ESR_EMOJI_MAP:
            return ESR_EMOJI_MAP[candidate]
 
    return "NOTR"


def normalize_emojis(text: str) -> tuple[str, list[str]]:
    """
    Metindeki emojileri [EMOJI_POZITIF], [EMOJI_NEGATIF], [EMOJI_NOTR] yapar.

    Returns:
        (normalize_edilmis_metin, bulunan_etiketler)
    """
    found_emojis = [e['emoji'] for e in emoji.emoji_list(text)]
    labels = []
    cleaned = text

    for emo in found_emojis:
        label = get_emoji_label(emo)
        labels.append(label)
        cleaned = cleaned.replace(emo, f" [EMOJI_{label}] ")

    # Fazla boşlukları temizle
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned, labels