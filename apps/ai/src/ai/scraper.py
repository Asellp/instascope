"""
A2.5 — Scraping modülü (Instaloader, login'siz/herkese açık erişim)

Kurallar dokümanına (docs/scraping-kurallari.md, mentor onaylı) göre:
  - sadece proje test hesabı
  - sadece herkese açık profiller
  - login'siz erişim
  - istekler arası min. 10-15 sn bekleme
  - bir toplama döngüsü (6 saatlik job) başına üst sınır 30-50 istek
  - rate-limit/blok sinyali alınırsa DUR, tekrar deneme, logla

AÇIK — henüz netleşmedi:
  1. Gönderim yolu: normalize edilmiş veri Core API'ye POST ile mi (örn.
     /accounts gibi bir uç), yoksa db.py'deki gibi doğrudan DB/kuyruğa mı
     yazılacak? fetch_profile/fetch_posts/fetch_comments şu an sadece veriyi
     döndürüyor, gönderen adım henüz eklenmedi.
  2. Dosya konumu: monorepo yapısına göre bu modülün "resmi" yeri
     apps/collector olmalı (apps/ai değil) — Collector, AI servisinden ayrı
     bir bileşen olarak tanımlanmış. Şu an apps/ai/src/ai/ altında duruyor,
     bunun doğru yer olup olmadığı Backend'e sorulmalı.

NOT: Kullanıcı adları burada ham tutulmuyor, SHA-256 ile hash'leniyor —
ama bu geçici bir önlem. Kesin pseudonymization şeması (HMAC anahtarı vb.)
Güvenlik stajyerinin S2.3 çıktısına göre netleşince burası güncellenecek.
"""

from __future__ import annotations

import hashlib
import time
from dataclasses import dataclass, field
from datetime import datetime

import instaloader

MIN_DELAY_SECONDS = 12  # istekler arası min. bekleme (10-15 sn aralığının ortası)
MAX_REQUESTS_PER_RUN = 40  # bir toplama döngüsü başına üst sınır (30-50 aralığı)


class RateLimitExceeded(Exception):
    """Bir çalıştırma için izin verilen istek sayısı aşıldığında fırlatılır."""


class BlockSignalDetected(Exception):
    """Instagram'dan captcha/blok/beklenmedik login isteği gibi bir sinyal geldiğinde
    fırlatılır — kurallar dokümanı gereği iş burada TAMAMEN durur, tekrar denenmez."""


@dataclass
class _RateLimiter:
    """İstekler arası bekleme + çalıştırma başı üst sınırı uygular."""

    min_delay: float = MIN_DELAY_SECONDS
    max_requests: int = MAX_REQUESTS_PER_RUN
    _request_count: int = field(default=0, init=False)
    _last_request_at: float | None = field(default=None, init=False)

    def before_request(self) -> None:
        if self._request_count >= self.max_requests:
            raise RateLimitExceeded(
                f"Bu çalıştırma için üst sınıra ulaşıldı ({self.max_requests} istek). "
                "Kurallar dokümanına göre iş burada durmalı."
            )
        if self._last_request_at is not None:
            elapsed = time.monotonic() - self._last_request_at
            wait = self.min_delay - elapsed
            if wait > 0:
                time.sleep(wait)
        self._last_request_at = time.monotonic()
        self._request_count += 1


def _hash_username(username: str) -> str:
    """GEÇİCİ önlem — Güvenlik'in S2.3 pseudonymization şeması netleşince değişecek."""
    return hashlib.sha256(username.encode("utf-8")).hexdigest()


def _new_loader() -> instaloader.Instaloader:
    """Login'siz, medya indirmeyen bir Instaloader örneği (kurallar dokümanı Bölüm 3)."""
    return instaloader.Instaloader(
        download_pictures=False,
        download_videos=False,
        download_video_thumbnails=False,
        download_geotags=False,
        download_comments=False,  # yorumları kendimiz, hız sınırlı şekilde çekeceğiz
        save_metadata=False,
        compress_json=False,
        quiet=True,
    )


def fetch_profile(username: str, limiter: _RateLimiter | None = None) -> dict:
    """
    Herkese açık bir profilin toplulaştırılmış istatistiklerini döner.
    Kurallar dokümanı gereği profil fotoğrafı/DM/hassas veri çekilmez.
    """
    limiter = limiter or _RateLimiter()
    loader = _new_loader()

    limiter.before_request()
    try:
        profile = instaloader.Profile.from_username(loader.context, username)
    except (instaloader.exceptions.ConnectionException,
            instaloader.exceptions.LoginRequiredException) as exc:
        raise BlockSignalDetected(f"Instagram erişim sinyali: {exc}") from exc

    return {
        "subject_type": "profile",
        "username_hash": _hash_username(profile.username),
        "followers_count": profile.followers,
        "posts_count": profile.mediacount,
        "fetched_at": datetime.utcnow().isoformat(),
    }


def fetch_posts(username: str, limit: int = 10, limiter: _RateLimiter | None = None) -> list[dict]:
    """Bir profilin son gönderilerinin metadata'sını döner (medya indirilmez)."""
    limiter = limiter or _RateLimiter()
    loader = _new_loader()

    limiter.before_request()
    try:
        profile = instaloader.Profile.from_username(loader.context, username)
    except (instaloader.exceptions.ConnectionException,
            instaloader.exceptions.LoginRequiredException) as exc:
        raise BlockSignalDetected(f"Instagram erişim sinyali: {exc}") from exc

    posts = []
    for post in profile.get_posts():
        if len(posts) >= limit:
            break
        limiter.before_request()
        posts.append({
            "subject_type": "post",
            "post_id": post.shortcode,
            "posted_at": post.date_utc.isoformat(),
            "likes_count": post.likes,
            "comments_count": post.comments,
            "content_type": "video" if post.is_video else "image",
        })
    return posts


def fetch_comments(post_shortcode: str, limit: int = 50, limiter: _RateLimiter | None = None) -> list[dict]:
    """Bir gönderinin yorumlarını döner. Yorum yazarı hash'lenir, ham tutulmaz."""
    limiter = limiter or _RateLimiter()
    loader = _new_loader()

    limiter.before_request()
    try:
        post = instaloader.Post.from_shortcode(loader.context, post_shortcode)
    except (instaloader.exceptions.ConnectionException,
            instaloader.exceptions.LoginRequiredException) as exc:
        raise BlockSignalDetected(f"Instagram erişim sinyali: {exc}") from exc

    comments = []
    for comment in post.get_comments():
        if len(comments) >= limit:
            break
        limiter.before_request()
        comments.append({
            "subject_type": "comment",
            "post_id": post_shortcode,
            "comment_id": str(comment.id),
            "author_hash": _hash_username(comment.owner.username),
            "text": comment.text,
            "commented_at": comment.created_at_utc.isoformat(),
        })
    return comments


if __name__ == "__main__":
    # Manuel/tekil test için — kurallar dokümanı onaylanmadan ÇALIŞTIRMA.
    import sys

    if len(sys.argv) < 2:
        print("Kullanım: python -m ai.scraper <test_kullanici_adi>")
        sys.exit(1)

    test_username = sys.argv[1]
    shared_limiter = _RateLimiter()

    print(f"[1/3] Profil çekiliyor: {test_username}")
    print(fetch_profile(test_username, shared_limiter))

    print("[2/3] Son 3 gönderi çekiliyor")
    posts = fetch_posts(test_username, limit=3, limiter=shared_limiter)
    for p in posts:
        print(p)

    if posts:
        print("[3/3] İlk gönderinin yorumları çekiliyor")
        first_comments = fetch_comments(posts[0]["post_id"], limit=10, limiter=shared_limiter)
        for c in first_comments:
            print(c)