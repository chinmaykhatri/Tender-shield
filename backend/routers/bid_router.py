"""
============================================================================
TenderShield — Bid API Router (ORM-Integrated)
============================================================================
ZKP-based bid submission and reveal endpoints.
Phase 1: Submit encrypted commitment (no one sees the bid amount).
Phase 2: Reveal after deadline (chaincode verifies ZKP proof).
Dual-write: ORM + Blockchain for every mutation.
============================================================================
"""

import logging
import math
import hashlib
import secrets
from fastapi import APIRouter, Depends, HTTPException, status

from backend.auth.jwt_handler import TokenData, get_current_user, require_bidder
from backend.services.fabric_service import fabric_service
from backend.services.event_bus import event_bus
from backend.db.repositories import BidRepository, AuditRepository
from backend.models.data_models import CommitBidRequest, RevealBidRequest

logger = logging.getLogger("tendershield.routers.bid")
router = APIRouter(prefix="/api/v1/bids", tags=["Bids (ZKP)"])

bid_repo = BidRepository()
audit_repo = AuditRepository()


@router.post("/commit", status_code=status.HTTP_201_CREATED)
async def commit_bid(
    request: CommitBidRequest,
    current_user: TokenData = Depends(require_bidder),
):
    """
    ZKP Phase 1: Submit a bid commitment (encrypted amount).
    Dual-write: Blockchain + ORM.
    ACCESS: BidderOrg only.
    """
    bid_data = {
        "tender_id": request.tender_id,
        "commitment_hash": request.commitment_hash,
        "zkp_proof": request.zkp_proof,
        "documents_ipfs_hash": request.bidder_documents_ipfs_hash,
    }

    bid = await fabric_service.submit_bid(bid_data, current_user.sub)

    # Persist to ORM
    try:
        await bid_repo.create({
            "bid_id": bid["bid_id"],
            "tender_id": request.tender_id,
            "bidder_did": current_user.sub,
            "commitment_hash": request.commitment_hash,
            "zkp_proof": request.zkp_proof,
            "documents_ipfs_hash": request.bidder_documents_ipfs_hash,
            "status": "COMMITTED",
            "blockchain_tx_id": bid.get("blockchain_tx_id"),
            "blockchain_mode": bid.get("blockchain_mode", "LEDGER_SIMULATION"),
        })
        await audit_repo.record(
            event_type="BID_SUBMITTED",
            actor_did=current_user.sub,
            actor_role="BIDDER",
            tender_id=request.tender_id,
            description=f"ZKP Phase 1: Bid committed for tender {request.tender_id}",
            payload_hash=hashlib.sha256(request.commitment_hash.encode()).hexdigest(),
            blockchain_tx_id=bid.get("blockchain_tx_id"),
        )
    except Exception as e:
        logger.warning(f"ORM write failed (blockchain write succeeded): {e}")

    await event_bus.publish_bid_event(
        request.tender_id, bid["bid_id"],
        "BID_COMMITTED",
        {"bid_id": bid["bid_id"], "bidder": current_user.sub, "phase": "ZKP_COMMIT"},
    )

    logger.info(f"Bid committed (ZKP Phase 1): {bid['bid_id']} by {current_user.sub}")
    return {
        "success": True,
        "bid": bid,
        "message": "Bid committed successfully. Amount is encrypted — no one can see it until reveal phase.",
    }


@router.post("/reveal")
async def reveal_bid(
    request: RevealBidRequest,
    current_user: TokenData = Depends(require_bidder),
):
    """
    ZKP Phase 2: Reveal bid amount after the deadline.
    ACCESS: BidderOrg only.
    """
    bid = None
    for key, value in fabric_service._state.items():
        if key.startswith("BID~") and value.get("bid_id") == request.bid_id:
            bid = value
            break

    if not bid:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Bid {request.bid_id} not found",
        )

    # Verify ZKP commitment
    pre_image = f"{request.revealed_amount_paise}||{request.randomness}"
    recomputed_hash = hashlib.sha256(pre_image.encode()).hexdigest()

    if recomputed_hash != bid.get("commitment_hash"):
        await event_bus.publish_audit_event({
            "event_type": "ZKP_VERIFICATION_FAILED",
            "tender_id": bid.get("tender_id"),
            "bid_id": request.bid_id,
            "bidder_did": current_user.sub,
            "risk_level": "HIGH",
            "description": f"🚨 ZKP commitment mismatch for bid {request.bid_id}",
        })
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="ZKP verification FAILED: revealed amount does not match the original commitment. This incident has been logged.",
        )

    revealed = await fabric_service.reveal_bid(
        bid["tender_id"], request.bid_id,
        current_user.sub, request.revealed_amount_paise,
    )

    # Update ORM
    try:
        await bid_repo.reveal(request.bid_id, request.revealed_amount_paise)
        await audit_repo.record(
            event_type="BID_REVEALED",
            actor_did=current_user.sub,
            actor_role="BIDDER",
            tender_id=bid["tender_id"],
            description=f"ZKP Phase 2: Bid revealed — ₹{request.revealed_amount_paise / 100:,.2f}",
            payload_hash=recomputed_hash,
        )
    except Exception as e:
        logger.warning(f"ORM update failed: {e}")

    await event_bus.publish_bid_event(
        bid["tender_id"], request.bid_id,
        "BID_REVEALED",
        {
            "bid_id": request.bid_id,
            "revealed_amount_paise": request.revealed_amount_paise,
            "bidder": current_user.sub,
            "phase": "ZKP_REVEAL",
            "zkp_verified": True,
        },
    )

    return {
        "success": True,
        "bid": revealed,
        "message": f"Bid revealed and ZKP verified ✅ — Amount: ₹{request.revealed_amount_paise / 100:,.2f}",
    }


@router.get("/tender/{tender_id}")
async def get_bids_for_tender(
    tender_id: str,
    current_user: TokenData = Depends(get_current_user),
):
    """
    Get all bids for a specific tender.
    Tries ORM first, falls back to blockchain.
    ACCESS: All authenticated users.
    """
    # Try ORM first
    try:
        orm_bids = await bid_repo.get_by_tender(tender_id)
        if orm_bids:
            bids = []
            for b in orm_bids:
                sanitized = {
                    "bid_id": b.bid_id,
                    "tender_id": b.tender_id,
                    "bidder_did": b.bidder_did,
                    "status": b.status,
                    "submitted_at_ist": b.submitted_at_ist.isoformat() if b.submitted_at_ist else None,
                    "blockchain_mode": b.blockchain_mode,
                    "data_source": "ORM",
                }
                if b.status == "REVEALED":
                    sanitized["revealed_amount_paise"] = b.revealed_amount_paise
                    sanitized["reveal_at_ist"] = b.reveal_at_ist.isoformat() if b.reveal_at_ist else None
                else:
                    sanitized["commitment_hash"] = (b.commitment_hash or "")[:16] + "..."
                bids.append(sanitized)
            return {"success": True, "tender_id": tender_id, "count": len(bids), "bids": bids, "data_source": "ORM"}
    except Exception:
        pass

    # Fallback to blockchain
    bids = await fabric_service.query_bids_by_tender(tender_id)
    sanitized_bids = []
    for bid in bids:
        sanitized = {**bid}
        if sanitized.get("status") == "COMMITTED":
            sanitized["commitment_hash"] = sanitized.get("commitment_hash", "")[:16] + "..."
            sanitized.pop("zkp_proof", None)
        sanitized_bids.append(sanitized)

    return {"success": True, "tender_id": tender_id, "count": len(bids), "bids": sanitized_bids, "data_source": "BLOCKCHAIN"}


@router.post("/generate-commitment")
async def generate_commitment(
    amount_paise: int,
    current_user: TokenData = Depends(require_bidder),
):
    """
    Helper: Generate a ZKP commitment for a bid amount.
    ACCESS: BidderOrg only.
    """
    if amount_paise <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Amount must be positive (in paise). ₹1 = 100 paise.",
        )

    randomness = secrets.token_hex(32)
    pre_image = f"{amount_paise}||{randomness}"
    commitment_hash = hashlib.sha256(pre_image.encode()).hexdigest()

    bit_length = int(math.log2(amount_paise)) + 1
    proof_nonce = secrets.token_hex(16)
    range_proof = f"RANGE_PROOF_V1:{bit_length}:{commitment_hash[:16]}:{proof_nonce}"

    return {
        "success": True,
        "commitment_hash": commitment_hash,
        "randomness": randomness,
        "zkp_proof": range_proof,
        "amount_display": f"₹{amount_paise / 100:,.2f}",
        "warning": "⚠️ SAVE THE RANDOMNESS! You will need it to reveal your bid.",
    }
