"""
service.py

Scraper'ı bir HTTP servisi olarak dışa açar. DB'ye HİÇ DOKUNMUYOR —
backend'in CollectorProcessor'ı, ScrapeDataMapper.mapToNormalized() ile
kendi Prisma upsert'ini yapıyor (bkz. sourceTypeKey === 'scrape' dalı).
Bizim tek işimiz: Instagram'dan veri çekip, backend'in anladığı ham
JSON şeklinde döndürmek.

Sözleşme (backend'deki Zeynep/Asellp ile konuşulan):
  POST /internal/scrape-posts
  Request:  {"platform": "<ig_username>", "maxPosts": ..., "maxComments": ...,
             "commentsPerPost": ..., "since": ...}
  Response: {"source": "scrape", "type": "posts", "data": [ <rawData ...> ]}

  POST /internal/scrape-profile
  Request:  {"platform": "<ig_username>"}
  Response: {"source": "scrape", "type": "profile",
             "data": {"username": ..., "followersCount": ..., "followingCount": ..., "mediaCount": ...}}

  Her <rawData> öğesi, ScrapeDataMapper.mapToNormalized()'ın TERCİH ETTİĞİ
  (ilk denediği) alan adlarıyla dolduruluyor:
    mediaId, postType, text, createdAt, url,
    likesCount, commentsCount, viewsCount,
    comments: [{author, body, date}, ...]

DÜZELTME (bulgu — /internal/scrape-profile gereksiz ağır taramaya sebep
oluyordu): eskiden bu uç, ScraperService.scrape() (TAM post+yorum taraması)
çağırıyordu — sadece takipçi sayısı için, tüm postları/yorumları da
(varsayılan ayarlarla) gereksiz yere çekiyordu, sonra result.profile
dışındaki her şeyi çöpe atıyordu. Bu, her hesap işlenirken Instagram'a
İKİ KAT gereksiz yük biniyordu (bir profil için, bir de gerçek
/scrape-posts için) — büyük hesaplarda RateLimitError'ların bu kadar hızlı
çıkmasının asıl sebeplerinden biri muhtemelen buydu. Artık
ScraperService.get_profile() (sadece TEK hafif istek, post/yorum taraması
YOK) kullanılıyor.
"""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from .config import settings
from .exceptions import (
    PrivateAccountError,
    ProfileNotFoundError,
    ScraperError,
    ScrapingBlockedError,
)
from .models import Comment, Post, ScrapeResult
from .scraper_service import ScraperService

app = FastAPI(title="InstaScope Scraper Service")

# sentiment_model.py/topic_model.py'daki singleton desenine benzer — servis
# boyunca TEK bir ScraperService (kendi cache/rate-limiter/retry'ıyla).
_scraper = ScraperService()


class ScrapePostsRequest(BaseModel):
    platform: str
    maxPosts: int | None = Field(default=None, ge=1, le=250)  # Sınır 250
    maxComments: int | None = Field(default=None, ge=0, le=500)
    commentsPerPost: int | None = Field(default=None, ge=0, le=100)
    since: str | None = None


class ScrapeProfileRequest(BaseModel):
    platform: str  # ig_username


def _parse_since(since_raw: str | None) -> datetime | None:
    """
    Backend'den gelen ISO 8601 string'i, Instaloader'ın post.date_utc'siyle
    (naive, UTC) karşılaştırılabilir bir datetime'a çevirir.
    """
    if not since_raw:
        return None

    parsed = datetime.fromisoformat(since_raw.replace("Z", "+00:00"))

    if parsed.tzinfo is not None:
        parsed = parsed.astimezone(timezone.utc).replace(tzinfo=None)

    return parsed


# ---------------------------------------------------------
# ScrapeDataMapper'ın beklediği ham JSON'a çeviri
# ---------------------------------------------------------

def _comment_to_raw(comment: Comment) -> dict:
    return {
        "author": comment.author_hash,
        "body": comment.text,
        "date": comment.created_at.isoformat(),
    }


def _post_to_raw(post: Post) -> dict:
    return {
        "mediaId": post.post_id,
        "postType": post.media_type,
        "text": post.caption,
        "imageUrl": getattr(post, "display_url", None),
        "createdAt": post.created_at.isoformat(),
        "url": f"https://instagram.com/p/{post.shortcode}",
        "likesCount": post.likes,
        "commentsCount": post.comments_count,
        "viewsCount": 0,  # Instaloader post nesnesinde ayrı bir view sayısı yok
        "comments": [_comment_to_raw(c) for c in post.comments],
    }


def _result_to_raw_response(result: ScrapeResult) -> dict:
    return {
        "source": "scrape",
        "type": "posts",
        "data": [_post_to_raw(post) for post in result.posts],
    }


def _handle_scrape_errors(exc: Exception):
    """Ortak hata -> HTTP status eşlemesi (posts/profile uçları için aynı)."""
    if isinstance(exc, (PrivateAccountError, ProfileNotFoundError)):
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    if isinstance(exc, ScrapingBlockedError):
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    if isinstance(exc, ScraperError):
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    raise exc


# ---------------------------------------------------------
# Uçlar
# ---------------------------------------------------------

@app.get("/health")
def health():
    return {"status": "ok", "service": "instascope-scraper"}


@app.post("/internal/scrape-posts")
def scrape_posts(payload: ScrapePostsRequest) -> dict:
    """
    Backend'in dataSourceFactory.getSource('scrape').fetchPosts(...) çağrısının
    ulaştığı uç. Hata durumunda HTTP status'e göre backend'in CollectionJob'u
    nasıl işaretleyeceği ayrışabilsin diye farklı kodlar dönülüyor:
      - 400: since alanı geçersiz formatta (ISO 8601 değil)
      - 422: hesap gizli / bulunamadı (kalıcı, tekrar denemenin anlamı yok)
      - 503: Instagram tarafından bloklandık (geçici, backend sonra tekrar
             deneyebilir)
      - 500: beklenmeyen hata
    """
    max_posts = payload.maxPosts if payload.maxPosts is not None else settings.MAX_POSTS
    max_comments = payload.maxComments if payload.maxComments is not None else settings.MAX_COMMENTS
    comments_per_post = (
        payload.commentsPerPost if payload.commentsPerPost is not None else settings.COMMENTS_PER_POST
    )

    try:
        since = _parse_since(payload.since)
    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=f"'since' alanı geçerli bir ISO 8601 tarih değil: {payload.since!r} ({exc})",
        ) from exc

    try:
        result = _scraper.scrape(
            payload.platform,
            max_posts=max_posts,
            max_comments=max_comments,
            comments_per_post=comments_per_post,
            since=since,
        )
    except Exception as exc:
        _handle_scrape_errors(exc)

    return _result_to_raw_response(result)


@app.post("/internal/scrape-profile")
def scrape_profile(payload: ScrapeProfileRequest) -> dict:
    """
    Backend'in dataSourceFactory.getSource('scrape').fetchProfile(...)
    çağrısının ulaştığı uç — collector.processor.ts bunu AccountMetric
    (followers/following) için çağırıyor.

    DÜZELTME: artık ScraperService.scrape() (tam post+yorum taraması)
    YERİNE, sadece profili çeken hafif get_profile() kullanılıyor —
    her hesap işlenirken Instagram'a gereksiz İKİNCİ bir tam tarama
    yapılmasının önüne geçildi.
    """
    try:
        profile = _scraper.get_profile(payload.platform)
    except Exception as exc:
        _handle_scrape_errors(exc)

    return {
        "source": "scrape",
        "type": "profile",
        "data": {
            "username": profile.username,
            "followersCount": profile.followers,
            "followingCount": profile.followees,
            "mediaCount": profile.posts_count,
        },
    }