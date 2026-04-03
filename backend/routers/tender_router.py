"""
============================================================================
TenderShield — Tender API Router (ORM-Integrated)
============================================================================
RESTful endpoints for tender lifecycle management.
Dual-write: ORM (PostgreSQL/SQLite) + Blockchain (Fabric/Simulation).
All write operations trigger event bus notifications for AI monitoring.
============================================================================
"""

import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status

from backend.auth.jwt_handler import (
    TokenData, get_current_user, require_officer, require_nic_admin
)
from backend.services.fabric_service import fabric_service
from backend.services.event_bus import event_bus
from backend.db.repositories import TenderRepository, AuditRepository
from backend.models.data_models import (
    CreateTenderRequest, FreezeTenderRequest, AwardTenderRequest
)

logger = logging.getLogger("tendershield.routers.tender")
router = APIRouter(prefix="/api/v1/tenders", tags=["Tenders"])

tender_repo = TenderRepository()
audit_repo = AuditRepository()


@router.get("/")
async def list_tenders(
    status_filter: Optional[str] = None,
    ministry: Optional[str] = None,
    limit: int = 100,
    current_user: TokenData = Depends(get_current_user),
):
    """
    List all tenders, optionally filtered by status or ministry.
    Reads from ORM first, falls back to blockchain state.
    ACCESS: All authenticated users.
    """
    # Try ORM first
    try:
        if status_filter:
            orm_tenders = await tender_repo.get_by_status(status_filter, limit)
        elif ministry:
            orm_tenders = await tender_repo.get_by_ministry(ministry, limit)
        else:
            orm_tenders = await tender_repo.get_all(limit)

        if orm_tenders:
            tenders = []
            for t in orm_tenders:
                tenders.append({
                    "tender_id": t.tender_id,
                    "ministry_code": t.ministry_code,
                    "department": t.department,
                    "title": t.title,
                    "estimated_value_paise": t.estimated_value_paise,
                    "category": t.category,
                    "procurement_method": t.procurement_method,
                    "status": t.status,
                    "gfr_rule_reference": t.gfr_rule_reference,
                    "created_by_did": t.created_by_did,
                    "created_at_ist": t.created_at_ist.isoformat() if t.created_at_ist else None,
                    "blockchain_tx_id": t.blockchain_tx_id,
                    "blockchain_mode": t.blockchain_mode,
                    "ai_risk_score": t.ai_risk_score,
                    "data_source": "ORM",
                })
            return {
                "success": True,
                "count": len(tenders),
                "tenders": tenders,
                "filtered_by": status_filter or ministry,
                "data_source": "ORM",
            }
    except Exception as e:
        logger.warning(f"ORM read failed, falling back to blockchain: {e}")

    # Fallback to blockchain state
    if status_filter:
        tenders = await fabric_service.query_tenders_by_status(status_filter)
    else:
        tenders = await fabric_service.query_all_tenders()

    return {
        "success": True,
        "count": len(tenders),
        "tenders": tenders,
        "filtered_by": status_filter,
        "data_source": "BLOCKCHAIN",
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
    # Try ORM first
    full_id = f"TDR-{ministry_code}-{tender_id}" if not tender_id.startswith("TDR-") else tender_id
    try:
        orm_tender = await tender_repo.get_by_id(full_id)
        if orm_tender:
            return {
                "success": True,
                "tender": {
                    "tender_id": orm_tender.tender_id,
                    "ministry_code": orm_tender.ministry_code,
                    "department": orm_tender.department,
                    "title": orm_tender.title,
                    "description": orm_tender.description,
                    "estimated_value_paise": orm_tender.estimated_value_paise,
                    "category": orm_tender.category,
                    "procurement_method": orm_tender.procurement_method,
                    "status": orm_tender.status,
                    "ai_risk_score": orm_tender.ai_risk_score,
                    "blockchain_tx_id": orm_tender.blockchain_tx_id,
                    "blockchain_mode": orm_tender.blockchain_mode,
                    "created_by_did": orm_tender.created_by_did,
                    "data_source": "ORM",
                },
            }
    except Exception:
        pass

    # Fallback
    tender = await fabric_service.query_tender_by_id(ministry_code, tender_id)
    if not tender:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tender {tender_id} not found in {ministry_code}",
        )
    return {"success": True, "tender": tender, "data_source": "BLOCKCHAIN"}


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_tender(
    request: CreateTenderRequest,
    current_user: TokenData = Depends(require_officer),
):
    """
    Create a new tender with GFR 2017 compliance validation.
    Dual-write: ORM + Blockchain.
    ACCESS: MinistryOrg Officers only.
    """
    tender_data = request.model_dump()
    tender = await fabric_service.create_tender(tender_data, current_user.sub)

    # Persist to ORM
    try:
        import hashlib
        await tender_repo.create({
            "tender_id": tender["tender_id"],
            "ministry_code": tender_data.get("ministry_code", ""),
            "department": tender_data.get("department", ""),
            "title": tender_data.get("title", ""),
            "description": tender_data.get("description", ""),
            "estimated_value_paise": tender_data.get("estimated_value_paise", 0),
            "category": tender_data.get("category", "GOODS"),
            "procurement_method": tender_data.get("procurement_method", "OPEN"),
            "gfr_rule_reference": tender_data.get("gfr_rule_reference", "GFR Rule 149"),
            "status": tender.get("status", "DRAFT"),
            "created_by_did": current_user.sub,
            "blockchain_tx_id": tender.get("blockchain_tx_id"),
            "blockchain_mode": tender.get("blockchain_mode", "SHA256_AUDIT_LOG"),
        })
        # Record audit event
        await audit_repo.record(
            event_type="TENDER_CREATED",
            actor_did=current_user.sub,
            actor_role="OFFICER",
            tender_id=tender["tender_id"],
            description=f"Tender created: {tender_data.get('title', '')}",
            payload_hash=hashlib.sha256(str(tender).encode()).hexdigest(),
            blockchain_tx_id=tender.get("blockchain_tx_id"),
        )
    except Exception as e:
        logger.warning(f"ORM write failed (blockchain write succeeded): {e}")

    # Emit event
    await event_bus.publish_tender_event(
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

    # Update ORM
    full_id = tender.get("tender_id", f"TDR-{ministry_code}-{tender_id}")
    try:
        await tender_repo.update_status(full_id, "PUBLISHED")
    except Exception as e:
        logger.warning(f"ORM update failed: {e}")

    await event_bus.publish_tender_event(
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

    full_id = tender.get("tender_id", f"TDR-{ministry_code}-{tender_id}")
    try:
        await tender_repo.update_status(full_id, "FROZEN_BY_AI", {
            "freeze_reason": request.reason,
        })
    except Exception as e:
        logger.warning(f"ORM update failed: {e}")

    await event_bus.publish_tender_event(
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

    full_id = tender.get("tender_id", f"TDR-{ministry_code}-{tender_id}")
    try:
        await tender_repo.update_status(full_id, "AWARDED", {
            "winning_bid_id": request.winning_bid_id,
        })
    except Exception as e:
        logger.warning(f"ORM update failed: {e}")

    await event_bus.publish_tender_event(
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
    Also includes ORM audit trail.
    ACCESS: All authenticated users.
    """
    history = await fabric_service.get_tender_history(ministry_code, tender_id)

    # Enrich with ORM audit events
    full_id = f"TDR-{ministry_code}-{tender_id}" if not tender_id.startswith("TDR-") else tender_id
    try:
        audit_events = await audit_repo.get_by_tender(full_id)
        orm_history = [{
            "event_type": e.event_type,
            "actor_did": e.actor_did,
            "description": e.description,
            "timestamp_ist": e.timestamp_ist.isoformat() if e.timestamp_ist else None,
            "source": "ORM",
        } for e in audit_events]
    except Exception:
        orm_history = []

    return {
        "success": True,
        "tender_id": tender_id,
        "blockchain_history": history,
        "orm_audit_trail": orm_history,
    }


@router.get("/stats/aggregate")
async def get_tender_stats(
    current_user: TokenData = Depends(get_current_user),
):
    """
    Get aggregate tender statistics from the ORM.
    ACCESS: All authenticated users.
    """
    try:
        stats = await tender_repo.get_stats()
        return {"success": True, "stats": stats, "source": "ORM"}
    except Exception as e:
        return {"success": True, "stats": await fabric_service.get_dashboard_stats(), "source": "BLOCKCHAIN"}
