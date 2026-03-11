"""
============================================================================
TenderShield — Tender API Router
============================================================================
RESTful endpoints for tender lifecycle management.
All write operations trigger Kafka events for AI monitoring.
============================================================================
"""

import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status

from backend.auth.jwt_handler import (
    TokenData, get_current_user, require_officer, require_nic_admin
)
from backend.services.fabric_service import fabric_service
from backend.services.kafka_service import kafka_service
from backend.models.data_models import (
    CreateTenderRequest, FreezeTenderRequest, AwardTenderRequest
)

logger = logging.getLogger("tendershield.routers.tender")
router = APIRouter(prefix="/api/v1/tenders", tags=["Tenders"])


@router.get("/")
async def list_tenders(
    status_filter: Optional[str] = None,
    current_user: TokenData = Depends(get_current_user),
):
    """
    List all tenders, optionally filtered by status.
    ACCESS: All authenticated users.
    """
    if status_filter:
        tenders = await fabric_service.query_tenders_by_status(status_filter)
    else:
        tenders = await fabric_service.query_all_tenders()

    return {
        "success": True,
        "count": len(tenders),
        "tenders": tenders,
        "filtered_by": status_filter,
    }


@router.get("/{ministry_code}/{tender_id}")
async def get_tender(
    ministry_code: str,
    tender_id: str,
    current_user: TokenData = Depends(get_current_user),
):
    """
    Get a single tender by ministry code and tender ID.
    ACCESS: All authenticated users.
    """
    tender = await fabric_service.query_tender_by_id(ministry_code, tender_id)
    if not tender:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tender {tender_id} not found in {ministry_code}",
        )
    return {"success": True, "tender": tender}


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_tender(
    request: CreateTenderRequest,
    current_user: TokenData = Depends(require_officer),
):
    """
    Create a new tender with GFR 2017 compliance validation.
    ACCESS: MinistryOrg Officers only.
    ENDORSEMENT: MinistryOrg AND NICOrg (blockchain level).
    """
    tender_data = request.model_dump()
    tender = await fabric_service.create_tender(tender_data, current_user.sub)

    # Emit Kafka event for AI monitoring
    await kafka_service.produce_tender_event(
        tender["tender_id"],
        "TENDER_CREATED",
        {"tender": tender, "created_by": current_user.sub},
    )

    logger.info(f"Tender created: {tender['tender_id']} by {current_user.sub}")
    return {"success": True, "tender": tender, "message": "Tender created successfully"}


@router.post("/{ministry_code}/{tender_id}/publish")
async def publish_tender(
    ministry_code: str,
    tender_id: str,
    current_user: TokenData = Depends(require_officer),
):
    """
    Publish a tender — opens it for bid submissions.
    ACCESS: MinistryOrg Officers only.
    """
    tender = await fabric_service.publish_tender(ministry_code, tender_id)

    await kafka_service.produce_tender_event(
        tender_id, "TENDER_PUBLISHED",
        {"tender": tender, "published_by": current_user.sub},
    )

    return {"success": True, "tender": tender, "message": f"Tender {tender_id} is now open for bidding"}


@router.post("/{ministry_code}/{tender_id}/freeze")
async def freeze_tender(
    ministry_code: str,
    tender_id: str,
    request: FreezeTenderRequest,
    current_user: TokenData = Depends(require_nic_admin),
):
    """
    Freeze a tender due to AI-detected fraud or NIC admin intervention.
    ACCESS: NICOrg only.
    """
    tender = await fabric_service.freeze_tender(ministry_code, tender_id, request.reason)

    await kafka_service.produce_tender_event(
        tender_id, "TENDER_FROZEN",
        {"tender": tender, "reason": request.reason, "frozen_by": current_user.sub},
    )

    return {"success": True, "tender": tender, "message": f"🚨 Tender {tender_id} FROZEN"}


@router.post("/{ministry_code}/{tender_id}/award")
async def award_tender(
    ministry_code: str,
    tender_id: str,
    request: AwardTenderRequest,
    current_user: TokenData = Depends(require_officer),
):
    """
    Award a tender to the winning bidder.
    ACCESS: MinistryOrg Officers only.
    """
    tender = await fabric_service.award_tender(
        ministry_code, tender_id, request.winning_bid_id,
    )

    await kafka_service.produce_tender_event(
        tender_id, "TENDER_AWARDED",
        {"tender": tender, "winning_bid": request.winning_bid_id, "awarded_by": current_user.sub},
    )

    return {"success": True, "tender": tender, "message": f"Tender {tender_id} awarded to {request.winning_bid_id}"}


@router.get("/{ministry_code}/{tender_id}/history")
async def get_tender_history(
    ministry_code: str,
    tender_id: str,
    current_user: TokenData = Depends(get_current_user),
):
    """
    Get the blockchain modification history of a tender.
    ACCESS: All authenticated users.
    """
    history = await fabric_service.get_tender_history(ministry_code, tender_id)
    return {"success": True, "tender_id": tender_id, "history": history}
