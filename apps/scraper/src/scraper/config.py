"""
config.py

Scraper modülünün merkezi yapılandırma dosyası.

Tüm ayarlar yalnızca bu dosyadan okunur.
Diğer modüller doğrudan environment variable okumaz.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()


@dataclass(frozen=True)
class Settings:
    """
    Scraper ayarları.
    """

    # ---------------------------------------------------------
    # Instagram Login
    # ---------------------------------------------------------

    INSTAGRAM_USER: str = os.getenv(
        "INSTAGRAM_USER",
        ""
    ).strip()

    INSTAGRAM_PASSWORD: str = os.getenv(
        "INSTAGRAM_PASSWORD",
        ""
    ).strip()

    INSTAGRAM_SESSION_FILE: Path = Path(
        os.getenv(
            "INSTAGRAM_SESSION_FILE",
            ".instaloader-session",
        )
    )

    # YENİ (rotasyon): virgülle ayrılmış birden fazla kullanıcı adı.
    # Örnek .env satırı: INSTAGRAM_ACCOUNTS=instascope42026,instascope_yedek
    # Her hesabın KENDİ session dosyası olmalı: .instaloader-<kullanıcı_adı>
    # (bugüne kadar zaten bu isimlendirmeyle oluşturuldu). Boş bırakılırsa
    # (geriye dönük uyumluluk) sadece INSTAGRAM_USER tek hesap olarak kullanılır
    # — rotasyon YOKTUR, davranış eskisiyle birebir aynı kalır.
    INSTAGRAM_ACCOUNTS: tuple[str, ...] = tuple(
        u.strip()
        for u in os.getenv("INSTAGRAM_ACCOUNTS", "").split(",")
        if u.strip()
    )

    # ---------------------------------------------------------
    # Scraping Limits
    # ---------------------------------------------------------

    MAX_POSTS: int = int(
        os.getenv(
            "MAX_POSTS",
            10,
        )
    )

    MAX_COMMENTS: int = int(
        os.getenv(
            "MAX_COMMENTS",
            300,
        )
    )

    COMMENTS_PER_POST: int = int(
        os.getenv(
            "COMMENTS_PER_POST",
            40,
        )
    )

    # ---------------------------------------------------------
    # Rate Limiter
    # ---------------------------------------------------------

    REQUEST_MIN_DELAY: float = float(
        os.getenv(
            "REQUEST_MIN_DELAY",
            10,
        )
    )

    REQUEST_MAX_DELAY: float = float(
        os.getenv(
            "REQUEST_MAX_DELAY",
            16,
        )
    )

    MAX_REQUESTS: int = int(
        os.getenv(
            "MAX_REQUESTS",
            80,
        )
    )

    # YENİ (rotasyon + cooldown): bir giriş hesabının kotası, en az bu kadar
    # saniye geçmeden TEKRAR sıfırlanmıyor. Rotasyon, her scrape() çağrısında
    # sıradaki hesaba geçtiği için, aynı hesap kısa aralıklarla (örn. art arda
    # birkaç farklı hedef profil taranırken) tekrar "sırası gelebilir" —
    # koşulsuz bir reset() bu durumda MAX_REQUESTS sınırını anlamsız hale
    # getirirdi (hesap hiç dinlenmeden sürekli "taze" kota alır). Varsayılan
    # 300sn (5dk) — scraper_service.py'daki _maybe_reset_quota() tarafından
    # kullanılıyor.
    LOGIN_ACCOUNT_COOLDOWN_SECONDS: int = int(
        os.getenv(
            "LOGIN_ACCOUNT_COOLDOWN_SECONDS",
            300,
        )
    )

    # ---------------------------------------------------------
    # Retry
    # ---------------------------------------------------------

    RETRY_COUNT: int = int(
        os.getenv(
            "RETRY_COUNT",
            3,
        )
    )

    RETRY_BACKOFF: float = float(
        os.getenv(
            "RETRY_BACKOFF",
            2,
        )
    )

    # ---------------------------------------------------------
    # Cache
    # ---------------------------------------------------------

    CACHE_TTL_HOURS: int = int(
        os.getenv(
            "CACHE_TTL_HOURS",
            24,
        )
    )

    # ---------------------------------------------------------
    # Logging
    # ---------------------------------------------------------

    LOG_LEVEL: str = os.getenv(
        "LOG_LEVEL",
        "INFO",
    )

    LOG_FILE: str = os.getenv(
        "LOG_FILE",
        "logs/scraper.log",
    )


settings = Settings()


def get_account_list() -> list[str]:
    """
    YENİ (rotasyon) — kullanılacak hesap listesini döner.
    INSTAGRAM_ACCOUNTS doluysa onu kullanır (rotasyon aktif).
    Boşsa, geriye dönük uyumluluk için INSTAGRAM_USER'ı tek elemanlı liste
    olarak döner (rotasyon YOK, eskisiyle birebir aynı davranış).
    """
    if settings.INSTAGRAM_ACCOUNTS:
        return list(settings.INSTAGRAM_ACCOUNTS)
    if settings.INSTAGRAM_USER:
        return [settings.INSTAGRAM_USER]
    return []