import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from ai.text_cleaner import turkce_lower, turkce_upper, collapse_repeated_chars, clean_text
from ai.emoji_normalizer import extract_emojis, normalize_emojis
from ai.mention_hashtag_parser import extract_mentions, extract_hashtags, strip_mentions_and_hashtags
from ai.pipeline import on_isle


# ---------- text_cleaner ----------

def test_turkce_lower_ozel_karakterler():
    assert turkce_lower("İSTANBUL IŞIK") == "istanbul ışık"


def test_turkce_upper_ozel_karakterler():
    assert turkce_upper("istanbul ışık") == "İSTANBUL IŞIK"


def test_collapse_repeated_chars_dod_ornegi():
    # DoD'da bahsedilen tam örnek
    assert collapse_repeated_chars("çoooook") == "çok"


def test_collapse_repeated_chars_cift_harfe_dokunmaz():
    # 2 tekrar (çift ünsüz/ünlü) değişmemeli, sadece 3+ tekrar sadeleşmeli
    assert collapse_repeated_chars("elmaa") == "elmaa"


def test_collapse_repeated_chars_harikaaaa():
    assert collapse_repeated_chars("harikaaaa") == "harika"


def test_clean_text_birlikte():
    assert clean_text("ÇOOOOK GÜZEL") == "çok güzel"


# ---------- emoji_normalizer ----------

def test_extract_emojis_bulur():
    # "😍😍😍" girdiğinde 3 ayrı emoji karakteri yakalamalıdır
    emojiler = extract_emojis("😍😍😍")
    assert emojiler == ["😍", "😍", "😍"]
    assert len(emojiler) == 3


def test_normalize_emojis_pozitif():
    cleaned, labels = normalize_emojis("Çok güzel olmuş ❤️")
    assert "POZITIF" in labels
    assert "❤️" not in cleaned
    assert "[EMOJI_POZITIF]" in cleaned


def test_normalize_emojis_negatif():
    cleaned, labels = normalize_emojis("👎")
    assert "NEGATIF" in labels
    assert "👎" not in cleaned
    assert "[EMOJI_NEGATIF]" in cleaned


def test_normalize_emojis_cilt_tonu():
    # Ten rengi modifikatörlü emojinin (🙌🏼) temel emoji (🙌) gibi POZITIF etiketlendiğini test eder
    cleaned, labels = normalize_emojis("Tebrikler 🙌🏼")
    assert "POZITIF" in labels
    assert "🙌🏼" not in cleaned


def test_normalize_emojis_celiskili_kombinasyon():
    # Kılavuzdaki "tartışmalı" örnek: hem pozitif hem negatif emoji bir arada
    cleaned, labels = normalize_emojis("🥹❤️ #gezi 👎")
    assert "POZITIF" in labels
    assert "NEGATIF" in labels


def test_normalize_emojis_emoji_yoksa_bos_liste():
    cleaned, labels = normalize_emojis("Bu bir yorum")
    assert labels == []
    assert cleaned == "Bu bir yorum"


# ---------- mention_hashtag_parser ----------

def test_extract_mentions():
    assert extract_mentions("Harika olmuş @ervaniyecamurcu") == ["@ervaniyecamurcu"]


def test_extract_hashtags():
    assert extract_hashtags("🙌🏼 #ootd @bilgendumanli") == ["#ootd"]


def test_strip_mentions_and_hashtags():
    cleaned, mentions, hashtags = strip_mentions_and_hashtags(
        "Bravo ya yine şaşırtmadınız #ootd @csener"
    )
    assert mentions == ["@csener"]
    assert hashtags == ["#ootd"]
    assert "@csener" not in cleaned
    assert "#ootd" not in cleaned


def test_strip_hicbir_sey_yoksa():
    cleaned, mentions, hashtags = strip_mentions_and_hashtags("Sade bir yorum")
    assert mentions == []
    assert hashtags == []
    assert cleaned == "Sade bir yorum"


# ---------- pipeline (uçtan uca) ----------

def test_pipeline_tam_ornek():
    sonuc = on_isle("Çooook güzel olmuş ❤️ #moda @ayse123")

    assert sonuc.mentions == ["@ayse123"]
    assert sonuc.hashtags == ["#moda"]
    assert "POZITIF" in sonuc.emoji_etiketleri
    assert "çok" in sonuc.temiz_metin
    assert "@ayse123" not in sonuc.temiz_metin
    assert "#moda" not in sonuc.temiz_metin


def test_pipeline_bos_metin():
    sonuc = on_isle("")
    assert sonuc.temiz_metin == ""
    assert sonuc.mentions == []
    assert sonuc.hashtags == []


def test_pipeline_none_girdisi():
    sonuc = on_isle(None)
    assert sonuc.temiz_metin == ""


def test_pipeline_sadece_emoji():
    sonuc = on_isle("👎 #gezi")
    assert "NEGATIF" in sonuc.emoji_etiketleri
    assert sonuc.hashtags == ["#gezi"]