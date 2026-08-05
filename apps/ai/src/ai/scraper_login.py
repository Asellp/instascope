from __future__ import annotations

import hashlib
import os
import random
import time
from dataclasses import dataclass, field
from datetime import datetime
from typing import List, Dict, Any

import instaloader
from dotenv import load_dotenv  

# .env dosyasındaki değişkenleri os.environ içerisine yükler
load_dotenv() 

# Güvenlik ve Hız Sınırları
MIN_DELAY_SECONDS = 10.0
MAX_DELAY_SECONDS = 16.0
MAX_REQUESTS_PER_RUN = 80


class RateLimitExceeded(Exception):
    """Bir çalıştırma için izin verilen istek sayısı aşıldığında fırlatılır."""


class BlockSignalDetected(Exception):
    """Instagram'dan captcha/blok/beklenmedik login isteği fırlatıldığında işlemi durdurur."""


@dataclass
class _RateLimiter:
    """İstekler arası dinamik bekleme + çalıştırma başı üst sınırı uygular."""

    min_delay: float = MIN_DELAY_SECONDS
    max_delay: float = MAX_DELAY_SECONDS
    max_requests: int = MAX_REQUESTS_PER_RUN
    _request_count: int = field(default=0, init=False)
    _last_request_at: float | None = field(default=None, init=False)

    def before_request(self) -> None:
        if self._request_count >= self.max_requests:
            raise RateLimitExceeded(
                f"Bu çalıştırma için güvenli istek sınırına ulaşıldı ({self.max_requests} istek). "
                "Ban riskini önlemek için işlem durduruldu."
            )
        if self._last_request_at is not None:
            elapsed = time.monotonic() - self._last_request_at
            required_wait = random.uniform(self.min_delay, self.max_delay)
            wait = required_wait - elapsed
            if wait > 0:
                time.sleep(wait)
        self._last_request_at = time.monotonic()
        self._request_count += 1


def _hash_username(username: str) -> str:
    return hashlib.sha256(username.encode("utf-8")).hexdigest()


def _get_authenticated_loader() -> instaloader.Instaloader:
    """
    Login'li Instaloader örneği oluşturur.
    .env dosyasından INSTAGRAM_USER, INSTAGRAM_PASSWORD ve INSTAGRAM_SESSION_FILE okur.
    """
    loader = instaloader.Instaloader(
        download_pictures=False,
        download_videos=False,
        download_video_thumbnails=False,
        download_geotags=False,
        download_comments=False,
        save_metadata=False,
        compress_json=False,
        quiet=True,
    )

    user = os.getenv("INSTAGRAM_USER", "").strip()
    password = os.getenv("INSTAGRAM_PASSWORD", "").strip()
    session_file = os.getenv("INSTAGRAM_SESSION_FILE", f".instaloader-{user}" if user else "").strip()

    # 1. Öncelik: Session dosyasından oturum yükleme
    if session_file and os.path.exists(session_file):
        try:
            loader.load_session_from_file(user, session_file)
            print(f"[+] Oturum '{session_file}' dosyasından başarıyla yüklendi.")
            return loader
        except Exception as exc:
            print(f"[-] Session dosyası okunamadı, doğrudan login deneniyor: {exc}")

    # 2. Öncelik: Kullanıcı adı ve şifre ile giriş
    if user and password:
        try:
            loader.login(user, password)
            target_session = session_file or f".instaloader-{user}"
            loader.save_session_to_file(target_session)
            print(f"[+] '{user}' hesabıyla başarıyla giriş yapıldı ve session kaydedildi.")
            return loader
        except instaloader.exceptions.TwoFactorAuthRequiredException:
            raise BlockSignalDetected("2FA uyarısı! Lütfen önce terminalden 'instaloader --login=USERNAME' ile session dosyası oluşturun.")
        except Exception as exc:
            raise BlockSignalDetected(f"Instagram Login Başarısız: {exc}") from exc

    raise BlockSignalDetected("Instagram giriş bilgileri okunamadı! .env dosyasında INSTAGRAM_USER ve INSTAGRAM_PASSWORD tanımlı olduğundan emin olun.")


def fetch_target_comments(username: str, total_target_comments: int = 300) -> List[Dict[str, Any]]:
    limiter = _RateLimiter()
    loader = _get_authenticated_loader()

    limiter.before_request()
    try:
        profile = instaloader.Profile.from_username(loader.context, username)
    except Exception as exc:
        raise BlockSignalDetected(f"Profil bilgisi çekilemedi: {exc}") from exc

    all_comments: List[Dict[str, Any]] = []
    comments_per_post_limit = 40 

    print(f"[+] Target profil: @{username} | Hedef Yorum Sayısı: {total_target_comments}")

    try:
        for post in profile.get_posts():
            if len(all_comments) >= total_target_comments:
                print(f"[!] Hedeflenen {total_target_comments} yorum sayısına ulaşıldı.")
                break

            limiter.before_request()
            print(f"  -> Post inceleniyor: {post.shortcode} (Mevcut Toplam Yorum: {len(all_comments)})")

            post_comment_count = 0
            for comment in post.get_comments():
                if len(all_comments) >= total_target_comments or post_comment_count >= comments_per_post_limit:
                    break
                
                limiter.before_request()
                all_comments.append({
                    "subject_type": "comment",
                    "post_id": post.shortcode,
                    "comment_id": str(comment.id),
                    "author_hash": _hash_username(comment.owner.username),
                    "text": comment.text,
                    "commented_at": comment.created_at_utc.isoformat(),
                })
                post_comment_count += 1

    except (instaloader.exceptions.ConnectionException, instaloader.exceptions.LoginRequiredException) as exc:
        raise BlockSignalDetected(f"Instagram Engeli/Sınırı Algılandı: {exc}") from exc
    except RateLimitExceeded as rle:
        print(f"[!] {rle} - Toplanan verilerle işlem devam ediyor.")

    return all_comments


if __name__ == "__main__":
    import sys
    import json

    if len(sys.argv) < 2:
        print("Kullanım: python scraper.py <hedef_kullanici_adi>")
        sys.exit(1)

    target_user = sys.argv[1]
    
    print(f"--- Scraping Başlatılıyor: @{target_user} ---")
    try:
        comments_data = fetch_target_comments(target_user, total_target_comments=300)
        
        output_file = f"real_comments_{target_user}.json"
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(comments_data, f, ensure_ascii=False, indent=2)
            
        print(f"\n[SUCCESS] Toplam {len(comments_data)} adet yorum çekildi ve '{output_file}' dosyasına kaydedildi!")
        
    except BlockSignalDetected as bsd:
        print(f"\n[BLOCK/ERROR] İşlem Güvenlik Nedeniyle Durduruldu: {bsd}")