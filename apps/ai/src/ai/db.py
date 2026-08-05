"""
analysis_results tablosuna doğrudan yazım — connection pool ile.

Her istekte sıfırdan psycopg.connect() açmak yerine,
uygulama başlarken bir kez kurulan bir ConnectionPool kullanılıyor.
Pool, main.py'nin lifespan'ında açılıp (init_pool) kapatılıyor (close_pool).

Mimari karar: AI servisi
aynı Postgres'e doğrudan yazıyor, Backend'in ayrı bir "kaydet" endpoint'i yok.

"""

from __future__ import annotations

import os
from dotenv import load_dotenv

from psycopg.types.json import Json
from psycopg_pool import ConnectionPool

from .schemas import AnalysisResultRow

load_dotenv()

DATABASE_URL_ENV = "DATABASE_URL"

_pool: ConnectionPool | None = None


def _get_database_url() -> str:
    url = os.environ.get(DATABASE_URL_ENV)
    if not url:
        raise RuntimeError(
            f"{DATABASE_URL_ENV} ortam değişkeni ayarlı değil. "
            "Backend ile aynı Postgres'e bağlanmak için gerekli."
        )
    return url


def init_pool(min_size: int = 1, max_size: int = 5) -> ConnectionPool:
    """Uygulama başlarken BİR KEZ çağrılır."""
    global _pool
    if _pool is None:
        _pool = ConnectionPool(
            conninfo=_get_database_url(),
            min_size=min_size,
            max_size=max_size,
            open=True,
        )
    return _pool


def close_pool() -> None:
    """Uygulama kapanırken çağrılır."""
    global _pool
    if _pool is not None:
        _pool.close()
        _pool = None


def _get_pool() -> ConnectionPool:
    if _pool is None:
        raise RuntimeError(
            "DB pool henüz başlatılmadı — init_pool() app lifespan'ında çağrılmalı."
        )
    return _pool


def write_analysis_results(rows: list[AnalysisResultRow]) -> int:
    """
    analysis_results tablosuna toplu insert. id ve created_at DB'de otomatik
    üretiliyor (@default), burada gönderilmiyor. Yazılan satır sayısını döner.
    """
    if not rows:
        return 0

    query = """
        INSERT INTO analysis_results (subject_type, subject_id, kind, payload, model_version)
        VALUES (%s, %s, %s, %s, %s)
    """
    values = [
        (r.subject_type, r.subject_id, r.kind, Json(r.payload.model_dump()), r.model_version)
        for r in rows
    ]

    pool = _get_pool()
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.executemany(query, values)
        conn.commit()

    return len(rows)