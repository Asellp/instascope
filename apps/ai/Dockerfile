FROM python:3.11-slim

RUN groupadd -r appuser && useradd -r -g appuser appuser

RUN apt-get update && apt-get upgrade -y && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    perl \
    perl-base \
    perl-modules \
    libarchive-tar-perl \
    patch \
    passwd \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/uv

COPY pyproject.toml uv.lock README.md ./
COPY src/ ./src/

# Kilit dosyası artık güvenli sürümleri içerdiği için doğrudan sync edebiliriz
RUN uv sync --frozen --no-cache

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

USER appuser

CMD ["uv", "run", "uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]