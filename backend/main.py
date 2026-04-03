"""
============================================================================
TenderShield — FastAPI Application Entry Point
============================================================================
Main application that assembles all routers, middleware, and services.

Run:   uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
Docs:  http://localhost:8000/docs (Swagger UI)
       http://localhost:8000/redoc (ReDoc)
============================================================================
"""

import logging
import time
from datetime import datetime, timezone, timedelta
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.config import settings
from backend.routers.tender_router import router as tender_router
from backend.routers.bid_router import router as bid_router
from backend.routers.dashboard_router import auth_router, dashboard_router
from backend.routers.blockchain_router import router as blockchain_router
from backend.middleware.security import (
    SecurityHeadersMiddleware,
    RateLimitMiddleware,
    InputSanitizationMiddleware,
    CorrelationIdMiddleware,
)

# ============================================================================
# Logging Configuration
# ============================================================================

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("tendershield")

IST = timezone(timedelta(hours=5, minutes=30))


# ============================================================================
# Application Lifespan (startup/shutdown)
# ============================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown logic."""
    # --- Startup ---
    from backend.services.fabric_service import fabric_service
    from backend.services.event_bus import event_bus

    logger.info("=" * 70)
    logger.info("🏛️  TenderShield — AI-Secured Government Procurement System")
    logger.info(f"   Version: {settings.APP_VERSION}")
    logger.info(f"   Environment: {settings.APP_ENV}")
    logger.info(f"   Fabric Channel: {settings.FABRIC_CHANNEL_NAME}")
    logger.info(f"   Chaincode: {settings.FABRIC_CHAINCODE_NAME}")
    logger.info(f"   AI Engine: {settings.AI_ENGINE_URL}")
    logger.info("=" * 70)

    # Initialize database (SQLAlchemy ORM — creates tables)
    try:
        from backend.db.engine import init_db
        await init_db()
    except Exception as e:
        logger.warning(f"⚠️  Database init skipped: {e}")

    # Initialize Fabric connection (strategy pattern: live or simulation)
    await fabric_service.initialize()
    logger.info(f"🔗 Blockchain Mode: {fabric_service.mode}")
    logger.info(f"🔗 Peers Online: {fabric_service.get_peer_count()}")

    # Initialize Redis event bus (Pub/Sub)
    await event_bus.connect()
    bus_health = await event_bus.health_check()
    logger.info(f"📡 Event Bus Mode: {bus_health['mode']}")

    logger.info("✅ Backend services initialized")
    logger.info(f"📊 Swagger Docs: http://localhost:{settings.APP_PORT}/docs")
    logger.info(f"📊 ReDoc: http://localhost:{settings.APP_PORT}/redoc")
    logger.info("=" * 70)

    yield

    # --- Shutdown ---
    logger.info("🛑 TenderShield shutting down...")
    await event_bus.disconnect()
    try:
        from backend.db.engine import dispose_db
        await dispose_db()
    except Exception:
        pass


# ============================================================================
# FastAPI Application
# ============================================================================

app = FastAPI(
    title="TenderShield API",
    description=(
        "🏛️ India's First AI-Secured, Blockchain-Based Government Procurement System.\n\n"
        "**Powered by:** Hyperledger Fabric + ZKP (Pedersen Commitments) + AI Fraud Detection\n\n"
        "## Key Features\n"
        "- **Zero-Knowledge Proof bidding** — bid amounts encrypted until reveal deadline\n"
        "- **GFR 2017 compliance** — enforced at blockchain chaincode level\n"
        "- **5 AI fraud detectors** — bid rigging, collusion, shell companies, cartels, timing anomalies\n"
        "- **4-org blockchain** — MinistryOrg, BidderOrg, AuditorOrg (CAG), NICOrg\n\n"
        "## Authentication\n"
        "Use `POST /api/v1/auth/login` with demo credentials (see `/api/v1/auth/demo-users`).\n"
        "Pass the JWT token as `Authorization: Bearer <token>` header.\n\n"
        "## Indian Government Compliance\n"
        "GFR 2017 | CVC Guidelines | IT Act 2000 | GST Act | Aadhaar Act 2016"
    ),
    version=settings.APP_VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)


# ============================================================================
# CORS Middleware
# ============================================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Correlation-ID"],
)

# Production security middleware stack (order matters — outermost first)
app.add_middleware(CorrelationIdMiddleware)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RateLimitMiddleware)
app.add_middleware(InputSanitizationMiddleware)


# ============================================================================
# Request Logging Middleware
# ============================================================================

@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log every request with IST timestamp and response time."""
    start_time = time.time()
    response = await call_next(request)
    process_time = (time.time() - start_time) * 1000  # ms

    logger.info(
        f"{request.method} {request.url.path} → {response.status_code} "
        f"({process_time:.1f}ms) [{request.client.host if request.client else 'unknown'}]"
    )

    response.headers["X-Process-Time-Ms"] = f"{process_time:.1f}"
    response.headers["X-Powered-By"] = "TenderShield"
    return response


# ============================================================================
# Global Exception Handler
# ============================================================================

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catch unhandled exceptions and return structured error response."""
    logger.error(f"Unhandled exception on {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": "Internal server error",
            "detail": str(exc) if settings.APP_DEBUG else "An unexpected error occurred",
            "timestamp_ist": datetime.now(IST).strftime("%Y-%m-%dT%H:%M:%S+05:30"),
        },
    )


# ============================================================================
# Register Routers
# ============================================================================

app.include_router(auth_router)
app.include_router(dashboard_router)
app.include_router(tender_router)
app.include_router(bid_router)
app.include_router(blockchain_router)


# ============================================================================
# Root Endpoint
# ============================================================================

@app.get("/", tags=["Root"])
async def root():
    """API root — returns system information."""
    return {
        "name": "TenderShield API",
        "version": settings.APP_VERSION,
        "description": "India's First AI-Secured, Blockchain-Based Government Procurement System",
        "documentation": "/docs",
        "health": "/api/v1/dashboard/health",
        "demo_users": "/api/v1/auth/demo-users",
        "timestamp_ist": datetime.now(IST).strftime("%Y-%m-%dT%H:%M:%S+05:30"),
    }
