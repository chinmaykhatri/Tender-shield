"""
============================================================================
TenderShield — Dashboard & Auth API Router
============================================================================
Authentication endpoints and dashboard statistics.
Real-time stats aggregated from blockchain state.
============================================================================
"""

import logging
import hashlib
import secrets
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from typing import Optional

from pydantic import BaseModel, Field

from backend.auth.jwt_handler import (
    TokenData, UserLogin, TokenResponse,
    authenticate_user, create_access_token,
    get_current_user, DEMO_USERS,
    _hash_password,
)
from backend.services.fabric_service import fabric_service
from backend.services.event_bus import event_bus
from backend.db.repositories import TenderRepository, AlertRepository
from backend.config import settings

tender_repo = TenderRepository()
alert_repo = AlertRepository()

logger = logging.getLogger("tendershield.routers.dashboard")
IST = timezone(timedelta(hours=5, minutes=30))

auth_router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"])
dashboard_router = APIRouter(prefix="/api/v1/dashboard", tags=["Dashboard"])

# In-memory registered users (production would use PostgreSQL)
REGISTERED_USERS: dict = {}

# ============================================================================
# Registration Model
# ============================================================================

class RegisterRequest(BaseModel):
    """User registration request."""
    email: str = Field(..., description="User email address")
    password: str = Field(..., min_length=6, description="Password (min 6 chars)")
    name: str = Field(..., description="Full name or organization name")
    role: str = Field(default="BIDDER", description="Role: OFFICER, BIDDER, AUDITOR, NIC_ADMIN")
    gstin: str = Field(default="", description="GSTIN (required for BIDDER)")
    organization_name: str = Field(default="", description="Organization name")


# ============================================================================
# Auth Endpoints
# ============================================================================

@auth_router.post("/login", response_model=TokenResponse)
async def login(request: UserLogin):
    """
    Authenticate user and return JWT access token.
    Works for both demo users and registered users.
    """
    # First check demo users
    user = authenticate_user(request.email, request.password)

    # Then check registered users
    if not user and request.email in REGISTERED_USERS:
        reg = REGISTERED_USERS[request.email]
        if reg["password_hash"] == _hash_password(request.password):
            user = reg

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password. Register at /api/v1/auth/register or use demo credentials.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token({
        "sub": user["did"],
        "role": user["role"],
        "org": user["org"],
        "name": user["name"],
    })

    logger.info(f"User logged in: {request.email} ({user['role']})")

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        role=user["role"],
        org=user["org"],
    )


@auth_router.post("/register")
async def register_user(request: RegisterRequest):
    """
    Register a new user account.
    Creates a blockchain DID and returns JWT token.

    Roles:
    - BIDDER: Can submit ZKP bids (requires GSTIN)
    - OFFICER: Can create/manage tenders
    - AUDITOR: Read-only audit access
    - NIC_ADMIN: System administration
    """
    # Validate role
    valid_roles = {"OFFICER", "BIDDER", "AUDITOR", "NIC_ADMIN"}
    if request.role not in valid_roles:
        raise HTTPException(400, f"Invalid role. Must be one of: {valid_roles}")

    # Check duplicate
    if request.email in REGISTERED_USERS or request.email in DEMO_USERS:
        raise HTTPException(409, "Email already registered")

    # GSTIN required for bidders
    if request.role == "BIDDER" and not request.gstin:
        raise HTTPException(400, "GSTIN is required for BIDDER role")

    # Map role → org
    role_org_map = {
        "OFFICER": "MinistryOrgMSP",
        "BIDDER": "BidderOrgMSP",
        "AUDITOR": "AuditorOrgMSP",
        "NIC_ADMIN": "NICOrgMSP",
    }

    # Generate DID
    user_id = secrets.token_hex(8)
    did = f"did:fabric:{role_org_map[request.role]}:user_{user_id}"

    # Store user
    user_record = {
        "did": did,
        "email": request.email,
        "name": request.name,
        "password_hash": _hash_password(request.password),
        "role": request.role,
        "org": role_org_map[request.role],
        "gstin": request.gstin,
        "organization_name": request.organization_name,
        "created_at": datetime.now(IST).strftime("%Y-%m-%dT%H:%M:%S+05:30"),
    }
    REGISTERED_USERS[request.email] = user_record

    # Auto-generate login token
    access_token = create_access_token({
        "sub": did,
        "role": request.role,
        "org": role_org_map[request.role],
        "name": request.name,
    })

    # Audit event
    await event_bus.publish_audit_event({
        "event_type": "USER_REGISTERED",
        "user_did": did,
        "role": request.role,
        "email": request.email,
    })

    logger.info(f"New user registered: {request.email} ({request.role}) → {did}")

    return {
        "success": True,
        "message": "Registration successful! You are now logged in.",
        "user": {
            "did": did,
            "email": request.email,
            "name": request.name,
            "role": request.role,
            "org": role_org_map[request.role],
        },
        "access_token": access_token,
        "token_type": "bearer",
    }


@auth_router.get("/me")
async def get_current_user_info(current_user: TokenData = Depends(get_current_user)):
    """Get current authenticated user's profile."""
    return {
        "success": True,
        "user": {
            "did": current_user.sub,
            "role": current_user.role,
            "org": current_user.org,
            "name": current_user.name,
        },
    }


@auth_router.get("/demo-users")
async def list_demo_users():
    """List available demo users for competition judges."""
    users = []
    for email, user in DEMO_USERS.items():
        users.append({
            "email": email,
            "role": user["role"],
            "org": user["org"],
            "name": user["name"],
        })
    return {"success": True, "demo_users": users, "registered_count": len(REGISTERED_USERS)}


# ============================================================================
# Dashboard Endpoints
# ============================================================================

@dashboard_router.get("/stats")
async def get_dashboard_stats(current_user: TokenData = Depends(get_current_user)):
    """
    Get aggregated dashboard statistics from ORM + blockchain.
    ACCESS: All authenticated users.
    """
    # Try ORM first
    try:
        orm_stats = await tender_repo.get_stats()
        alert_stats = await alert_repo.get_stats()
        stats = {**orm_stats, **alert_stats, "source": "ORM"}
    except Exception:
        stats = await fabric_service.get_dashboard_stats()
        stats["source"] = "BLOCKCHAIN"

    return {
        "success": True,
        "stats": stats,
        "timestamp_ist": datetime.now(IST).strftime("%Y-%m-%dT%H:%M:%S+05:30"),
    }


@dashboard_router.get("/events")
async def get_recent_events(
    channel: Optional[str] = None,
    limit: int = 50,
    current_user: TokenData = Depends(get_current_user),
):
    """
    Get recent events from Redis event bus.
    ACCESS: All authenticated users.
    """
    events = await event_bus.get_recent_events(channel, limit)
    return {
        "success": True,
        "count": len(events),
        "events": events,
        "bus_mode": event_bus._mode,
    }


@dashboard_router.get("/health")
async def health_check():
    """
    System health check — shows status of all connected services.
    No authentication required (for monitoring tools).
    """
    fabric_health = await fabric_service.health_check()
    bus_health = await event_bus.health_check()

    # Check DB health
    db_status = {"connected": False, "type": "unknown"}
    try:
        from backend.db.engine import engine, DATABASE_URL
        db_status["connected"] = True
        db_status["type"] = "PostgreSQL" if "postgresql" in DATABASE_URL else "SQLite"
        db_status["url"] = DATABASE_URL.split("@")[-1] if "@" in DATABASE_URL else DATABASE_URL.split("///")[-1]
    except Exception:
        pass

    return {
        "status": "healthy",
        "version": settings.APP_VERSION,
        "services": {
            "fabric": fabric_health,
            "event_bus": bus_health,
            "database": db_status,
        },
        "timestamp_ist": datetime.now(IST).strftime("%Y-%m-%dT%H:%M:%S+05:30"),
    }
