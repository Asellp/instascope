"""
cache.py

Scraper sonuçlarını belirli bir süre bellekte tutar.

Şimdilik in-memory cache kullanılmaktadır.
İleride Redis'e geçildiğinde yalnızca bu dosyanın
değişmesi yeterli olacaktır.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import datetime, timedelta

from .config import settings
from .models import ScrapeResult

logger = logging.getLogger(__name__)


@dataclass
class CacheEntry:
    """
    Cache'de tutulan tek kayıt.
    """

    value: ScrapeResult
    expires_at: datetime


class CacheManager:
    """
    TTL destekli in-memory cache yöneticisi.
    """

    def __init__(self) -> None:

        self.ttl = timedelta(
            hours=settings.CACHE_TTL_HOURS
        )

        self._cache: dict[str, CacheEntry] = {}

    def get(
        self,
        username: str,
    ) -> ScrapeResult | None:
        """
        Cache'den veri döndürür.
        """

        key = username.lower()

        entry = self._cache.get(key)

        if entry is None:
            return None

        if datetime.utcnow() >= entry.expires_at:

            logger.info(
                "Cache süresi doldu: %s",
                username,
            )

            self.delete(username)

            return None

        logger.info(
            "Cache kullanıldı: %s",
            username,
        )

        return entry.value

    def set(
        self,
        username: str,
        result: ScrapeResult,
    ) -> None:
        """
        Sonucu cache'e kaydeder.
        """

        key = username.lower()

        self._cache[key] = CacheEntry(
            value=result,
            expires_at=datetime.utcnow() + self.ttl,
        )

        logger.info(
            "Cache oluşturuldu: %s",
            username,
        )

    def delete(
        self,
        username: str,
    ) -> None:
        """
        Tek bir cache kaydını siler.
        """

        self._cache.pop(
            username.lower(),
            None,
        )

    def clear(self) -> None:
        """
        Tüm cache'i temizler.
        """

        self._cache.clear()

        logger.info(
            "Cache temizlendi."
        )

    def has(
        self,
        username: str,
    ) -> bool:
        """
        Geçerli cache var mı?
        """

        return self.get(username) is not None

    @property
    def size(self) -> int:
        """
        Cache'deki kayıt sayısı.
        """

        return len(self._cache)