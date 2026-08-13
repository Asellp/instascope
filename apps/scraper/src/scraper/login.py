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
    RateLimitError/ScrapingBlockedError ayrımı) yönetiliyor. Aksi halde
    "Instaloader'ın 3 denemesi × bizim 3 denemesi" = flag'lenmiş bir uca
    gereksiz yere 9 kere vurmuş oluyorduk.
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
    """

    def __init__(self) -> None:

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
                "Session yükleniyor..."
            )

            loader.load_session_from_file(
                self.username,
                str(self.session_file),
            )

            logger.info(
                "Session başarıyla yüklendi."
            )

        except Exception as exc:

            raise InvalidSessionError(
                f"""
Session yüklenemedi.

Muhtemelen süresi dolmuş veya geçersiz.

Silip tekrar oluştur:

rm {self.session_file}

instaloader --login={self.username} --sessionfile={self.session_file}

Hata:
{exc}
"""
            ) from exc