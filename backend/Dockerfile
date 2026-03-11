# ============================================
# TenderShield — Backend Dockerfile
# ============================================
FROM python:3.12-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python deps
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend and AI engine code
COPY backend/ ./backend/
COPY ai_engine/ ./ai_engine/
COPY .env.example ./.env

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/api/v1/dashboard/health')" || exit 1

# Run
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
