"""
_instaloader_patches.py

Instaloader'ın resmi paketinde HENÜZ birleştirilmemiş (açık PR:
github.com/instaloader/instaloader/pull/2692, gridikono'nun
fix/comments-graphql-fallback dalı), ama kaynağını doğrudan GitHub'dan
okuyup doğruladığımız bir düzeltmeyi runtime'da uyguluyor.

Sorun (issue #2635): bir postun gerçek yorum sayısı 12'yi (NodeIterator'ın
sayfa uzunluğu) geçince, Post.get_comments() DOĞRUDAN Instagram'ın şu an
istikrarsız olan iPhone-endpoint fallback'ine gidiyor, "something went
wrong" hatası veriyor.

PR #2692'nin düzeltmesi: sıralamayı TERSİNE çeviriyor — önce her zaman
güvenilir GraphQL yolu deneniyor, SADECE o başarısız olursa (ConnectionException/
QueryReturnedBadRequestException/QueryReturnedForbiddenException) iPhone
endpoint'e düşülüyor.

NEDEN "pip install git+..." yerine burada, kendi kodumuzda:
  1. Resmi olmayan bir git dalına bağımlı kalmıyoruz — o dal silinse/
     değişse bile bizim kodumuz sabit kalır.
  2. Takım arkadaşları/backend `pip install -e .` yaptığında bu düzeltme
     OTOMATİK gelir, ayrı bir git URL'i hatırlamalarına gerek kalmaz.
  3. Neyi neden yamaladığımız KENDİ git geçmişimizde belgeli.

Instaloader resmi olarak bu düzeltmeyi birleştirip yeni bir sürüm
yayınladığında (bkz. PR #2692'nin durumu), bu dosya ve onu import eden
satır SİLİNMELİ — artık gereksiz olacak.
"""

from __future__ import annotations

from datetime import datetime
from typing import Iterable

from instaloader.exceptions import (
    ConnectionException,
    LoginRequiredException,
    QueryReturnedBadRequestException,
    QueryReturnedForbiddenException,
)
from instaloader.nodeiterator import NodeIterator
from instaloader.structures import Post, PostComment, PostCommentAnswer, Profile


def _patched_get_comments(self: Post) -> Iterable[PostComment]:
    """Post.get_comments()'in düzeltilmiş hali — bkz. modül docstring'i."""

    if not self._context.is_logged_in:
        raise LoginRequiredException("Login required to access comments of a post.")

    def _postcommentanswer(node):
        return PostCommentAnswer(
            id=int(node["id"]),
            created_at_utc=datetime.utcfromtimestamp(node["created_at"]),
            text=node["text"],
            owner=Profile(self._context, node["owner"]),
            likes_count=node.get("edge_liked_by", {}).get("count", 0),
        )

    def _postcommentanswers(node):
        if "edge_threaded_comments" not in node:
            return
        answer_count = node["edge_threaded_comments"]["count"]
        if answer_count == 0:
            return
        answer_edges = node["edge_threaded_comments"]["edges"]
        if answer_count == len(answer_edges):
            yield from (_postcommentanswer(c["node"]) for c in answer_edges)
            return
        yield from NodeIterator(
            self._context,
            "51fdd02b67508306ad4484ff574a0b62",
            lambda d: d["data"]["comment"]["edge_threaded_comments"],
            _postcommentanswer,
            {"comment_id": node["id"]},
            "https://www.instagram.com/p/{0}/".format(self.shortcode),
        )

    def _postcomment(node):
        return PostComment(context=self._context, node=node, answers=_postcommentanswers(node), post=self)

    if self.comments == 0:
        return []

    try:
        comment_edges = self._field("edge_media_to_parent_comment", "edges")
    except KeyError:
        comment_edges = self._field("edge_media_to_comment", "edges")

    answers_count = sum(
        edge["node"].get("edge_threaded_comments", {}).get("count", 0) for edge in comment_edges
    )

    if self.comments == len(comment_edges) + answers_count:
        return [_postcomment(c["node"]) for c in comment_edges]

    # DÜZELTME (PR #2692, issue #2635): önce GraphQL'i dene (güvenilir),
    # SADECE başarısız olursa iPhone endpoint'e düş. Eski davranış: yorum
    # sayısı 12'yi geçince DOĞRUDAN iPhone endpoint'e gidiyordu.
    try:
        return NodeIterator(
            self._context,
            "97b41c52301f77ce508f55e66d17620e",
            lambda d: d["data"]["shortcode_media"]["edge_media_to_parent_comment"],
            _postcomment,
            {"shortcode": self.shortcode},
            "https://www.instagram.com/p/{0}/".format(self.shortcode),
        )
    except (ConnectionException, QueryReturnedBadRequestException, QueryReturnedForbiddenException):
        return self._get_comments_via_iphone_endpoint()


# Modül import edildiği anda patch otomatik uygulanır — ayrı bir apply()
# çağrısına gerek yok, __init__.py'da bir kere import etmek yeterli.
Post.get_comments = _patched_get_comments