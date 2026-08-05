"""
Türkçe'ye özgü metin temizleme kararları:
  1. Türkçe karakter/yazım düzeltme (büyük/küçük harf dönüşümü İ/i, I/ı sorunları)
  2. Tekrar eden karakterlerin sadeleştirilmesi ('çoooook' -> 'çok')
"""

import re

# Türkçe'de standart .lower()/.upper() İngilizce kurallarına göre çalışır ve hatalara yol açar.
_TR_LOWER_MAP = str.maketrans("İIŞĞÜÇÖ", "iışğüçö")
_TR_UPPER_MAP = str.maketrans("iışğüçö", "İIŞĞÜÇÖ")


def turkce_lower(text: str) -> str:
    """Türkçe karakterleri doğru şekilde küçük harfe çevirir."""
    return text.translate(_TR_LOWER_MAP).lower()


def turkce_upper(text: str) -> str:
    """Türkçe karakterleri doğru şekilde büyük harfe çevirir."""
    return text.translate(_TR_UPPER_MAP).upper()


def collapse_repeated_chars(text: str, max_repeat: int = 1) -> str:
    """
    Art arda 3+ tekrar eden karakterleri tek karaktere indirger.

    Örnek: 'çoooook' -> 'çok', 'harikaaaa' -> 'harika'

    Not: max_repeat=1 varsayılan olarak her tekrarı teke indirir; bazı
    kelimelerde (örn. "hoşça kal" gibi çift ünsüzler) yanlış pozitif
    üretebilir, bu yüzden eşik 3+ tekrar olarak ayarlandı (2 harfli
    tekrarlara dokunmuyor: 'hikkkkaye' -> 'hikaye' ama 'kelle' değişmez).
    """
    pattern = re.compile(r"(.)\1{2,}")
    return pattern.sub(lambda m: m.group(1) * max_repeat, text)


def clean_text(text: str) -> str:
    """Türkçe düzeltme + tekrar eden karakter sadeleştirmesini birlikte uygular."""
    text = collapse_repeated_chars(text)
    text = turkce_lower(text)
    return text.strip()