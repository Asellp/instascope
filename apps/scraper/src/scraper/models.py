"""
models.py

Scraper modülünün domain modelleri.

Bu modeller Instaloader'a bağımlı değildir.
Scraper, AI analizi ve API katmanı arasında ortak veri yapıları
olarak kullanılır.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any


# ---------------------------------------------------------
# Comment
# ---------------------------------------------------------

@dataclass(slots=True, frozen=True)
class Comment:
    """
    Tek bir Instagram yorumu.
    """

    post_id: str
    comment_id: str
    author_hash: str
    text: str
    created_at: datetime

    def to_dict(self) -> dict[str, Any]:
        return {
            "subject_type": "comment",
            "post_id": self.post_id,
            "comment_id": self.comment_id,
            "author_hash": self.author_hash,
            "text": self.text,
            "created_at": self.created_at.isoformat(),
        }


# ---------------------------------------------------------
# Post
# ---------------------------------------------------------

@dataclass(slots=True)
class Post:
    """
    Instagram gönderisi.
    """

    post_id: str
    shortcode: str
    caption: str | None
    created_at: datetime
    likes: int
    comments_count: int
    media_type: str
    """"IMAGE" | "VIDEO" | "CAROUSEL" — backend'in Post.type / ScrapeDataMapper'ın
    beklediği değerlerle (bkz. mapper.py:_map_media_type) tutarlı tutuluyor."""

    comments: list[Comment] = field(default_factory=list)

    def add_comment(self, comment: Comment) -> None:
        """
        Gönderiye yorum ekler.
        """
        self.comments.append(comment)

    @property
    def comment_count(self) -> int:
        """
        Bellekte bulunan yorum sayısı.
        """
        return len(self.comments)

    def to_dict(self) -> dict[str, Any]:
        return {
            "post_id": self.post_id,
            "shortcode": self.shortcode,
            "type": self.media_type,
            "caption": self.caption,
            "created_at": self.created_at.isoformat(),
            "likes": self.likes,
            "comments_count": self.comments_count,
            "comments": [
                comment.to_dict()
                for comment in self.comments
            ],
        }


# ---------------------------------------------------------
# Profile
# ---------------------------------------------------------

@dataclass(slots=True, frozen=True)
class ProfileSummary:
    """
    Hedef Instagram hesabının özet bilgileri.
    """

    username: str
    full_name: str | None
    biography: str |None
    followers: int
    followees: int
    posts_count: int
    is_private: bool
    is_verified: bool

    scraped_at: datetime = field(
        default_factory=datetime.utcnow
    )

    def to_dict(self) -> dict[str, Any]:
        return {
            "username": self.username,
            "full_name": self.full_name,
            "biography": self.biography,
            "followers": self.followers,
            "followees": self.followees,
            "posts_count": self.posts_count,
            "is_private": self.is_private,
            "is_verified": self.is_verified,
            "scraped_at": self.scraped_at.isoformat(),
        }


# ---------------------------------------------------------
# Scraping Result
# ---------------------------------------------------------

@dataclass(slots=True)
class ScrapeResult:
    """
    Bir scraping işleminin tamamını temsil eder.
    """

    profile: ProfileSummary
    posts: list[Post]
    comments: list[Comment]

    scraped_at: datetime = field(
        default_factory=datetime.utcnow
    )

    @property
    def total_posts(self) -> int:
        """
        Toplam çekilen gönderi sayısı.
        """
        return len(self.posts)

    @property
    def total_comments(self) -> int:
        """
        Toplam çekilen yorum sayısı.
        """
        return len(self.comments)

    def to_dict(self) -> dict[str, Any]:
        return {
            "profile": self.profile.to_dict(),
            "posts": [
                post.to_dict()
                for post in self.posts
            ],
            "comments": [
                comment.to_dict()
                for comment in self.comments
            ],
            "scraped_at": self.scraped_at.isoformat(),
            "total_posts": self.total_posts,
            "total_comments": self.total_comments,
        }