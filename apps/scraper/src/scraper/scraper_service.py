"""
scraper_service.py

Scraper modülünün ana orkestrasyon katmanı.
"""

from __future__ import annotations

import logging
from datetime import datetime

from .retry import RetryManager
from .cache import CacheManager
from .config import settings
from .exceptions import RateLimitError, ScrapingBlockedError
from .login import LoginManager
from .mapper import (
    comment_to_model,
    post_to_model,
    profile_to_model,
)
from .models import (
    Comment,
    Post,
    ScrapeResult,
)
from .rate_limiter import RateLimiter

from .fetchers.comments import fetch_comments
from .fetchers.posts import fetch_posts
from .fetchers.profile import fetch_profile

logger = logging.getLogger(__name__)


class ScraperService:

    def __init__(self) -> None:

        self.cache = CacheManager()
        self.login_manager = LoginManager()
        self.rate_limiter = RateLimiter()
        self.retry = RetryManager()

    def scrape(
        self,
        username: str,
        max_posts: int | None = None,
        max_comments: int | None = None,
        comments_per_post: int | None = None,
        since: datetime | None = None,
    ) -> ScrapeResult:
        """
        max_posts/max_comments/comments_per_post: çağrı başına override,
        verilmezse .env'deki varsayılanlara düşer (geriye dönük uyumlu).

        since: verilirse, sadece bu tarihten SONRAKİ postlar/yorumlar çekilir.

        DÜZELTME (dayanıklılık): eskiden bir post'un yorumları çekilemezse
        (örn. Instagram'ın iPhone-endpoint'i 12+ yorumlu postlarda "something
        went wrong" hatası verirse) TÜM scrape() çağrısı başarısız oluyordu —
        hesabın diğer 14 postu (caption/likes gibi yorum GEREKTİRMEYEN veri
        dahil) da beraber kayboluyordu. Artık SADECE o post'un yorumları
        atlanıyor (boş liste), post'un kendisi (caption, likes, comments_count
        gibi zaten elde bilgiler) yine de sonuca ekleniyor — kısmi veri,
        hiç veriden iyidir.
        """

        effective_max_comments = max_comments if max_comments is not None else settings.MAX_COMMENTS
        effective_comments_per_post = (
            comments_per_post if comments_per_post is not None else settings.COMMENTS_PER_POST
        )

        logger.info(
            "Scraping başladı -> @%s%s",
            username,
            f" (since={since.isoformat()})" if since is not None else "",
        )

        cached = self.cache.get(username)

        if cached is not None:
            return cached

        loader = self.login_manager.get_loader()

        instagram_profile = self.retry.execute(
            fetch_profile,
            loader,
            username,
            retry_exceptions=(RateLimitError,),
        )

        profile = profile_to_model(
            instagram_profile
        )

        posts: list[Post] = []

        comments: list[Comment] = []

        def _drain_posts() -> list:
            return list(
                fetch_posts(
                    instagram_profile,
                    self.rate_limiter,
                    max_posts=max_posts,
                    since=since,
                )
            )

        instagram_posts = self.retry.execute(
            _drain_posts,
            retry_exceptions=(RateLimitError,),
        )

        for instagram_post in instagram_posts:

            post = post_to_model(
                instagram_post
            )

            remaining_comments = (
                effective_max_comments
                - len(comments)
            )

            if remaining_comments <= 0:
                break

            this_post_limit = min(
                effective_comments_per_post,
                remaining_comments,
            )

            def _drain_comments(
                _post=instagram_post,
                _limit=this_post_limit,
            ) -> list:
                return list(
                    fetch_comments(_post, self.rate_limiter, _limit)
                )

            try:
                instagram_comments = self.retry.execute(
                    _drain_comments,
                    retry_exceptions=(RateLimitError,),
                )
            except (RateLimitError, ScrapingBlockedError) as exc:
                # DÜZELTME: bu post'un yorumları çekilemedi (ör. Instagram'ın
                # iPhone-endpoint'i şu an bu post için istikrarsız) — sadece
                # bu post'u yorumsuz bırakıp DEVAM ediyoruz, tüm hesabı
                # kaybetmiyoruz.
                logger.warning(
                    "Post %s için yorumlar çekilemedi, post yorumsuz kaydediliyor: %s",
                    instagram_post.shortcode,
                    exc,
                )
                instagram_comments = []

            for instagram_comment in instagram_comments:

                comment = comment_to_model(
                    instagram_comment,
                    instagram_post.shortcode,
                )

                post.add_comment(comment)

                comments.append(comment)

            posts.append(post)

        result = ScrapeResult(
            profile=profile,
            posts=posts,
            comments=comments,
        )

        self.cache.set(
            username,
            result,
        )

        logger.info(
            "Scraping tamamlandı. %d gönderi, %d yorum çekildi.",
            result.total_posts,
            result.total_comments,
        )

        return result