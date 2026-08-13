"""
exceptions.py

Scraper modülünün hata tipleri + Instaloader'ın ham hatalarını
bunlara sınıflandıran yardımcı fonksiyon.
"""

from __future__ import annotations

import re


class ScraperError(Exception):
    """Scraper modülünün temel exception sınıfı."""


class AuthenticationError(ScraperError):
    """Instagram kimlik doğrulama hatası."""


class TwoFactorRequiredError(AuthenticationError):
    """2FA nedeniyle giriş yapılamadı."""


class PrivateAccountError(ScraperError):
    """Hedef hesap gizli."""


class ProfileNotFoundError(ScraperError):
    """Profil bulunamadı."""


class RateLimitError(ScraperError):
    """Geçici rate limit / 'birkaç dakika bekle' hatası — RetryManager bunu
    YAKALAR, backoff ile bekleyip tekrar dener."""


class ScrapingBlockedError(ScraperError):
    """Kalıcı/hesap bazlı engelleme (checkpoint, captcha, banned vb.) —
    RetryManager bunu YAKALAMAZ, iş anında durmalı (CollectionJob 'failed')."""


class InvalidSessionError(ScraperError):
    """Session geçersiz veya süresi dolmuş."""


# ---------------------------------------------------------
# Instaloader hata sınıflandırması
# ---------------------------------------------------------
#
# Instaloader, ağla ilgili birçok farklı durumu (rate limit, geçici ağ
# hatası, hesap bazlı engelleme) TEK bir ConnectionException altında
# topluyor — tip üzerinden ayırt edilemiyor, sadece hata MESAJINA bakarak
# ayırt edilebiliyor. Bu fonksiyon önce Instaloader'ın KESİN tiplerine
# (TooManyRequestsException, AbortDownloadException) bakıyor, yoksa mesaja
# bakıyor.
#
# DÜZELTME: "something went wrong. Please try again." — bu, Instagram'ın
# iPhone-endpoint yorumu çekerken (12+ yorumlu postlarda, bkz.
# structures.py Post.get_comments -> _get_comments_via_iphone_endpoint)
# verdiği GENEL bir "geçici hata, tekrar dene" mesajı. checkpoint/captcha
# gibi KALICI bir engelleme diliyle KARIŞTIRILMAMALI — Instagram'ın kendi
# ifadesi "please try again" diyor, yani tekrar denemeyi hak ediyor. Eskiden
# bu mesaj hiçbir pattern'e uymadığı için temkinli varsayılana
# (ScrapingBlockedError) düşüp HİÇ tekrar denenmeden pes ediyordu.
#
# Temkinli tasarım kararı KORUNUYOR: tanınmayan/belirsiz bir mesajda hâlâ
# ScrapingBlockedError'a düşülüyor — sadece BU özel, bilinen "geçici" mesaj
# artık tanınıyor.

_TRANSIENT_PATTERNS = re.compile(
    r"please wait|rate limit|429|401 unauthorized|something went wrong",
    re.IGNORECASE,
)

_BLOCKED_PATTERNS = re.compile(
    r"checkpoint|challenge_required|feedback_required|captcha|"
    r"login_required|blocked|banned|suspicious",
    re.IGNORECASE,
)


def classify_instaloader_error(exc: Exception) -> ScraperError:
    """Instaloader'ın fırlattığı ham hatayı RateLimitError ya da
    ScrapingBlockedError'a çevirir — önce KESİN tipe bakar, yoksa mesaj
    içeriğine bakar (bkz. yukarıdaki not)."""

    # 1) Instaloader'ın kendi kesin tipleri (mesaja bakmaya gerek yok)
    import instaloader

    if isinstance(exc, instaloader.exceptions.TooManyRequestsException):
        return RateLimitError(str(exc))

    if isinstance(exc, instaloader.exceptions.AbortDownloadException):
        return ScrapingBlockedError(str(exc))

    # 2) Belirsiz durumlar (örn. bizim 401 "please wait" ya da "something
    #    went wrong" hatalarımız) — önce KALICI kalıplara bak (öncelik
    #    onlarda kalsın — bir mesaj yanlışlıkla ikisine de uysa bile
    #    "blocked" daha temkinli/güvenli seçim).
    message = str(exc)

    if _BLOCKED_PATTERNS.search(message):
        return ScrapingBlockedError(message)

    if _TRANSIENT_PATTERNS.search(message):
        return RateLimitError(message)

    # 3) Hiçbiri değilse: temkinli ol, bloklanmış say.
    return ScrapingBlockedError(message)