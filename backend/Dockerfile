# ============================================
# TenderShield — Backend Dockerfile
# ============================================
FROM python:3.12-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Install core Python dependencies directly (avoid heavy root requirements.txt)
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
    orjson==3.9.10

# Copy application code
COPY . .

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/api/v1/dashboard/health')" || exit 1

# Run
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
