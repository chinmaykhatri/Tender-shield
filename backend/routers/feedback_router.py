"""
============================================================================
TenderShield — Feedback Router (Behavioral Learning API)
============================================================================
API endpoints for officer outcome labeling and feedback statistics.

ENDPOINTS:
  POST /api/v1/feedback/label   — Submit outcome label for a tender
  GET  /api/v1/feedback/stats   — Get aggregate feedback statistics
  GET  /api/v1/feedback/records — List all feedback records (auditors only)
  GET  /api/v1/feedback/retraining — Retraining data summary

ACCESS CONTROL:
  - label:      OFFICER, AUDITOR, NIC_ADMIN
  - stats:      All authenticated users
  - records:    AUDITOR, NIC_ADMIN only
  - retraining: AUDITOR, NIC_ADMIN only
============================================================================
"""

import logging
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from datetime import datetime, timezone, timedelta

from backend.auth.jwt_handler import TokenData, get_current_user

logger = logging.getLogger("tendershield.routers.feedback")
IST = timezone(timedelta(hours=5, minutes=30))

router = APIRouter(prefix="/api/v1/feedback", tags=["Behavioral Learning"])


class FeedbackRequest(BaseModel):
    """Officer outcome label for a tender."""
    tender_id: str = Field(..., description="Tender ID to label")
    label: str = Field(
        ...,
        description="Outcome label: CLEAN, SUSPICIOUS, FRAUD_CONFIRMED, or FALSE_POSITIVE",
    )
    risk_score: int = Field(
        default=0, description="Original AI composite risk score"
    )
    detector_results: dict = Field(
        default_factory=dict, description="Per-detector breakdown from the AI"
    )
    notes: str = Field(
        default="", description="Officer notes explaining the decision"
    )


@router.post("/label")
async def submit_feedback(
    request: FeedbackRequest,
    current_user: TokenData = Depends(get_current_user),
):
    """
    Submit an outcome label for a tender.

    This is the core of the behavioral learning loop:
    1. Officer reviews AI risk assessment
    2. Officer provides ground truth label
    3. Label feeds into model retraining pipeline
    4. Model gets smarter → better risk scores → more trust

    Only OFFICER, AUDITOR, and NIC_ADMIN roles can label tenders.
    """
    if current_user.role not in ("OFFICER", "AUDITOR", "NIC_ADMIN"):
        raise HTTPException(
            status_code=403,
            detail="Only officers and auditors can label tender outcomes",
        )

    from ai_engine.ml.feedback_store import store_feedback

    try:
        result = store_feedback(
            tender_id=request.tender_id,
            label=request.label,
            officer_did=current_user.sub,
            risk_score=request.risk_score,
            detector_results=request.detector_results,
            notes=request.notes,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return result


@router.get("/stats")
async def get_feedback_stats(
    current_user: TokenData = Depends(get_current_user),
):
    """
    Get aggregate feedback statistics.

    Returns:
    - Total labels collected
    - Label distribution (CLEAN, FRAUD_CONFIRMED, etc.)
    - False positive rate (measures AI accuracy)
    - Data moat score (0-100, higher = harder to replace)
    - Whether the system has enough data for retraining
    """
    from ai_engine.ml.feedback_store import get_feedback_stats

    stats = get_feedback_stats()
    return {"success": True, "stats": stats}


@router.get("/records")
async def list_feedback(
    current_user: TokenData = Depends(get_current_user),
):
    """
    List all feedback records (most recent 100).
    Restricted to auditors and admins.
    """
    if current_user.role not in ("AUDITOR", "NIC_ADMIN"):
        raise HTTPException(
            status_code=403,
            detail="Only auditors can view all feedback records",
        )

    from ai_engine.ml.feedback_store import get_all_feedback

    records = get_all_feedback()
    return {
        "success": True,
        "count": len(records),
        "records": records[-100:],  # Most recent 100
    }


@router.get("/retraining")
async def get_retraining_status(
    current_user: TokenData = Depends(get_current_user),
):
    """
    Get retraining data readiness summary.
    Shows whether we have enough labeled data to retrain the ML model.
    """
    if current_user.role not in ("AUDITOR", "NIC_ADMIN", "OFFICER"):
        raise HTTPException(
            status_code=403,
            detail="Insufficient permissions",
        )

    from ai_engine.ml.feedback_store import get_retraining_summary

    summary = get_retraining_summary()
    return {"success": True, "retraining": summary}
