FROM python:3.11-slim

# Güvenlik için non-root kullanıcı oluşturma
RUN groupadd -r appuser && useradd -r -g appuser appuser

# 1. Sistem paketlerini güncelle
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

# 2. Global Python ortamındaki paketleri açıkça güvenli sürüme yükselt (Trivy global taraması için)
RUN pip install --no-cache-dir --upgrade "wheel>=0.46.2" "setuptools>=78.1.1" "msgpack>=1.2.1"

WORKDIR /app

# UV paket yöneticisini çekme
COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/uv

# Dosyaları kopyala
COPY pyproject.toml uv.lock README.md ./
COPY src/ ./src/

# 3. Bağımlılıkları kur
RUN uv sync --frozen --no-cache

# 4. Proje sanal ortamındaki paketleri de garantiye al
RUN /app/.venv/bin/pip install --no-cache-dir --upgrade "wheel>=0.46.2" "setuptools>=78.1.1" "msgpack>=1.2.1"

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

USER appuser

CMD ["uv", "run", "uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]