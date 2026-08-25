"""
cache.py

Scraper sonuçlarını belirli bir süre bellekte tutar.

Şimdilik in-memory cache kullanılmaktadır.
İleride Redis'e geçildiğinde yalnızca bu dosyanın
değişmesi yeterli olacaktır.

DÜZELTME: cache anahtarı eskiden SADECE kullanıcı adıydı (`username.lower()`)
— bu, farklı parametrelerle (örn. hafif tarama maxComments=200 vs derin
tarama maxComments=10) art arda gelen isteklerin BİRBİRİNİN cache'ini
"kirletmesine" yol açıyordu: önce hafif taramayla dolan cache, hemen
ardından farklı parametrelerle atılan bir derin tarama isteğine de
(yanlışlıkla) dönüyordu, Instagram'a hiç gidilmeden. Artık anahtar,
kullanıcı adı + tüm scrape parametrelerinin birleşimi — farklı parametreli
istekler artık ayrı, birbirinden bağımsız cache kayıtları oluşturuyor.
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

    def _build_key(
        self,
        username: str,
        max_posts: int | None = None,
        max_comments: int | None = None,
        comments_per_post: int | None = None,
        since: datetime | None = None,
    ) -> str:
        """
        DÜZELTME: anahtar artık kullanıcı adı + TÜM scrape parametrelerinin
        birleşimi. Aynı kullanıcı, farklı parametrelerle çağrıldığında
        (hafif vs derin tarama gibi) artık FARKLI cache kayıtları üretir.
        """
        since_part = since.isoformat() if since is not None else "none"
        return f"{username.lower()}:{max_posts}:{max_comments}:{comments_per_post}:{since_part}"

    def get(
        self,
        username: str,
        max_posts: int | None = None,
        max_comments: int | None = None,
        comments_per_post: int | None = None,
        since: datetime | None = None,
    ) -> ScrapeResult | None:
        """
        Cache'den veri döndürür.
        """

        key = self._build_key(username, max_posts, max_comments, comments_per_post, since)

        entry = self._cache.get(key)

        if entry is None:
            return None

        if datetime.utcnow() >= entry.expires_at:

            logger.info(
                "Cache süresi doldu: %s",
                username,
            )

            self._cache.pop(key, None)

            return None

        logger.info(
            "Cache kullanıldı: %s (parametreler: maxPosts=%s maxComments=%s commentsPerPost=%s since=%s)",
            username, max_posts, max_comments, comments_per_post, since,
        )

        return entry.value

    def set(
        self,
        username: str,
        result: ScrapeResult,
        max_posts: int | None = None,
        max_comments: int | None = None,
        comments_per_post: int | None = None,
        since: datetime | None = None,
    ) -> None:
        """
        Sonucu cache'e kaydeder.
        """

        key = self._build_key(username, max_posts, max_comments, comments_per_post, since)

        self._cache[key] = CacheEntry(
            value=result,
            expires_at=datetime.utcnow() + self.ttl,
        )

        logger.info(
            "Cache oluşturuldu: %s (parametreler: maxPosts=%s maxComments=%s commentsPerPost=%s since=%s)",
            username, max_posts, max_comments, comments_per_post, since,
        )

    def delete(
        self,
        username: str,
        max_posts: int | None = None,
        max_comments: int | None = None,
        comments_per_post: int | None = None,
        since: datetime | None = None,
    ) -> None:
        """
        Tek bir cache kaydını siler (parametreler verilmezse, o parametre
        kombinasyonuyla oluşturulmuş kaydı siler — TÜM kullanıcı için değil).
        """

        key = self._build_key(username, max_posts, max_comments, comments_per_post, since)
        self._cache.pop(key, None)

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
        max_posts: int | None = None,
        max_comments: int | None = None,
        comments_per_post: int | None = None,
        since: datetime | None = None,
    ) -> bool:
        """
        Geçerli cache var mı?
        """

        return self.get(username, max_posts, max_comments, comments_per_post, since) is not None

    @property
    def size(self) -> int:
        """
        Cache'deki kayıt sayısı.
        """

        return len(self._cache)