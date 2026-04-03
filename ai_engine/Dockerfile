# ============================================
# TenderShield — AI Engine Dockerfile
# ============================================
FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc g++ \
    && rm -rf /var/lib/apt/lists/*

# Install core AI dependencies directly
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir \
    fastapi==0.104.1 \
    "uvicorn[standard]==0.24.0" \
    pydantic==2.5.3 \
    scikit-learn>=1.3.2 \
    numpy>=1.26.2 \
    pandas>=2.1.4 \
    scipy>=1.11.4 \
    networkx>=3.2.1 \
    httpx>=0.26.0 \
    python-dotenv>=1.0.0 \
    loguru>=0.7.2 \
    orjson>=3.9.10

# Copy AI engine code only
COPY ai_engine/ ./ai_engine/

EXPOSE 8001

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8001/health')" || exit 1

CMD ["uvicorn", "ai_engine.main:app", "--host", "0.0.0.0", "--port", "8001"]

