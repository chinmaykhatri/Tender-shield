"""
============================================================================
TenderShield — JWT Authentication Handler
============================================================================
JWT-based authentication with RS256/HS256 signing.
Supports role-based access control for MinistryOrg, BidderOrg,
AuditorOrg, and NICOrg identities.

India-Specific:
  - Aadhaar eKYC bridge for identity verification
  - DSC (Digital Signature Certificate) validation support
  - Session tracking in IST (Indian Standard Time)
============================================================================
"""

import hashlib
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from pydantic import BaseModel

from backend.config import settings

logger = logging.getLogger("tendershield.auth")
security = HTTPBearer()

# Simple password hashing for demo (production would use bcrypt/argon2)
_SALT = "tendershield-demo-salt-2025"


def _hash_password(password: str) -> str:
    return hashlib.sha256(f"{_SALT}{password}".encode()).hexdigest()


def _verify_password(password: str, hashed: str) -> bool:
    return _hash_password(password) == hashed


# ============================================================================
# Token Models
# ============================================================================

class TokenData(BaseModel):
    """JWT token payload data."""
    sub: str                    # User ID / DID
    role: str                   # OFFICER, BIDDER, AUDITOR, NIC_ADMIN
    org: str                    # MinistryOrgMSP, BidderOrgMSP, etc.
    name: str                   # Display name
    exp: Optional[datetime] = None
    iat: Optional[datetime] = None


class TokenResponse(BaseModel):
    """Token response returned to client."""
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    role: str
    org: str


class UserLogin(BaseModel):
    """Login request schema."""
    email: str
    password: str


# ============================================================================
# Demo Users (Competition Demo — hardcoded for judges)
# ============================================================================

DEMO_USERS: Dict[str, Dict[str, Any]] = {
    "officer@morth.gov.in": {
        "password_hash": _hash_password("Tender@2025"),
        "did": "did:tendershield:ministryorgmsp:officer.morth",
        "role": "OFFICER",
        "org": "MinistryOrgMSP",
        "name": "Rajesh Kumar (MoRTH Officer)",
        "ministry_code": "MoRTH",
    },
    "officer@moe.gov.in": {
        "password_hash": _hash_password("Tender@2025"),
        "did": "did:tendershield:ministryorgmsp:officer.moe",
        "role": "OFFICER",
        "org": "MinistryOrgMSP",
        "name": "Priya Sharma (MoE Officer)",
        "ministry_code": "MoE",
    },
    "medtech@medtechsolutions.com": {
        "password_hash": _hash_password("Bid@2025"),
        "did": "did:tendershield:bidderorgmsp:medtech",
        "role": "BIDDER",
        "org": "BidderOrgMSP",
        "name": "MedTech Solutions Pvt Ltd",
        "gstin": "27AABCM1234F1Z5",
    },
    "admin@biomedicorp.com": {
        "password_hash": _hash_password("Bid@2025"),
        "did": "did:tendershield:bidderorgmsp:biomedicorp",
        "role": "BIDDER",
        "org": "BidderOrgMSP",
        "name": "BioMediCorp (Shell Company — Demo)",
        "gstin": "07AABCB5678G1Z3",
    },
    "infra@roadbuildersltd.com": {
        "password_hash": _hash_password("Bid@2025"),
        "did": "did:tendershield:bidderorgmsp:roadbuilders",
        "role": "BIDDER",
        "org": "BidderOrgMSP",
        "name": "Road Builders Ltd",
        "gstin": "09AABCR9012H1Z1",
    },
    "auditor@cag.gov.in": {
        "password_hash": _hash_password("Audit@2025"),
        "did": "did:tendershield:auditororgmsp:cag.auditor1",
        "role": "AUDITOR",
        "org": "AuditorOrgMSP",
        "name": "CAG Auditor (Comptroller & Auditor General)",
    },
    "admin@nic.in": {
        "password_hash": _hash_password("Admin@2025"),
        "did": "did:tendershield:nicorgmsp:admin",
        "role": "NIC_ADMIN",
        "org": "NICOrgMSP",
        "name": "NIC Administrator",
    },
}


# ============================================================================
# Token Creation
# ============================================================================

def create_access_token(data: dict) -> str:
    """Create a JWT access token with IST-aware expiration."""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({
        "exp": expire,
        "iat": datetime.utcnow(),
        "iss": "TenderShield",
    })
    encoded_jwt = jwt.encode(
        to_encode,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )
    return encoded_jwt


def create_refresh_token(data: dict) -> str:
    """Create a longer-lived refresh token."""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({
        "exp": expire,
        "type": "refresh",
    })
    return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


# ============================================================================
# Token Verification
# ============================================================================

def verify_token(token: str) -> TokenData:
    """Verify and decode a JWT token."""
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
        token_data = TokenData(
            sub=payload.get("sub", ""),
            role=payload.get("role", ""),
            org=payload.get("org", ""),
            name=payload.get("name", ""),
        )
        if not token_data.sub:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: missing subject",
            )
        return token_data
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token validation failed: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )


# ============================================================================
# Authentication Dependencies (FastAPI Depends)
# ============================================================================

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> TokenData:
    """FastAPI dependency — extracts and validates the current user from JWT."""
    return verify_token(credentials.credentials)


async def require_officer(current_user: TokenData = Depends(get_current_user)) -> TokenData:
    """Require MinistryOrg OFFICER role."""
    if current_user.role != "OFFICER" or current_user.org != "MinistryOrgMSP":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: this endpoint requires MinistryOrg Officer role",
        )
    return current_user


async def require_bidder(current_user: TokenData = Depends(get_current_user)) -> TokenData:
    """Require BidderOrg BIDDER role."""
    if current_user.role != "BIDDER" or current_user.org != "BidderOrgMSP":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: this endpoint requires BidderOrg membership",
        )
    return current_user


async def require_auditor(current_user: TokenData = Depends(get_current_user)) -> TokenData:
    """Require AuditorOrg AUDITOR role (CAG)."""
    if current_user.role != "AUDITOR" or current_user.org != "AuditorOrgMSP":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: this endpoint requires CAG Auditor role",
        )
    return current_user


async def require_nic_admin(current_user: TokenData = Depends(get_current_user)) -> TokenData:
    """Require NICOrg admin role."""
    if current_user.role != "NIC_ADMIN" or current_user.org != "NICOrgMSP":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: this endpoint requires NIC Admin role",
        )
    return current_user


# ============================================================================
# Login Function
# ============================================================================

def authenticate_user(email: str, password: str) -> Optional[Dict[str, Any]]:
    """Authenticate user against demo credentials."""
    user = DEMO_USERS.get(email)
    if not user:
        return None
    if not _verify_password(password, user["password_hash"]):
        return None
    return user
