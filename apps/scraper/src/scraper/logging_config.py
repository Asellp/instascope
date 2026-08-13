"""
logging_config.py

Scraper modülü için merkezi logging yapılandırması.
"""

from __future__ import annotations

import logging
from logging.handlers import RotatingFileHandler
from pathlib import Path

from .config import settings


def configure_logging() -> None:
    """
    Uygulamanın logging yapılandırmasını yapar.

    - Konsola log yazar.
    - Dosyaya log yazar.
    - Log klasörü yoksa oluşturur.
    """

    log_file = Path(settings.LOG_FILE)

    log_file.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    formatter = logging.Formatter(
        fmt=(
            "%(asctime)s | "
            "%(levelname)-8s | "
            "%(name)s | "
            "%(message)s"
        ),
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    console_handler = logging.StreamHandler()
    console_handler.setFormatter(formatter)

    file_handler = RotatingFileHandler(
        filename=log_file,
        maxBytes=5 * 1024 * 1024,   # 5 MB
        backupCount=5,
        encoding="utf-8",
    )
    file_handler.setFormatter(formatter)

    logging.basicConfig(
        level=getattr(
            logging,
            settings.LOG_LEVEL.upper(),
            logging.INFO,
        ),
        handlers=[
            console_handler,
            file_handler,
        ],
        force=True,
    )