"""
Mention (@kullanici) ve hashtag (#etiket) ayrıştırma.

Amaç: Bu öğeleri asıl metinden ayırıp ayrı listelerde tutmak, böylece
duygu analizi sadece "gerçek" metin üzerinde çalışır.
"""

import re

# Noktayı sondaki noktalama işaretleriyle karıştırmamak için kullanıcı adı karakterlerine odaklanıyoruz
# Twitter/Instagram standartlarında mention: @ harfi + harf/rakam/alt çizgi (ve opsiyonel iç nokta)
MENTION_PATTERN = re.compile(r"@[\wğüşıöçĞÜŞİÖÇ]+(?:\.[\wğüşıöçĞÜŞİÖÇ]+)*")
HASHTAG_PATTERN = re.compile(r"#[\wğüşıöçĞÜŞİÖÇ]+")


def extract_mentions(text: str) -> list[str]:
    return MENTION_PATTERN.findall(text)


def extract_hashtags(text: str) -> list[str]:
    return HASHTAG_PATTERN.findall(text)


def strip_mentions_and_hashtags(text: str) -> tuple[str, list[str], list[str]]:
    """
    Metinden mention ve hashtag'leri çıkarır.

    Returns:
        (temiz_metin, mention_listesi, hashtag_listesi)
    """
    mentions = extract_mentions(text)
    hashtags = extract_hashtags(text)

    cleaned = MENTION_PATTERN.sub("", text)
    cleaned = HASHTAG_PATTERN.sub("", cleaned)
    
    # Çıkarılan etiketlerden sonra üst üste binen boşlukları temizler
    cleaned = re.sub(r"\s+", " ", cleaned).strip()

    return cleaned, mentions, hashtags