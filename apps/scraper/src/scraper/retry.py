"""
retry.py

Geçici hatalarda işlemleri otomatik olarak tekrar dener.

Özellikler
----------
- Exponential Backoff
- Rastgele jitter
- Loglama
- Maksimum deneme sayısı
"""

from __future__ import annotations

import logging
import random
import time
from collections.abc import Callable
from typing import Any, TypeVar

from .config import settings

logger = logging.getLogger(__name__)

T = TypeVar("T")


class RetryManager:
    """
    Geçici hatalarda fonksiyonu tekrar çalıştırır.
    """

    def __init__(
        self,
        max_attempts: int = settings.RETRY_COUNT,
        backoff_factor: float = settings.RETRY_BACKOFF,
    ) -> None:

        self.max_attempts = max_attempts
        self.backoff_factor = backoff_factor

    def execute(
        self,
        func: Callable[..., T],
        *args: Any,
        retry_exceptions: tuple[type[Exception], ...] = (Exception,),
        **kwargs: Any,
    ) -> T:
        """
        Verilen fonksiyonu retry mekanizmasıyla çalıştırır.
        """

        last_exception: Exception | None = None

        for attempt in range(1, self.max_attempts + 1):

            try:
                return func(*args, **kwargs)

            except retry_exceptions as exc:

                last_exception = exc

                if attempt == self.max_attempts:
                    break

                delay = (
                    self.backoff_factor ** attempt
                    + random.uniform(0.0, 1.0)
                )

                logger.warning(
                    "Retry %d/%d (%s). %.2f saniye bekleniyor.",
                    attempt,
                    self.max_attempts,
                    type(exc).__name__,
                    delay,
                )

                time.sleep(delay)

        assert last_exception is not None

        logger.error(
            "Maksimum retry sayısına ulaşıldı."
        )

        raise last_exception