"""
A3.2 — En iyi paylaşım zamanı analizi (kind="besttime").

Backend ile sözleşme (kesinleşti):
  - dayOfWeek: ISO 8601 (1=Pazartesi ... 7=Pazar) — Python'ın
    datetime.isoweekday() metoduyla birebir örtüşüyor.
  - heatmap her zaman 7*24=168 hücrenin TAMAMINI döner. Veri olmayan
    hücrelerde sampleSize=0, avgEngagement=null.
  - insufficientData alanı YOK — eşik kararı (örn. sampleSize<3 ise
    "yetersiz veri" göster) Backend/Frontend tarafında.

VARSAYIM (henüz Backend ile teyit edilmedi): posted_at'in zaten
raporlama için istenen saat diliminde geldiği varsayılıyor.
"""

from __future__ import annotations

from collections import defaultdict

from .schemas import BesttimeCell, BesttimePayload, PostEngagementInput

DAYS_IN_WEEK = 7  # ISO: 1-7
HOURS_IN_DAY = 24  # 0-23


def build_besttime_heatmap(posts: list[PostEngagementInput]) -> BesttimePayload:
    """Gönderi listesinden 168 hücrelik (7 gün x 24 saat) ısı haritası üretir."""
    buckets: dict[tuple[int, int], list[float]] = defaultdict(list)

    for post in posts:
        day_of_week = post.posted_at.isoweekday()  # 1=Pazartesi ... 7=Pazar
        hour = post.posted_at.hour
        buckets[(day_of_week, hour)].append(post.engagement_rate)

    heatmap: list[BesttimeCell] = []
    for day_of_week in range(1, DAYS_IN_WEEK + 1):
        for hour in range(HOURS_IN_DAY):
            values = buckets.get((day_of_week, hour), [])
            sample_size = len(values)
            avg_engagement = (sum(values) / sample_size) if sample_size > 0 else None
            heatmap.append(
                BesttimeCell(
                    dayOfWeek=day_of_week,
                    hour=hour,
                    avgEngagement=avg_engagement,
                    sampleSize=sample_size,
                )
            )

    return BesttimePayload(heatmap=heatmap)