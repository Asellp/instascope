from __future__ import annotations

import instaloader

from ..exceptions import classify_instaloader_error
from ..rate_limiter import RateLimiter


def fetch_comments(
    post,
    limiter: RateLimiter,
    max_comments: int,
):
    """
    Bir gönderinin yorumlarını iterator olarak döndürür.

    Herhangi bir mapping yapmaz.

    posts.py'daki ile aynı mantık: iterasyon sırasında Instaloader'dan gelen
    ham hatalar RateLimitError/ScrapingBlockedError'a çevrilip fırlatılıyor.
    """

    try:
        for index, comment in enumerate(post.get_comments()):

            if index >= max_comments:
                break

            limiter.wait()

            yield comment

    except instaloader.exceptions.InstaloaderException as exc:
        raise classify_instaloader_error(exc) from exc