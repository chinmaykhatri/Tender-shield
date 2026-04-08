# ============================================
# TenderShield — Backend Dockerfile
# ============================================
FROM python:3.12-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
RUN pip install --no-cache-dir \
    fastapi==0.104.1 \
    "uvicorn[standard]==0.24.0" \
    pydantic==2.5.3 \
    pydantic-settings==2.1.0 \
    python-multipart==0.0.6 \
    "python-jose[cryptography]==3.3.0" \
    "passlib[bcrypt]==1.7.4" \
    sqlalchemy==2.0.23 \
    psycopg2-binary==2.9.9 \
    requests==2.31.0 \
    httpx==0.26.0 \
    python-dotenv==1.0.0 \
    loguru==0.7.2 \
    orjson==3.9.10 \
    redis==5.0.1 \
    aiosqlite==0.19.0

# Copy application code as a Python package
COPY . ./backend/

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD python -c "import urllib.request,os; urllib.request.urlopen(f'http://localhost:{os.getenv(\"PORT\",\"8000\")}/api/v1/dashboard/health')" || exit 1

# Run — respects PORT env var from Render/Cloud Run, defaults to 8000
CMD ["sh", "-c", "uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
