from __future__ import annotations

import instaloader

from ..exceptions import (
    PrivateAccountError,
    ProfileNotFoundError,
    classify_instaloader_error,
)


def fetch_profile(
    loader: instaloader.Instaloader,
    username: str,
) -> instaloader.Profile:
    """
    Instagram profilini döndürür.

    DÜZELTME: eskiden her türlü hata (ConnectionException, rate limit,
    bloklanma dahil) tek bir "except Exception" ile yutulup
    ProfileNotFoundError'a çevriliyordu — bu yüzden gerçek sebep (örn.
    Instagram'ın rate limit vermesi) "profil bulunamadı" gibi yanlış bir
    mesaja dönüşüyordu. Artık sadece GERÇEKTEN profil yok hatası
    ProfileNotFoundError oluyor, diğer her şey (rate limit / bloklanma)
    classify_instaloader_error() ile doğru tipine (RateLimitError /
    ScrapingBlockedError) çevriliyor.
    """

    try:
        profile = instaloader.Profile.from_username(
            loader.context,
            username,
        )

    except instaloader.exceptions.ProfileNotExistsException as exc:
        raise ProfileNotFoundError(
            f"'{username}' profili bulunamadı."
        ) from exc

    except instaloader.exceptions.InstaloaderException as exc:
        raise classify_instaloader_error(exc) from exc

    if profile.is_private:
        raise PrivateAccountError(
            f"'{username}' gizli hesap."
        )

    return profile