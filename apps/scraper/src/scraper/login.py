"""
login.py

Instagram oturum yönetimi.

Production akışı

1. Session dosyasını yükle.
2. Session geçerliyse giriş yapılmış loader döndür.
3. Session yoksa veya geçersizse hata ver.
4. Kod içerisinden kullanıcı adı/şifre ile login yapılmaz.
"""

from __future__ import annotations

import logging
from pathlib import Path

import instaloader

from .config import settings
from .exceptions import (
    AuthenticationError,
    InvalidSessionError,
)

logger = logging.getLogger(__name__)


def _create_loader() -> instaloader.Instaloader:
    """
    Ortak Instaloader ayarları.

    DÜZELTME: max_connection_attempts=1 eklendi. Instaloader'ın KENDİ İÇİNDE,
    bizim RetryManager'ımızdan tamamen habersiz bir retry döngüsü var
    (varsayılan 3 deneme, hatanın geçici mi kalıcı mı olduğuna bakmadan körü
    körüne tekrar ediyor). Bunu 1'e çekmek, Instaloader'ın ilk hatada hemen
    bize fırlatmasını sağlıyor — retry/backoff kontrolü TEK yerden
    (scraper_service.py'daki RetryManager + exceptions.py'daki
    RateLimitError/ScrapingBlockedError ayrımı) yönetiliyor.
    """

    return instaloader.Instaloader(
        download_pictures=False,
        download_videos=False,
        download_video_thumbnails=False,
        download_geotags=False,
        download_comments=False,
        save_metadata=False,
        compress_json=False,
        quiet=True,
        max_connection_attempts=1,
    )


class LoginManager:
    """
    Instagram session yöneticisi.

    DÜZELTME (rotasyon): artık isteğe bağlı bir `username` parametresi
    alıyor. Verilirse, o kullanıcı için `.instaloader-<username>` session
    dosyasını kullanır (ScraperService'in rotasyon mantığı bunu çağırır).
    Verilmezse (eski davranış, DEĞİŞMEDİ), settings.INSTAGRAM_USER +
    settings.INSTAGRAM_SESSION_FILE kullanılır — tek hesaplı, rotasyonsuz
    kurulumlar hiçbir şey değiştirmeden çalışmaya devam eder.
    """

    def __init__(self, username: str | None = None) -> None:

        if username:
            self.username = username
            self.session_file = Path(f".instaloader-{username}")
        else:
            self.username = settings.INSTAGRAM_USER
            self.session_file = settings.INSTAGRAM_SESSION_FILE

    def get_loader(self) -> instaloader.Instaloader:
        """
        Session yüklü Instaloader döndürür.
        """

        loader = _create_loader()

        self._load_session(loader)

        return loader

    def _load_session(
        self,
        loader: instaloader.Instaloader,
    ) -> None:

        if not self.username:

            raise AuthenticationError(
                "INSTAGRAM_USER tanımlı değil."
            )

        if not self.session_file.exists():

            raise InvalidSessionError(
                f"""
Session dosyası bulunamadı:

{self.session_file}

Önce terminalden aşağıdaki komutu çalıştır:

instaloader --login={self.username} --sessionfile={self.session_file}

Instagram doğrulamasını tamamladıktan sonra
aynı komutu tekrar çalıştır.
"""
            )

        try:

            logger.info(
                "Session yükleniyor... (@%s)",
                self.username,
            )

            loader.load_session_from_file(
                self.username,
                str(self.session_file),
            )

            logger.info(
                "Session başarıyla yüklendi. (@%s)",
                self.username,
            )

        except Exception as exc:

            raise InvalidSessionError(
                f"""
Session yüklenemedi. (@{self.username})

Muhtemelen süresi dolmuş veya geçersiz.

Silip tekrar oluştur:

rm {self.session_file}

instaloader --login={self.username} --sessionfile={self.session_file}

Hata:
{exc}
"""
            ) from exc