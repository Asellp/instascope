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