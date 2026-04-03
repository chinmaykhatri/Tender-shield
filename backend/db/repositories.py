"""
============================================================================
TenderShield — Repository Pattern (Data Access Layer)
============================================================================
Provides clean data access abstraction over SQLAlchemy ORM.

PATTERN:
  Service Layer → Repository → ORM → Database
  
  Routes/Services call repository methods.
  Repository handles queries, caching, and DB session management.
  ORM models are never exposed directly to routers.

REPOSITORIES:
  TenderRepository   — Tender CRUD + search + statistics
  BidRepository      — Bid commit/reveal/query
  AuditRepository    — Audit trail recording + queries
  AlertRepository    — AI alert management + review workflow

USAGE:
  repo = TenderRepository()
  tenders = await repo.get_by_status("BIDDING_OPEN")
  tender = await repo.create(tender_data)
============================================================================
"""

import uuid
import logging
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone, timedelta

from sqlalchemy import select, func, desc, and_
from sqlalchemy.ext.asyncio import AsyncSession

from backend.db.engine import get_session
from backend.db.orm_models import (
    TenderORM, BidORM, AuditEventORM, AIAlertORM, OfficerRiskORM,
    now_ist,
)

logger = logging.getLogger("tendershield.repository")
IST = timezone(timedelta(hours=5, minutes=30))


# ============================================================================
# Tender Repository
# ============================================================================

class TenderRepository:
    """Data access layer for tender operations."""

    async def create(self, data: Dict[str, Any], session: Optional[AsyncSession] = None) -> TenderORM:
        """Create a new tender record."""
        async def _create(s: AsyncSession) -> TenderORM:
            tender = TenderORM(**data)
            s.add(tender)
            await s.flush()
            logger.info(f"[TenderRepo] Created tender: {tender.tender_id}")
            return tender

        if session:
            return await _create(session)
        async with get_session() as s:
            return await _create(s)

    async def get_by_id(self, tender_id: str, session: Optional[AsyncSession] = None) -> Optional[TenderORM]:
        """Get tender by ID."""
        async def _get(s: AsyncSession) -> Optional[TenderORM]:
            result = await s.execute(select(TenderORM).where(TenderORM.tender_id == tender_id))
            return result.scalar_one_or_none()

        if session:
            return await _get(session)
        async with get_session() as s:
            return await _get(s)

    async def get_by_status(self, status: str, limit: int = 100,
                            session: Optional[AsyncSession] = None) -> List[TenderORM]:
        """Get tenders by status."""
        async def _get(s: AsyncSession) -> List[TenderORM]:
            result = await s.execute(
                select(TenderORM)
                .where(TenderORM.status == status)
                .order_by(desc(TenderORM.created_at_ist))
                .limit(limit)
            )
            return list(result.scalars().all())

        if session:
            return await _get(session)
        async with get_session() as s:
            return await _get(s)

    async def get_by_ministry(self, ministry_code: str, limit: int = 100,
                              session: Optional[AsyncSession] = None) -> List[TenderORM]:
        """Get tenders by ministry."""
        async def _get(s: AsyncSession) -> List[TenderORM]:
            result = await s.execute(
                select(TenderORM)
                .where(TenderORM.ministry_code == ministry_code)
                .order_by(desc(TenderORM.created_at_ist))
                .limit(limit)
            )
            return list(result.scalars().all())

        if session:
            return await _get(session)
        async with get_session() as s:
            return await _get(s)

    async def get_all(self, limit: int = 100,
                      session: Optional[AsyncSession] = None) -> List[TenderORM]:
        """Get all tenders with pagination."""
        async def _get(s: AsyncSession) -> List[TenderORM]:
            result = await s.execute(
                select(TenderORM)
                .order_by(desc(TenderORM.created_at_ist))
                .limit(limit)
            )
            return list(result.scalars().all())

        if session:
            return await _get(session)
        async with get_session() as s:
            return await _get(s)

    async def update_status(self, tender_id: str, status: str,
                            extras: Optional[Dict[str, Any]] = None,
                            session: Optional[AsyncSession] = None) -> Optional[TenderORM]:
        """Update tender status."""
        async def _update(s: AsyncSession) -> Optional[TenderORM]:
            tender = await self.get_by_id(tender_id, s)
            if not tender:
                return None
            tender.status = status
            tender.updated_at_ist = now_ist()
            if extras:
                for k, v in extras.items():
                    if hasattr(tender, k):
                        setattr(tender, k, v)
            await s.flush()
            logger.info(f"[TenderRepo] Updated {tender_id} → {status}")
            return tender

        if session:
            return await _update(session)
        async with get_session() as s:
            return await _update(s)

    async def get_stats(self, session: Optional[AsyncSession] = None) -> Dict[str, Any]:
        """Get aggregate statistics."""
        async def _stats(s: AsyncSession) -> Dict[str, Any]:
            total = await s.execute(select(func.count(TenderORM.tender_id)))
            active = await s.execute(
                select(func.count(TenderORM.tender_id))
                .where(TenderORM.status.in_(["PUBLISHED", "BIDDING_OPEN", "UNDER_EVALUATION"]))
            )
            flagged = await s.execute(
                select(func.count(TenderORM.tender_id))
                .where(TenderORM.status == "FROZEN_BY_AI")
            )
            total_value = await s.execute(
                select(func.sum(TenderORM.estimated_value_paise))
            )
            return {
                "total_tenders": total.scalar() or 0,
                "active_tenders": active.scalar() or 0,
                "flagged_tenders": flagged.scalar() or 0,
                "total_value_paise": total_value.scalar() or 0,
            }

        if session:
            return await _stats(session)
        async with get_session() as s:
            return await _stats(s)


# ============================================================================
# Bid Repository
# ============================================================================

class BidRepository:
    """Data access layer for bid operations."""

    async def create(self, data: Dict[str, Any],
                     session: Optional[AsyncSession] = None) -> BidORM:
        """Create a new bid record."""
        async def _create(s: AsyncSession) -> BidORM:
            bid = BidORM(**data)
            s.add(bid)
            await s.flush()
            logger.info(f"[BidRepo] Created bid: {bid.bid_id}")
            return bid

        if session:
            return await _create(session)
        async with get_session() as s:
            return await _create(s)

    async def get_by_id(self, bid_id: str,
                        session: Optional[AsyncSession] = None) -> Optional[BidORM]:
        """Get bid by ID."""
        async def _get(s: AsyncSession) -> Optional[BidORM]:
            result = await s.execute(select(BidORM).where(BidORM.bid_id == bid_id))
            return result.scalar_one_or_none()

        if session:
            return await _get(session)
        async with get_session() as s:
            return await _get(s)

    async def get_by_tender(self, tender_id: str,
                            session: Optional[AsyncSession] = None) -> List[BidORM]:
        """Get all bids for a tender."""
        async def _get(s: AsyncSession) -> List[BidORM]:
            result = await s.execute(
                select(BidORM)
                .where(BidORM.tender_id == tender_id)
                .order_by(BidORM.submitted_at_ist)
            )
            return list(result.scalars().all())

        if session:
            return await _get(session)
        async with get_session() as s:
            return await _get(s)

    async def reveal(self, bid_id: str, amount_paise: int,
                     session: Optional[AsyncSession] = None) -> Optional[BidORM]:
        """Reveal a committed bid amount."""
        async def _reveal(s: AsyncSession) -> Optional[BidORM]:
            bid = await self.get_by_id(bid_id, s)
            if not bid:
                return None
            bid.revealed_amount_paise = amount_paise
            bid.status = "REVEALED"
            bid.reveal_at_ist = now_ist()
            await s.flush()
            logger.info(f"[BidRepo] Revealed bid {bid_id}: ₹{amount_paise / 100:,.2f}")
            return bid

        if session:
            return await _reveal(session)
        async with get_session() as s:
            return await _reveal(s)


# ============================================================================
# Audit Event Repository
# ============================================================================

class AuditRepository:
    """Data access layer for audit trail."""

    async def record(self, event_type: str, actor_did: str, actor_role: str,
                     tender_id: str, description: str, payload_hash: str,
                     risk_level: str = "INFO",
                     blockchain_tx_id: Optional[str] = None,
                     session: Optional[AsyncSession] = None) -> AuditEventORM:
        """Record a new audit event."""
        async def _record(s: AsyncSession) -> AuditEventORM:
            event = AuditEventORM(
                event_id=str(uuid.uuid4()),
                event_type=event_type,
                actor_did=actor_did,
                actor_role=actor_role,
                tender_id=tender_id,
                payload_hash=payload_hash,
                description=description,
                risk_level=risk_level,
                blockchain_tx_id=blockchain_tx_id,
            )
            s.add(event)
            await s.flush()
            return event

        if session:
            return await _record(session)
        async with get_session() as s:
            return await _record(s)

    async def get_by_tender(self, tender_id: str,
                            session: Optional[AsyncSession] = None) -> List[AuditEventORM]:
        """Get audit trail for a tender."""
        async def _get(s: AsyncSession) -> List[AuditEventORM]:
            result = await s.execute(
                select(AuditEventORM)
                .where(AuditEventORM.tender_id == tender_id)
                .order_by(AuditEventORM.timestamp_ist)
            )
            return list(result.scalars().all())

        if session:
            return await _get(session)
        async with get_session() as s:
            return await _get(s)

    async def get_recent(self, limit: int = 50,
                         session: Optional[AsyncSession] = None) -> List[AuditEventORM]:
        """Get recent audit events."""
        async def _get(s: AsyncSession) -> List[AuditEventORM]:
            result = await s.execute(
                select(AuditEventORM)
                .order_by(desc(AuditEventORM.timestamp_ist))
                .limit(limit)
            )
            return list(result.scalars().all())

        if session:
            return await _get(session)
        async with get_session() as s:
            return await _get(s)


# ============================================================================
# AI Alert Repository
# ============================================================================

class AlertRepository:
    """Data access layer for AI fraud alerts."""

    async def create(self, data: Dict[str, Any],
                     session: Optional[AsyncSession] = None) -> AIAlertORM:
        """Create a new AI alert."""
        async def _create(s: AsyncSession) -> AIAlertORM:
            alert = AIAlertORM(**data)
            s.add(alert)
            await s.flush()
            logger.info(f"[AlertRepo] Created alert: {alert.alert_id} score={alert.risk_score}")
            return alert

        if session:
            return await _create(session)
        async with get_session() as s:
            return await _create(s)

    async def get_open(self, limit: int = 50,
                       session: Optional[AsyncSession] = None) -> List[AIAlertORM]:
        """Get open (unreviewed) alerts."""
        async def _get(s: AsyncSession) -> List[AIAlertORM]:
            result = await s.execute(
                select(AIAlertORM)
                .where(AIAlertORM.status == "OPEN")
                .order_by(desc(AIAlertORM.risk_score))
                .limit(limit)
            )
            return list(result.scalars().all())

        if session:
            return await _get(session)
        async with get_session() as s:
            return await _get(s)

    async def review(self, alert_id: str, reviewer_did: str, new_status: str,
                     session: Optional[AsyncSession] = None) -> Optional[AIAlertORM]:
        """Mark an alert as reviewed."""
        async def _review(s: AsyncSession) -> Optional[AIAlertORM]:
            result = await s.execute(select(AIAlertORM).where(AIAlertORM.alert_id == alert_id))
            alert = result.scalar_one_or_none()
            if not alert:
                return None
            alert.status = new_status
            alert.reviewed_by_did = reviewer_did
            alert.reviewed_at_ist = now_ist()
            await s.flush()
            logger.info(f"[AlertRepo] Alert {alert_id} reviewed → {new_status}")
            return alert

        if session:
            return await _review(session)
        async with get_session() as s:
            return await _review(s)

    async def get_stats(self, session: Optional[AsyncSession] = None) -> Dict[str, Any]:
        """Get alert statistics."""
        async def _stats(s: AsyncSession) -> Dict[str, Any]:
            total = await s.execute(select(func.count(AIAlertORM.alert_id)))
            open_count = await s.execute(
                select(func.count(AIAlertORM.alert_id))
                .where(AIAlertORM.status == "OPEN")
            )
            avg_score = await s.execute(select(func.avg(AIAlertORM.risk_score)))
            return {
                "total_alerts": total.scalar() or 0,
                "open_alerts": open_count.scalar() or 0,
                "avg_risk_score": round(avg_score.scalar() or 0, 1),
            }

        if session:
            return await _stats(session)
        async with get_session() as s:
            return await _stats(s)
