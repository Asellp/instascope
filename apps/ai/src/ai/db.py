"""
analysis_results tablosuna doğrudan yazım — connection pool ile.

Her istekte sıfırdan psycopg.connect() açmak yerine,
uygulama başlarken bir kez kurulan bir ConnectionPool kullanılıyor.
Pool, main.py'nin lifespan'ında açılıp (init_pool) kapatılıyor (close_pool).

Mimari karar: AI servisi
aynı Postgres'e doğrudan yazıyor, Backend'in ayrı bir "kaydet" endpoint'i yok.

"""

from __future__ import annotations
import uuid
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
    if not rows:
        return 0

    pool = _get_pool()
    with pool.connection() as conn:
        with conn.cursor() as cur:
            # 1. Önce bu batch'te gelen yorum/hesap ID'lerine ve kind'a ait eski kayıtları sil
            for r in rows:
                cur.execute(
                    """
                    DELETE FROM analysis_results 
                    WHERE subject_id = %s AND kind = %s
                    """,
                    (r.subject_id, r.kind)
                )

            # 2. Ardından yeni sonuçları ekle
            insert_query = """
                INSERT INTO analysis_results (id, subject_type, subject_id, kind, payload, model_version)
                VALUES (%s, %s, %s, %s, %s, %s)
            """
            values = [
                (
                    str(uuid.uuid4()),
                    r.subject_type,
                    r.subject_id,
                    r.kind,
                    Json(r.payload.model_dump()),
                    r.model_version,
                )
                for r in rows
            ]
            cur.executemany(insert_query, values)
        conn.commit()

    return len(rows)