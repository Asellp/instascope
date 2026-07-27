FROM python:3.11-slim

# Çalışma dizinini ayarla
WORKDIR /app

# UV paket yöneticisini imajın içine kopyala
COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/uv

# Bağımlılık dosyalarını kopyala ve yükle
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-cache

# Uygulama ve notebook kodlarını kopyala
COPY src/ ./src/
COPY notebooks/ ./notebooks/

# Portu dışarı aç
EXPOSE 8000

# Servisi uv üzerinden başlat
CMD ["uv", "run", "uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]