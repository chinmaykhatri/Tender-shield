import logging
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from pydantic import BaseModel

try:
    import bcrypt
except ImportError:
    # Fallback: if bcrypt not installed, provide clear error
    raise ImportError(
        "bcrypt is required for password hashing. "
        "Install with: pip install bcrypt"
    )

from backend.config import settings

logger = logging.getLogger("tendershield.auth")
security = HTTPBearer()


# ============================================================================
# Password Hashing — bcrypt (GPU-resistant, per-password salt)
# ============================================================================
# Replaces SHA-256 + static salt which was crackable in seconds.
# bcrypt work factor 12 = ~250ms per hash on modern hardware.

def hash_password(password: str) -> str:
    """Hash password with bcrypt. Automatic unique salt, work factor 12."""
    if len(password) < 8:
        raise ValueError("Password must be at least 8 characters")
    salt = bcrypt.gensalt(rounds=12)
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')


def verify_password(password: str, hashed: str) -> bool:
    """Verify password against bcrypt hash. Constant-time comparison."""
    try:
        return bcrypt.checkpw(
            password.encode('utf-8'),
            hashed.encode('utf-8')
        )
    except Exception:
        return False


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
# bcrypt hashes computed at module load. Each hash has a unique salt.

DEMO_USERS: Dict[str, Dict[str, Any]] = {
    "officer@morth.gov.in": {
        "password_hash": hash_password("Tender@2025"),
        "did": "did:tendershield:ministryorgmsp:officer.morth",
        "role": "OFFICER",
        "org": "MinistryOrgMSP",
        "name": "Rajesh Kumar (MoRTH Officer)",
        "ministry_code": "MoRTH",
    },
    "officer@moe.gov.in": {
        "password_hash": hash_password("Tender@2025"),
        "did": "did:tendershield:ministryorgmsp:officer.moe",
        "role": "OFFICER",
        "org": "MinistryOrgMSP",
        "name": "Priya Sharma (MoE Officer)",
        "ministry_code": "MoE",
    },
    "medtech@medtechsolutions.com": {
        "password_hash": hash_password("Bid@2025"),
        "did": "did:tendershield:bidderorgmsp:medtech",
        "role": "BIDDER",
        "org": "BidderOrgMSP",
        "name": "MedTech Solutions Pvt Ltd",
        "gstin": "27AABCM1234F1Z5",
    },
    "admin@biomedicorp.com": {
        "password_hash": hash_password("Bid@2025"),
        "did": "did:tendershield:bidderorgmsp:biomedicorp",
        "role": "BIDDER",
        "org": "BidderOrgMSP",
        "name": "BioMediCorp (Shell Company — Demo)",
        "gstin": "07AABCB5678G1Z3",
    },
    "infra@roadbuildersltd.com": {
        "password_hash": hash_password("Bid@2025"),
        "did": "did:tendershield:bidderorgmsp:roadbuilders",
        "role": "BIDDER",
        "org": "BidderOrgMSP",
        "name": "Road Builders Ltd",
        "gstin": "09AABCR9012H1Z1",
    },
    "auditor@cag.gov.in": {
        "password_hash": hash_password("Audit@2025"),
        "did": "did:tendershield:auditororgmsp:cag.auditor1",
        "role": "AUDITOR",
        "org": "AuditorOrgMSP",
        "name": "CAG Auditor (Comptroller & Auditor General)",
    },
    "admin@nic.in": {
        "password_hash": hash_password("Admin@2025"),
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
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({
        "exp": expire,
        "iat": datetime.now(timezone.utc),
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
    expire = datetime.now(timezone.utc) + timedelta(days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS)
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
    """Authenticate user against demo credentials using bcrypt."""
    user = DEMO_USERS.get(email)
    if not user:
        return None
    if not verify_password(password, user["password_hash"]):
        return None
    return user
