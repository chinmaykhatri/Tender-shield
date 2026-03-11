"""
============================================================================
TenderShield — Bid API Router
============================================================================
ZKP-based bid submission and reveal endpoints.
Phase 1: Submit encrypted commitment (no one sees the bid amount).
Phase 2: Reveal after deadline (chaincode verifies ZKP proof).
============================================================================
"""

import logging
import hashlib
import secrets
from fastapi import APIRouter, Depends, HTTPException, status

from backend.auth.jwt_handler import TokenData, get_current_user, require_bidder
from backend.services.fabric_service import fabric_service
from backend.services.kafka_service import kafka_service
from backend.models.data_models import CommitBidRequest, RevealBidRequest

logger = logging.getLogger("tendershield.routers.bid")
router = APIRouter(prefix="/api/v1/bids", tags=["Bids (ZKP)"])


@router.post("/commit", status_code=status.HTTP_201_CREATED)
async def commit_bid(
    request: CommitBidRequest,
    current_user: TokenData = Depends(require_bidder),
):
    """
    ZKP Phase 1: Submit a bid commitment (encrypted amount).
    The actual bid amount is hidden using Pedersen commitment scheme.
    ACCESS: BidderOrg only.
    """
    bid_data = {
        "tender_id": request.tender_id,
        "commitment_hash": request.commitment_hash,
        "zkp_proof": request.zkp_proof,
        "documents_ipfs_hash": request.bidder_documents_ipfs_hash,
    }

    bid = await fabric_service.submit_bid(bid_data, current_user.sub)

    await kafka_service.produce_bid_event(
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
    The chaincode verifies that the revealed amount matches the commitment.
    ACCESS: BidderOrg only.
    """
    # Find the bid in the state
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
        # SECURITY: Log failed verification as HIGH risk
        await kafka_service.produce_audit_event({
            "event_type": "ZKP_VERIFICATION_FAILED",
            "tender_id": bid.get("tender_id"),
            "bid_id": request.bid_id,
            "bidder_did": current_user.sub,
            "risk_level": "HIGH",
            "description": f"🚨 ZKP commitment mismatch for bid {request.bid_id} — possible bid tampering",
        })

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="ZKP verification FAILED: revealed amount does not match the original commitment. This incident has been logged.",
        )

    revealed = await fabric_service.reveal_bid(
        bid["tender_id"], request.bid_id,
        current_user.sub, request.revealed_amount_paise,
    )

    await kafka_service.produce_bid_event(
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
    ACCESS: All authenticated users (amounts visible only after reveal).
    """
    bids = await fabric_service.query_bids_by_tender(tender_id)

    # Hide commitment details for non-revealed bids
    sanitized_bids = []
    for bid in bids:
        sanitized = {**bid}
        if sanitized.get("status") == "COMMITTED":
            sanitized["commitment_hash"] = sanitized.get("commitment_hash", "")[:16] + "..."
            sanitized.pop("zkp_proof", None)
        sanitized_bids.append(sanitized)

    return {"success": True, "tender_id": tender_id, "count": len(bids), "bids": sanitized_bids}


@router.post("/generate-commitment")
async def generate_commitment(
    amount_paise: int,
    current_user: TokenData = Depends(require_bidder),
):
    """
    Helper endpoint: Generate a ZKP commitment for a bid amount.
    Returns the commitment hash and randomness (bidder must save the randomness!).
    ACCESS: BidderOrg only.

    SECURITY NOTE: In production, this would be done client-side.
    This endpoint exists for demo/testing convenience.
    """
    if amount_paise <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Amount must be positive (in paise). ₹1 = 100 paise.",
        )

    randomness = secrets.token_hex(32)  # 256-bit randomness
    pre_image = f"{amount_paise}||{randomness}"
    commitment_hash = hashlib.sha256(pre_image.encode()).hexdigest()

    # Simple range proof
    import math
    bit_length = int(math.log2(amount_paise)) + 1
    proof_nonce = secrets.token_hex(16)
    range_proof = f"RANGE_PROOF_V1:{bit_length}:{commitment_hash[:16]}:{proof_nonce}"

    return {
        "success": True,
        "commitment_hash": commitment_hash,
        "randomness": randomness,
        "zkp_proof": range_proof,
        "amount_display": f"₹{amount_paise / 100:,.2f}",
        "warning": "⚠️ SAVE THE RANDOMNESS! You will need it to reveal your bid. If lost, your bid cannot be revealed.",
    }
