"""
service.py

Scraper'ı bir HTTP servisi olarak dışa açar. DB'ye HİÇ DOKUNMUYOR —
backend'in CollectorProcessor'ı, ScrapeDataMapper.mapToNormalized() ile
kendi Prisma upsert'ini yapıyor (bkz. sourceTypeKey === 'scrape' dalı).
Bizim tek işimiz: Instagram'dan veri çekip, ScrapeDataMapper'ın anladığı
ham JSON şeklinde döndürmek.

Sözleşme:
  POST /internal/scrape-posts
  Request:  {"platform": "<ig_username>"}
  Response: {"source": "scrape", "type": "posts", "data": [ <rawData ...> ]}

  Her <rawData> öğesi, ScrapeDataMapper.mapToNormalized()'ın TERCİH ETTİĞİ
  (ilk denediği) alan adlarıyla dolduruluyor:
    mediaId, postType, text, createdAt, url,
    likesCount, commentsCount, viewsCount,
    comments: [{author, body, date}, ...]
"""

from __future__ import annotations

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

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
    platform: str  # ig_username — CollectorProcessor'ın gönderdiği alan adı


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
      - 422: hesap gizli / bulunamadı (kalıcı, tekrar denemenin anlamı yok)
      - 503: Instagram tarafından bloklandık (geçici, backend sonra tekrar
             deneyebilir)
      - 500: beklenmeyen hata
    """
    try:
        result = _scraper.scrape(payload.platform)

    except (PrivateAccountError, ProfileNotFoundError) as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    except ScrapingBlockedError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    except ScraperError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return _result_to_raw_response(result)