"""
mapper.py

Instaloader nesnelerini domain modellerine dönüştürür.
"""

from __future__ import annotations

import hashlib

import instaloader

from .models import (
    Comment,
    Post,
    ProfileSummary,
)


def _hash_username(username: str) -> str:
    """
    Kullanıcı adını anonim hale getirir.
    """

    return hashlib.sha256(
        username.encode("utf-8")
    ).hexdigest()


# Instaloader'ın typename'i (GraphImage/GraphVideo/GraphSidecar) ile
# backend'in ScrapeDataMapper/CollectorProcessor'ın beklediği
# IMAGE/VIDEO/CAROUSEL değerleri arasındaki eşleme. Backend tarafında
# CAROUSEL tespiti "CAROUSEL_ALBUM"/"CAROUSEL"/children/carousel_media_count
# gibi birkaç farklı sinyale bakıyordu (bkz. collector.processor.ts) — bizim
# tarafta tek, kesin bir sinyalimiz var: Instaloader'ın typename'i.
_MEDIA_TYPE_MAP = {
    "GraphImage": "IMAGE",
    "GraphVideo": "VIDEO",
    "GraphSidecar": "CAROUSEL",
}
_DEFAULT_MEDIA_TYPE = "IMAGE"


def _map_media_type(typename: str) -> str:
    """DÜZELTME: eskiden her gönderi bilinmeyen/varsayılan bir tipe
    düşüyordu (db.py'da hep 'IMAGE' yazılıyordu) — artık Instaloader'ın
    gerçek typename'inden doğru şekilde türetiliyor. Tanınmayan bir
    typename gelirse (Instagram yeni bir tip eklerse), varsayılana
    (IMAGE) düşüp servis çökmüyor."""
    return _MEDIA_TYPE_MAP.get(typename, _DEFAULT_MEDIA_TYPE)


# ---------------------------------------------------------
# Profile
# ---------------------------------------------------------

def profile_to_model(
    profile: instaloader.Profile,
) -> ProfileSummary:
    """
    Instaloader Profile -> ProfileSummary
    """

    return ProfileSummary(
        username=profile.username,
        full_name=profile.full_name,
        biography=profile.biography,
        followers=profile.followers,
        followees=profile.followees,
        posts_count=profile.mediacount,
        is_private=profile.is_private,
        is_verified=profile.is_verified,
    )


# ---------------------------------------------------------
# Post
# ---------------------------------------------------------

def post_to_model(
    post: instaloader.Post,
) -> Post:
    """
    Instaloader Post -> Post
    """

    return Post(
        post_id=str(post.mediaid),
        shortcode=post.shortcode,
        caption=post.caption,
        created_at=post.date_utc,
        likes=post.likes,
        comments_count=post.comments,
        media_type=_map_media_type(post.typename),
    )


# ---------------------------------------------------------
# Comment
# ---------------------------------------------------------

def comment_to_model(
    comment,
    post_id: str,
) -> Comment:
    """
    Instaloader Comment -> Comment
    """

    return Comment(
        post_id=post_id,
        comment_id=str(comment.id),
        author_hash=_hash_username(
            comment.owner.username
        ),
        text=comment.text,
        created_at=comment.created_at_utc,
    )