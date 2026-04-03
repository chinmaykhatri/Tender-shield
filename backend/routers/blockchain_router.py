"""
============================================================================
TenderShield — Blockchain API Router
============================================================================
Dedicated REST endpoints for blockchain operations:
  - Block explorer (list/query recent blocks)
  - Transaction lookup
  - Hash verification
  - Network info & health
  - Audit trail queries

All data comes from either:
  - Real Fabric peer (FABRIC_LIVE mode)
  - SQLite persistent ledger (LEDGER_SIMULATION mode)

Every response includes `blockchain_mode` for frontend honesty.
============================================================================
"""

import hashlib
import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel

from backend.auth.jwt_handler import TokenData, get_current_user
from backend.services.fabric_service import fabric_service

logger = logging.getLogger("tendershield.routers.blockchain")
router = APIRouter(prefix="/api/v1/blockchain", tags=["Blockchain"])


# ---- Response Models ----

class VerifyHashRequest(BaseModel):
    data: str
    expected_hash: str


class BlockQueryParams(BaseModel):
    start: int = 0
    count: int = 10


# ---- Endpoints ----

@router.get("/info")
async def get_network_info(
    current_user: TokenData = Depends(get_current_user),
):
    """
    Get blockchain network information.
    Returns real peer count and mode (LIVE or SIMULATED).
    ACCESS: All authenticated users.
    """
    await fabric_service.initialize()

    health = await fabric_service.health_check()

    return {
        "success": True,
        "network": {
            "mode": fabric_service.mode,
            "peers_online": fabric_service.get_peer_count(),
            "consensus": "Raft" if fabric_service.is_live() else "N/A (Simulated)",
            "channel": "tenderchannel",
            "chaincode": "tendershield",
            "chaincode_version": "1.0",
            "organizations": (
                ["Org1MSP (MinistryOrg)", "Org2MSP (BidderOrg)"]
                if fabric_service.is_live()
                else ["SimulatedMSP"]
            ),
            "state_database": "CouchDB" if fabric_service.is_live() else "SQLite",
            "tls_enabled": fabric_service.is_live(),
        },
        "health": health,
    }


@router.get("/blocks")
async def list_recent_blocks(
    count: int = Query(default=10, ge=1, le=50),
    current_user: TokenData = Depends(get_current_user),
):
    """
    List recent blocks from the blockchain.
    ACCESS: All authenticated users.
    """
    blocks = await fabric_service.get_recent_blocks(count)

    return {
        "success": True,
        "blockchain_mode": fabric_service.mode,
        "block_count": len(blocks),
        "blocks": blocks,
    }


@router.get("/blocks/{block_number}")
async def get_block(
    block_number: int,
    current_user: TokenData = Depends(get_current_user),
):
    """
    Get a specific block by number.
    ACCESS: All authenticated users.
    """
    block = await fabric_service.get_block(block_number)
    if not block:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Block {block_number} not found",
        )

    return {
        "success": True,
        "blockchain_mode": fabric_service.mode,
        "block": block,
    }


@router.get("/stats")
async def get_blockchain_stats(
    current_user: TokenData = Depends(get_current_user),
):
    """
    Get blockchain statistics (block height, TX count, etc).
    ACCESS: All authenticated users.
    """
    stats = await fabric_service.get_dashboard_stats()

    return {
        "success": True,
        "blockchain_mode": fabric_service.mode,
        "stats": stats,
    }


@router.post("/verify")
async def verify_hash(
    request: VerifyHashRequest,
    current_user: TokenData = Depends(get_current_user),
):
    """
    Verify a SHA-256 hash against provided data.
    Used by the blockchain explorer's hash verification tool.
    ACCESS: All authenticated users.
    """
    computed_hash = hashlib.sha256(request.data.encode()).hexdigest()
    match = computed_hash == request.expected_hash.lower()

    return {
        "success": True,
        "blockchain_mode": fabric_service.mode,
        "verification": {
            "match": match,
            "computed_hash": computed_hash,
            "expected_hash": request.expected_hash.lower(),
            "algorithm": "SHA-256",
        },
    }


@router.get("/health")
async def blockchain_health():
    """
    Blockchain health check (unauthenticated).
    Used by frontend status badge.
    """
    health = await fabric_service.health_check()

    return {
        "success": True,
        "blockchain_mode": fabric_service.mode,
        "is_live": fabric_service.is_live(),
        "peers_online": fabric_service.get_peer_count(),
        "health": health,
    }


@router.get("/audit-trail/{tender_id}")
async def get_audit_trail(
    tender_id: str,
    current_user: TokenData = Depends(get_current_user),
):
    """
    Get the complete blockchain audit trail for a tender.
    Shows every state change recorded on the ledger.
    ACCESS: All authenticated users.
    """
    # Extract ministry code from tender ID (format: TDR-MoRTH-2026-000001)
    parts = tender_id.split("-")
    ministry_code = parts[1] if len(parts) >= 3 else "GEN"

    history = await fabric_service.get_tender_history(ministry_code, tender_id)

    return {
        "success": True,
        "blockchain_mode": fabric_service.mode,
        "tender_id": tender_id,
        "audit_trail": history,
        "trail_length": len(history),
        "immutable": fabric_service.is_live(),  # Only truly immutable on real Fabric
    }
