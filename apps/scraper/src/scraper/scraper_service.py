"""
scraper_service.py

Scraper modülünün ana orkestrasyon katmanı.
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta

from .retry import RetryManager
from .cache import CacheManager
from .config import get_account_list, settings
from .exceptions import AuthenticationError, RateLimitError, ScrapingBlockedError
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
    """
    DÜZELTME (hesap rotasyonu): artık TEK bir login_manager/rate_limiter
    yerine, INSTAGRAM_ACCOUNTS'taki (ya da geriye dönük uyumluluk için
    tek INSTAGRAM_USER'lık) HER hesap için AYRI bir LoginManager + RateLimiter
    tutuluyor — bütçeler (MAX_REQUESTS) hesaplar arasında KARIŞMIYOR, her
    hesabın kendi sayacı var.

    scrape() her çağrıldığında, round-robin ile SIRADAKİ giriş hesabına
    geçiliyor — hangi hedef profili (username parametresi) çektiğimizden
    BAĞIMSIZ olarak, "biz kimin adına Instagram'a bakıyoruz" rotasyonu bu.
    Amaç: tek bir giriş hesabının günlük toplam istek hacmini azaltıp,
    şüpheli aktivite riskini birden fazla hesaba yaymak.

    INSTAGRAM_ACCOUNTS boşsa (sadece INSTAGRAM_USER tanımlıysa), liste tek
    elemanlı olur — rotasyon fiilen hiç devreye girmez, davranış eskisiyle
    birebir aynı kalır.

    YENİ (cooldown korumalı reset): her scrape()/get_profile() çağrısında,
    o an aktif olan giriş hesabının kotası KOŞULSUZ sıfırlanmıyor — sadece
    o hesabın kotası en son ne zaman sıfırlandıysa, aradan
    LOGIN_ACCOUNT_COOLDOWN_SECONDS kadar süre geçtiyse sıfırlanıyor.
    Rotasyon çok sık aynı hesaba dönerse, kotanın gereksiz yere art arda
    sıfırlanmasını önlüyor — kalan bütçe, cooldown süresi boyunca
    birikimli kullanılıyor.

    YENİ (get_profile — hafif profil çekme): eskiden /internal/scrape-profile
    ucu, sadece takipçi sayısı için TAM scrape() (post+yorum taraması da
    dahil) çağırıyordu — bu, her hesap işlenirken Instagram'a GEREKSİZ YERE
    İKİ KAT yük biniyordu (bir profil için, bir de gerçek /scrape-posts
    için), büyük hesaplarda RateLimitError'ların hızlı çıkmasının asıl
    sebeplerinden biriydi. get_profile(), SADECE TEK bir hafif Instagram
    isteği (fetch_profile) atıyor, post/yorum taraması hiç yapmıyor.
    """

    def __init__(self) -> None:

        self.cache = CacheManager()
        self.retry = RetryManager()

        self._accounts = get_account_list()
        if not self._accounts:
            raise AuthenticationError(
                "Hiç Instagram hesabı tanımlı değil "
                "(INSTAGRAM_ACCOUNTS ya da INSTAGRAM_USER ayarlanmalı)."
            )

        # Her hesap için AYRI LoginManager + RateLimiter — bütçeler karışmasın.
        self._login_managers: dict[str, LoginManager] = {
            account: LoginManager(username=account) for account in self._accounts
        }
        self._rate_limiters: dict[str, RateLimiter] = {
            account: RateLimiter() for account in self._accounts
        }
        self._rotation_index = 0

        # Her giriş hesabının kotasının EN SON ne zaman sıfırlandığını
        # tutuyoruz — cooldown kontrolü için.
        self._last_reset_at: dict[str, datetime] = {}

        logger.info(
            "ScraperService başlatıldı. Rotasyon havuzu: %s (%d hesap)",
            ", ".join(f"@{a}" for a in self._accounts),
            len(self._accounts),
        )

    def _next_login_account(self) -> str:
        """Round-robin ile sıradaki GİRİŞ hesabını seçer (hedef profil değil)."""
        account = self._accounts[self._rotation_index]
        self._rotation_index = (self._rotation_index + 1) % len(self._accounts)
        return account

    def _maybe_reset_quota(self, active_account: str, rate_limiter: RateLimiter) -> None:
        """
        Kotayı KOŞULSUZ değil, cooldown'a göre sıfırlar.

        Neden gerekli: rotasyon her çağrıda bir sonraki hesaba geçtiği için,
        aynı hesap kısa aralıklarla (örn. art arda birkaç farklı hedef
        profil taranırken) tekrar tekrar "sırası gelebilir". Koşulsuz bir
        reset(), her seferinde kotayı sıfırlardı — bu da pratikte
        MAX_REQUESTS sınırını ANLAMSIZ hale getirir. Cooldown, gerçek
        zamanda yeterli süre geçmeden kotanın sıfırlanmamasını garanti eder.
        """
        now = datetime.utcnow()
        last_reset = self._last_reset_at.get(active_account)
        cooldown = timedelta(seconds=getattr(settings, "LOGIN_ACCOUNT_COOLDOWN_SECONDS", 300))

        if last_reset is None or (now - last_reset) >= cooldown:
            rate_limiter.reset()
            self._last_reset_at[active_account] = now
            logger.info("@%s için kota sıfırlandı.", active_account)
        else:
            remaining = (cooldown - (now - last_reset)).total_seconds()
            logger.info(
                "@%s için kota HENÜZ sıfırlanmadı (cooldown'da, kalan: %.0fsn) — mevcut bütçe (%d/%d) kullanılmaya devam ediyor.",
                active_account, remaining, rate_limiter.remaining_requests, rate_limiter.max_requests,
            )

    def get_profile(self, username: str):
        """
        YENİ — SADECE profil bilgisini (takipçi/takip/post sayısı) çeker,
        postları/yorumları HİÇ çekmez.

        DÜZELTME (bulgu): eskiden /internal/scrape-profile, tam scrape()'i
        çağırıyordu — bu, sadece takipçi sayısı için, GEREKSİZ YERE tüm
        postları/yorumları da (varsayılan ayarlarla) çekiyordu, sonra sadece
        result.profile'ı kullanıp geri kalanını çöpe atıyordu. Bu, her hesap
        işlenirken Instagram'a İKİ KAT gereksiz yük biniyordu — büyük
        hesaplarda RateLimitError'ların bu kadar hızlı çıkmasının asıl
        sebeplerinden biri muhtemelen buydu.

        Bu metod, sadece TEK bir hafif Instagram isteği (fetch_profile)
        atıyor — post/yorum taraması hiç yapmıyor. Kendi cache'i yok
        (fetch_profile zaten tek, ucuz bir istek — cache'lemenin getirisi
        maliyetinden az).
        """
        active_account = self._next_login_account()
        login_manager = self._login_managers[active_account]
        rate_limiter = self._rate_limiters[active_account]
        self._maybe_reset_quota(active_account, rate_limiter)

        logger.info(
            "Sadece profil çekiliyor -> @%s (giriş hesabı: @%s, kalan bütçe: %d/%d)",
            username, active_account, rate_limiter.remaining_requests, rate_limiter.max_requests,
        )

        loader = login_manager.get_loader()

        instagram_profile = self.retry.execute(
            fetch_profile,
            loader,
            username,
            retry_exceptions=(RateLimitError,),
        )

        return profile_to_model(instagram_profile)

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

        DÜZELTME (dayanıklılık): bir post'un yorumları çekilemezse SADECE o
        post'un yorumları atlanıyor, hesabın geri kalanı (caption, likes gibi
        yorum GEREKTİRMEYEN veri dahil) yine de sonuca ekleniyor.
        """

        effective_max_comments = max_comments if max_comments is not None else settings.MAX_COMMENTS
        effective_comments_per_post = (
            comments_per_post if comments_per_post is not None else settings.COMMENTS_PER_POST
        )

        cached = self.cache.get(
            username,
            max_posts=max_posts,
            max_comments=effective_max_comments,
            comments_per_post=effective_comments_per_post,
            since=since,
        )
        if cached is not None:
            return cached

        # YENİ (rotasyon): bu çağrı için hangi GİRİŞ hesabını kullanacağımızı seç.
        active_account = self._next_login_account()
        login_manager = self._login_managers[active_account]
        rate_limiter = self._rate_limiters[active_account]

        # YENİ: koşulsuz reset() YERİNE, cooldown korumalı sıfırlama.
        self._maybe_reset_quota(active_account, rate_limiter)

        logger.info(
            "Scraping başladı -> @%s%s (giriş hesabı: @%s, kalan bütçe: %d/%d)",
            username,
            f" (since={since.isoformat()})" if since is not None else "",
            active_account,
            rate_limiter.remaining_requests,
            rate_limiter.max_requests,
        )

        loader = login_manager.get_loader()

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
            # DÜZELTME (büyük hesap bulgusu): eskiden list(fetch_posts(...))
            # kullanılıyordu — jeneratör ortasında RateLimitError/
            # ScrapingBlockedError fırlarsa, o ana kadar üretilen TÜM postlar
            # kayboluyordu (list() ya tam biter ya da hiç dönmez). Artık
            # elle biriktiriyoruz: hata olsa bile, O ANA KADAR toplanan
            # postlar KORUNUYOR ve normal (hatasız) bir sonuç olarak
            # dönüyor — büyük hesaplarda "ya hep ya hiç" yerine "elde ne
            # varsa o" davranışı.
            collected: list = []
            try:
                for instagram_post in fetch_posts(
                    instagram_profile,
                    rate_limiter,
                    max_posts=max_posts,
                    since=since,
                ):
                    collected.append(instagram_post)
            except (RateLimitError, ScrapingBlockedError) as exc:
                logger.warning(
                    "Post listeleme limite takıldı, %d post o ana kadar toplanmıştı, "
                    "bunlarla devam ediliyor: %s",
                    len(collected), exc,
                )
            return collected

        # NOT: _drain_posts artık kendi içinde hatayı yakalayıp normal bir
        # liste döndürüyor — bu yüzden retry_exceptions burada pratikte hiç
        # tetiklenmeyecek (kasıtlı: aynı kotaya tekrar tekrar çarpmanın
        # anlamı yok), ama fetch_profile ile tutarlılık için retry.execute
        # sarmalayıcısı korunuyor.
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
                    fetch_comments(_post, rate_limiter, _limit)
                )

            try:
                instagram_comments = self.retry.execute(
                    _drain_comments,
                    retry_exceptions=(RateLimitError,),
                )
            except (RateLimitError, ScrapingBlockedError) as exc:
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
            max_posts=max_posts,
            max_comments=effective_max_comments,
            comments_per_post=effective_comments_per_post,
            since=since,
        )

        logger.info(
            "Scraping tamamlandı (@%s üzerinden). %d gönderi, %d yorum çekildi.",
            active_account,
            result.total_posts,
            result.total_comments,
        )

        return result