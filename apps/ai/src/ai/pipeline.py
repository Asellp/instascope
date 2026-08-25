"""
Ön işleme pipeline'ı — A2.1

Adımlar (sıra önemli):
  1. Mention/hashtag ayrıştır ve ana metinden çıkar
  2. Tekrar eden karakterleri sadeleştir + Türkçe küçük harfe çevir
  3. Emojileri anlam etiketlerine çevir

Çıktı: aşağıdaki alanları içeren bir sözlük (dict).
"""

from dataclasses import dataclass, field

from .mention_hashtag_parser import strip_mentions_and_hashtags
from .emoji_normalizer import normalize_emojis
from .text_cleaner import clean_text


@dataclass
class OnIslenmisYorum:
    orijinal_metin: str
    temiz_metin: str
    mentions: list[str] = field(default_factory=list)
    hashtags: list[str] = field(default_factory=list)
    emoji_etiketleri: list[str] = field(default_factory=list)


def on_isle(raw_text: str) -> OnIslenmisYorum:
    """Tek bir ham yorumu tüm ön işleme adımlarından geçirir."""
    if raw_text is None:
        raw_text = ""

    # 1. Mention / hashtag ayrıştırma
    text_no_tags, mentions, hashtags = strip_mentions_and_hashtags(raw_text)

    # 2. Türkçe karakter düzeltme + tekrar eden karakter sadeleştirme
    #    (ÖNEMLİ: bu adım emoji normalizasyonundan ÖNCE yapılmalı; aksi halde
    #    sonradan eklenen "[EMOJI_POZITIF]" gibi etiketler de küçük harfe
    #    çevrilip "[emojı_pozıtıf]" gibi bozulur.)
    cleaned = clean_text(text_no_tags)

    # 3. Emoji normalizasyonu
    final_text, emoji_labels = normalize_emojis(cleaned)

    return OnIslenmisYorum(
        orijinal_metin=raw_text,
        temiz_metin=final_text,
        mentions=mentions,
        hashtags=hashtags,
        emoji_etiketleri=emoji_labels,
    )


def on_isle_sentiment(raw_text: str) -> str:
    """
    Sentiment modeli için AYRI ön işleme yolu — on_isle()'dan FARKLI olarak
    3. adımı (normalize_emojis) BİLEREK ATLAR, emoji ham haliyle kalır.

    NEDEN: cardiffnlp/twitter-xlm-roberta-base-sentiment gibi transformer
    tabanlı sentiment modelleri emojiyi doğal dilin bir parçası olarak
    anlayabiliyor — "😍😍😍" gibi emoji-ağırlıklı bir yorumu "[EMOJI_POZITIF]
    EMOJI_POZITIF] [EMOJI_POZITIF]" gibi soyut bir koda çevirmek, modelin bu
    doğal yeteneğini elinden alıp "neutral"e (emin olamama) düşürüyordu.

    Gerçek veriyle (real_data_pool.json, 368 örnek) doğrulandı:
    Macro F1 0.4826 -> 0.6922 (+%43), kısa/emoji-ağırlıklı yorumlarda
    doğruluk %90.86 (bkz. scripts/evaluate_f1_no_emoji_norm.py denemesi).

    ÖNEMLİ: on_isle() DEĞİŞTİRİLMEDİ — topic modelleme, spam filtresi gibi
    diğer kullanımlar hâlâ eski (emoji normalizasyonlu) davranışı
    kullanmaya devam ediyor. Bu fonksiyon SADECE sentiment analizi için.
    """
    if raw_text is None:
        raw_text = ""

    text_no_tags, _mentions, _hashtags = strip_mentions_and_hashtags(raw_text)
    return clean_text(text_no_tags)