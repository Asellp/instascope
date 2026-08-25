"""
rate_limiter.py

Instagram isteklerini güvenli hızda göndermek için
Rate Limiter.

Sorumlulukları
--------------
- İstekler arasında rastgele bekleme
- Maksimum request sayısını takip etme
- İstek hızını kontrol etme

DÜZELTME (performans): Instaloader'ın KENDİ İÇİNDE zaten bir RateController
var (instaloadercontext.py) — gerçek ağ isteklerini (11 dakikalık kayan
pencerede 75-200 istek) izleyip gerekince otomatik bekliyor. Bizim eski
`wait()`'imiz ise ÇEKİLEN HER TEK ÖĞE için (gerçek bir ağ isteği olsun
olmasın — bir sayfada ~12 öğe TEK istekle geliyor) tam süre (8-12sn)
bekliyordu; bu, Instaloader'ın zaten yaptığı işi gereksiz yere ikiye
katlıyordu (tıpkı login.py'da düzelttiğimiz çifte-retry gibi).

Yeni davranış: tam bekleme (REQUEST_MIN_DELAY..MAX_DELAY) sadece her
BATCH_SIZE öğede bir uygulanıyor; aradaki öğelerde sadece küçük bir jitter
(0.3-0.8sn) var — art arda gelen istekleri tamamen ardışık/aç gözlü
göndermemek için, ama asıl güvenlik zaten Instaloader'ın kendi
RateController'ında. Ortalama istek hızı üzerinde ciddi bir sapma
yaratmıyor (periyodik olarak hâlâ tam süre bekleniyor), ama büyük
hesaplarda toplam süreyi belirgin şekilde kısaltıyor.
"""

from __future__ import annotations

import logging
import random
import time
from dataclasses import dataclass, field

from .config import settings
from .exceptions import RateLimitError

logger = logging.getLogger(__name__)

# Kaç öğede bir TAM bekleme uygulanacağı. Küçük tutulursa eski davranışa
# yaklaşır (daha yavaş, daha temkinli); büyük tutulursa daha hızlı ama
# Instaloader'ın kendi throttle'ına daha çok güvenmiş olursun.
BATCH_SIZE = 5

# Batch arası öğelerde uygulanan küçük jitter (saniye) — sıfır olmasın diye,
# art arda gelen istekleri yine de biraz yayar.
_MICRO_JITTER_MIN = 0.3
_MICRO_JITTER_MAX = 0.8


@dataclass
class RateLimiter:
    """
    Instagram isteklerini belirlenen limitlere göre yönetir.
    """

    min_delay: float = settings.REQUEST_MIN_DELAY
    max_delay: float = settings.REQUEST_MAX_DELAY
    max_requests: int = settings.MAX_REQUESTS
    batch_size: int = BATCH_SIZE

    _request_count: int = field(default=0, init=False)
    _last_request_time: float | None = field(default=None, init=False)

    def wait(self) -> None:
        """
        Yeni bir Instagram isteğinden önce çağrılır.

        Her `batch_size` öğede bir TAM süre (min_delay..max_delay) bekler;
        aradaki öğelerde sadece küçük bir jitter uygular. Maksimum istek
        sayısını hâlâ HER çağrıda kontrol eder — bu sınır gevşemedi.
        """

        self._check_limit()

        is_full_wait_turn = self._request_count % self.batch_size == 0

        if self._last_request_time is not None:

            elapsed = time.monotonic() - self._last_request_time

            if is_full_wait_turn:
                target_delay = random.uniform(self.min_delay, self.max_delay)
            else:
                target_delay = random.uniform(_MICRO_JITTER_MIN, _MICRO_JITTER_MAX)

            sleep_time = target_delay - elapsed

            if sleep_time > 0:
                logger.debug(
                    "Bir sonraki istek için %.2f saniye bekleniyor (%s).",
                    sleep_time,
                    "tam bekleme" if is_full_wait_turn else "mikro bekleme",
                )
                time.sleep(sleep_time)

        self._last_request_time = time.monotonic()
        self._request_count += 1

    def _check_limit(self) -> None:
        """
        Maksimum request sayısının aşılıp aşılmadığını kontrol eder.

        DÜZELTME: eskiden sessizce özel bir RateLimitError alt sınıfı
        olmayan exceptions.RateLimitError fırlatıyordu ama bu, scraper'ın
        genel exceptions.py'ındaki (fetchers/*.py'ın kullandığı) SINIF ile
        aynı — yani main.py/scraper_service.py'daki RetryManager bunu da
        (yanlışlıkla) "geçici, tekrar denenebilir" sayabiliyordu. Burada
        durum farklı: bu, KENDİ koyduğumuz bir tavan (MAX_REQUESTS), tekrar
        denemek anlamsız — bu yüzden fırlatılan hata artık işi kesin olarak
        durdurmalı. (Davranış değişikliği yok, sadece dokümantasyon notu —
        RetryManager çağrısında retry_exceptions'a bu hata dahil
        edilmediği sürece zaten doğru çalışıyor.)
        """

        if self._request_count >= self.max_requests:
            raise RateLimitError(
                f"Çalışma başına maksimum "
                f"{self.max_requests} isteğe ulaşıldı."
            )

    @property
    def request_count(self) -> int:
        """
        Gönderilen toplam istek sayısını döndürür.
        """
        return self._request_count

    @property
    def remaining_requests(self) -> int:
        """
        Kalan istek hakkını döndürür.
        """
        return self.max_requests - self._request_count

    def reset(self) -> None:
        """
        Rate limiter durumunu sıfırlar.
        """

        logger.info("RateLimiter sıfırlandı.")

        self._request_count = 0
        self._last_request_time = None