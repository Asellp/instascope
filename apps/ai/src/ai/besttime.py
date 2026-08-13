"""
A3.2 — En iyi paylaşım zamanı analizi (kind="besttime").

Backend ile sözleşme (kesinleşti):
  - dayOfWeek: ISO 8601 (1=Pazartesi ... 7=Pazar) — Python'ın
    datetime.isoweekday() metoduyla birebir örtüşüyor.
  - heatmap her zaman 7*24=168 hücrenin TAMAMINI döner. Veri olmayan
    hücrelerde sampleSize=0, avgEngagement=null.
  - insufficientData alanı YOK — eşik kararı (örn. sampleSize<3 ise
    "yetersiz veri" göster) Backend/Frontend tarafında.

Zaman dilimi sözleşmesi (Backend ile 2026-08-06'da teyit edildi):
  - posted_at, veritabanında ve API yanıtlarında her zaman UTC olarak
    saklanır/döner (ISO 8601, sonu "Z"). Yerel saat dilimine Backend
    tarafında ÇEVRİLMEZ.
  - UTC -> raporlama saat dilimi (Europe/Istanbul) dönüşümü bu modülün
    sorumluluğundadır. Aşağıda REPORTING_TZ ile yapılır.
  - Collector, Instagram'ın ham taken_at_timestamp değerini doğrudan
    UTC DateTime olarak postedAt kolonuna yazar; bu modüle giren
    PostEngagementInput.posted_at de bu nedenle UTC (tz-aware veya UTC
    kabul edilen naive) olarak kabul edilir.
"""

from __future__ import annotations

from collections import defaultdict
from datetime import timezone
from zoneinfo import ZoneInfo

from .schemas import BesttimeCell, BesttimePayload, PostEngagementInput

DAYS_IN_WEEK = 7  # ISO: 1-7
HOURS_IN_DAY = 24  # 0-23
REPORTING_TZ = ZoneInfo("Europe/Istanbul")


def build_besttime_heatmap(posts: list[PostEngagementInput]) -> BesttimePayload:
    """Gönderi listesinden 168 hücrelik (7 gün x 24 saat) ısı haritası üretir.

    posted_at UTC olarak kabul edilir ve hesaplamadan önce REPORTING_TZ'ye
    çevrilir (Backend sözleşmesi: veri her zaman UTC döner, dönüşüm burada
    yapılır).
    """
    buckets: dict[tuple[int, int], list[float]] = defaultdict(list)

    for post in posts:
        posted_at = post.posted_at
        if posted_at.tzinfo is None:
            # Naive datetime -> Backend sözleşmesine göre bu zaten UTC'dir.
            posted_at = posted_at.replace(tzinfo=timezone.utc)
        local_posted_at = posted_at.astimezone(REPORTING_TZ)

        day_of_week = local_posted_at.isoweekday()  # 1=Pazartesi ... 7=Pazar
        hour = local_posted_at.hour
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