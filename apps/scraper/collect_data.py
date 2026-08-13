"""
collect_pool.py

Birden fazla hesaptan SIRAYLA veri çekip TEK bir JSON dosyasında biriktirir
— apps/ai/data/mock_comments.json'a benzer, ama GERÇEK veri. Backend'e/DB'ye
HİÇ dokunmaz, production akışından (service.py) tamamen ayrı — sadece AI
modellerini (topic/sentiment/likes_baseline) gerçek veriyle test etmek için.

Kullanım (apps/scraper kökünden, venv aktifken):
    python collect_data.py sercankahvci hesap2

    # Başka bir gün/oturumda devam:
    python collect_data.py hesap3 hesap4 hesap5

DÜZELTME: script artık dosyanın ÜZERİNE YAZMIYOR — varsa mevcut havuzu
yükleyip ÜZERİNE EKLİYOR. Bu, 5 hesabı tek seferde art arda çekmek yerine,
birkaç güne/oturuma yayarak (her seferinde 1-2 hesap) toplamana izin
veriyor — tek bir uzun çalıştırmadan daha güvenli. Aynı kullanıcı adı
havuzda zaten varsa, o hesap TEKRAR çekilmez, atlanır.
"""

from __future__ import annotations

import json
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

from src.scraper.scraper_service import ScraperService

OUTPUT_PATH = Path(__file__).parent / "data" / "real_data_pool.json"
DELAY_BETWEEN_ACCOUNTS_SECONDS = 60


def _load_existing_accounts() -> list[dict]:
    if not OUTPUT_PATH.exists():
        return []
    with open(OUTPUT_PATH, encoding="utf-8") as f:
        payload = json.load(f)
    return payload.get("accounts", [])


def collect(
    usernames: list[str],
    max_posts: int = 15,
    max_comments: int = 70,
    comments_per_post: int = 15,
) -> None:
    existing_accounts = _load_existing_accounts()
    existing_usernames = {a["profile"]["username"] for a in existing_accounts}

    if existing_accounts:
        print(f"Mevcut havuzda {len(existing_accounts)} hesap var, üzerine EKLENECEK (üzerine yazılmayacak).")

    service = ScraperService()
    new_results = []

    to_fetch = [u for u in usernames if u not in existing_usernames]
    already_have = [u for u in usernames if u in existing_usernames]
    if already_have:
        print(f"Zaten havuzda olan, tekrar ÇEKİLMEYECEK: {', '.join(already_have)}")

    for i, username in enumerate(to_fetch):
        print(f"[{i + 1}/{len(to_fetch)}] @{username} çekiliyor...")

        try:
            result = service.scrape(
                username,
                max_posts=max_posts,
                max_comments=max_comments,
                comments_per_post=comments_per_post,
            )
            new_results.append(result.to_dict())
            print(f"  -> {result.total_posts} post, {result.total_comments} yorum")

        except Exception as exc:
            print(f"  -> HATA, bu hesap atlanıyor: {exc}")

        service.rate_limiter.reset()

        if i < len(to_fetch) - 1:
            print(f"  {DELAY_BETWEEN_ACCOUNTS_SECONDS} sn bekleniyor (hesaplar arası)...")
            time.sleep(DELAY_BETWEEN_ACCOUNTS_SECONDS)

    all_accounts = existing_accounts + new_results

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "collected_at": datetime.now(timezone.utc).isoformat(),
        "accounts": all_accounts,
    }
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)

    total_posts = sum(a["total_posts"] for a in all_accounts)
    total_comments = sum(a["total_comments"] for a in all_accounts)

    print(f"\nKaydedildi: {OUTPUT_PATH}")
    print(f"Havuzdaki TOPLAM hesap: {len(all_accounts)}")
    print(f"Havuzdaki TOPLAM post: {total_posts}")
    print(f"Havuzdaki TOPLAM yorum: {total_comments}")


if __name__ == "__main__":
    usernames = sys.argv[1:]
    if not usernames:
        print("Kullanım: python collect_pool.py hesap1 hesap2 ...")
        sys.exit(1)
    collect(usernames)