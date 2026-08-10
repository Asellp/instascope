FROM python:3.11-slim

# Güvenlik için non-root kullanıcı oluşturma
RUN groupadd -r appuser && useradd -r -g appuser appuser

# 1. Sistem paketlerini güncelle (Trivy zafiyetlerini kapatır)
# 2. HEALTHCHECK için curl ve derleme için build-essential yükle
RUN apt-get update && apt-get upgrade -y && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# UV paket yöneticisini çekme
COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/uv

# Bağımlılıkları kopyala ve yükle (apps/ai altındaki dosyalardan kopyalıyoruz)
COPY apps/ai/pyproject.toml apps/ai/uv.lock apps/ai/README.md ./
COPY apps/ai/src/ ./src/

# Eğer notebooks klasörü apps/ai altındaysa:
COPY apps/ai/notebooks/ ./notebooks/

RUN uv sync --frozen --no-cache

EXPOSE 8000

# Sağlık kontrolü
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

USER appuser

CMD ["uv", "run", "uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]