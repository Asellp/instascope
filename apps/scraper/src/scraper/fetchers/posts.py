from __future__ import annotations

from datetime import datetime

import instaloader

from ..config import settings
from ..exceptions import classify_instaloader_error
from ..rate_limiter import RateLimiter


def fetch_posts(
    profile: instaloader.Profile,
    limiter: RateLimiter,
    max_posts: int | None = None,
    since: datetime | None = None,
):
    """
    Profildeki gönderileri iterator olarak döndürür.

    max_posts: verilmezse .env'deki settings.MAX_POSTS (güvenlik tavanı —
    since verilse de verilmese de her zaman uygulanır, "sonsuza kadar çekme"
    riskine karşı).

    since: verilirse, Instagram'ın kendi CLI'ının (bkz. Instaloader.download_profiles,
    latest_stamps/fast_update) kullandığı mantıkla AYNI: get_posts() en yeniden
    en eskiye sıralı döndürdüğü için, since'ten ESKİ VEYA EŞİT bir posta
    rastlayınca hemen DURUYORUZ — geri kalan (zaten bilinen) postlara hiç
    bakmıyoruz. Bu, backend'in "bu hesabın en son bildiğim postu şu tarihliydi"
    diyerek her çalıştırmada sadece GERÇEKTEN YENİ içeriği çektirmesini sağlıyor
    — sabit MAX_POSTS'a göre çok daha az istek, çok daha az ban riski.

    since verilmezse (ilk çekim, ya da backend "since" göndermiyorsa) eskisi
    gibi sadece max_posts'a göre durur — geriye dönük uyumlu.

    Instaloader'ın iterasyon sırasında fırlattığı ham hatalar
    (ConnectionException vb.) classify_instaloader_error() ile
    RateLimitError/ScrapingBlockedError'a çevrilip yeniden fırlatılıyor —
    scraper_service.py'daki RetryManager bu ikisini ayırt edip ona göre
    davranabilsin diye (geçiciyse bekle-tekrar-dene, kalıcıysa dur).
    """

    effective_max_posts = max_posts if max_posts is not None else settings.MAX_POSTS

    try:
        for index, post in enumerate(profile.get_posts()):

            if index >= effective_max_posts:
                break

            if since is not None and post.date_utc <= since:
                # since'ten eski/eşit bir posta ulaştık — get_posts() en yeniden
                # en eskiye sıralı olduğu için, buradan sonrakilerin HEPSİ zaten
                # bilinen/eski içerik. Devam etmenin anlamı yok, dur.
                break

            limiter.wait()

            yield post

    except instaloader.exceptions.InstaloaderException as exc:
        raise classify_instaloader_error(exc) from exc