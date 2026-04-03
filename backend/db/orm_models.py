"""
============================================================================
TenderShield — SQLAlchemy ORM Models
============================================================================
Database models mapped to PostgreSQL/SQLite tables.

These models mirror the Pydantic schemas in data_models.py but are
designed for persistent storage with proper indices, constraints,
and relationships.

TABLES:
  tenders         — Government procurement tenders
  bids            — Committed/revealed bid records
  audit_events    — Immutable audit trail (synced from blockchain)
  ai_alerts       — AI-generated fraud alerts
  officer_risk    — Officer risk ledger

NOTES:
  • All monetary fields use BigInteger (paise, int64)
  • All timestamps stored in IST (UTC+5:30)
  • tender_id is the natural key (not auto-increment)
  • Blockchain TX IDs stored for cross-reference
============================================================================
"""

from datetime import datetime, timezone, timedelta
from typing import Optional

from sqlalchemy import (
    String, Integer, BigInteger, Float, Boolean, Text,
    DateTime, JSON, Index, ForeignKey, Enum as SAEnum,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.db.engine import Base

IST = timezone(timedelta(hours=5, minutes=30))


def now_ist() -> datetime:
    return datetime.now(IST)


# ============================================================================
# Tender Table
# ============================================================================

class TenderORM(Base):
    """
    Government procurement tender record.
    Primary entity — all bids, audits, and alerts reference this.
    """
    __tablename__ = "tenders"

    tender_id: Mapped[str] = mapped_column(String(50), primary_key=True)
    ministry_code: Mapped[str] = mapped_column(String(15), nullable=False, index=True)
    department: Mapped[str] = mapped_column(String(200), default="")
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="")
    estimated_value_paise: Mapped[int] = mapped_column(BigInteger, nullable=False)
    category: Mapped[str] = mapped_column(String(20), nullable=False, default="GOODS")
    procurement_method: Mapped[str] = mapped_column(String(20), nullable=False, default="OPEN")
    gem_category_id: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    documents_ipfs_hash: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    deadline_ist: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    evaluation_criteria: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    gfr_rule_reference: Mapped[str] = mapped_column(String(30), default="GFR Rule 149")

    # Status tracking
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="DRAFT", index=True)
    freeze_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    winning_bid_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # Identity
    created_by_did: Mapped[str] = mapped_column(String(100), nullable=False)
    created_at_ist: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_ist)
    updated_at_ist: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_ist, onupdate=now_ist)

    # Blockchain cross-references
    blockchain_tx_id: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    blockchain_block: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    blockchain_mode: Mapped[str] = mapped_column(String(30), default="SHA256_AUDIT_LOG")

    # AI scoring
    ai_risk_score: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    ai_scoring_mode: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    ai_recommended_action: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)

    # Relationships
    bids: Mapped[list["BidORM"]] = relationship(back_populates="tender", lazy="selectin")
    audit_events: Mapped[list["AuditEventORM"]] = relationship(back_populates="tender", lazy="selectin")
    ai_alerts: Mapped[list["AIAlertORM"]] = relationship(back_populates="tender", lazy="selectin")

    __table_args__ = (
        Index("ix_tenders_ministry_status", "ministry_code", "status"),
        Index("ix_tenders_created_at", "created_at_ist"),
    )

    def __repr__(self) -> str:
        return f"<Tender {self.tender_id} [{self.status}]>"


# ============================================================================
# Bid Table
# ============================================================================

class BidORM(Base):
    """
    Bid record with ZKP commit-reveal lifecycle.
    Phase 1 (COMMITTED): Only commitment_hash stored.
    Phase 2 (REVEALED): revealed_amount_paise populated.
    """
    __tablename__ = "bids"

    bid_id: Mapped[str] = mapped_column(String(120), primary_key=True)
    tender_id: Mapped[str] = mapped_column(String(50), ForeignKey("tenders.tender_id"), nullable=False, index=True)

    # Bidder identity
    bidder_did: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    bidder_gstin: Mapped[Optional[str]] = mapped_column(String(15), nullable=True)
    bidder_pan: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    msme_registered: Mapped[bool] = mapped_column(Boolean, default=False)
    dpiit_number: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    # ZKP commit-reveal
    commitment_hash: Mapped[str] = mapped_column(String(128), nullable=False)
    zkp_proof: Mapped[str] = mapped_column(Text, nullable=False)
    revealed_amount_paise: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    documents_ipfs_hash: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # Timestamps
    submitted_at_ist: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_ist)
    reveal_at_ist: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Status + AI
    status: Mapped[str] = mapped_column(String(20), default="COMMITTED", index=True)
    ai_risk_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # Blockchain
    blockchain_tx_id: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    blockchain_mode: Mapped[str] = mapped_column(String(30), default="SHA256_AUDIT_LOG")

    # Relationships
    tender: Mapped["TenderORM"] = relationship(back_populates="bids")

    __table_args__ = (
        Index("ix_bids_tender_status", "tender_id", "status"),
    )

    def __repr__(self) -> str:
        return f"<Bid {self.bid_id} on {self.tender_id} [{self.status}]>"


# ============================================================================
# Audit Event Table
# ============================================================================

class AuditEventORM(Base):
    """
    Immutable audit trail record.
    Synced from blockchain — every tender lifecycle event is recorded.
    Admissible as evidence under IT Act 2000 Section 65B.
    """
    __tablename__ = "audit_events"

    event_id: Mapped[str] = mapped_column(String(50), primary_key=True)
    event_type: Mapped[str] = mapped_column(String(30), nullable=False, index=True)
    actor_did: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    actor_role: Mapped[str] = mapped_column(String(20), nullable=False)
    tender_id: Mapped[str] = mapped_column(String(50), ForeignKey("tenders.tender_id"), nullable=False, index=True)
    payload_hash: Mapped[str] = mapped_column(String(128), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    risk_level: Mapped[str] = mapped_column(String(10), default="INFO")
    timestamp_ist: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_ist, index=True)
    blockchain_tx_id: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)

    # Relationships
    tender: Mapped["TenderORM"] = relationship(back_populates="audit_events")

    def __repr__(self) -> str:
        return f"<AuditEvent {self.event_id} [{self.event_type}]>"


# ============================================================================
# AI Alert Table
# ============================================================================

class AIAlertORM(Base):
    """
    AI-generated fraud alerts with full evidence chain.
    References the ML model that generated the alert.
    """
    __tablename__ = "ai_alerts"

    alert_id: Mapped[str] = mapped_column(String(50), primary_key=True)
    tender_id: Mapped[str] = mapped_column(String(50), ForeignKey("tenders.tender_id"), nullable=False, index=True)
    alert_type: Mapped[str] = mapped_column(String(30), nullable=False)
    confidence_score: Mapped[float] = mapped_column(Float, nullable=False)
    risk_score: Mapped[int] = mapped_column(Integer, nullable=False)
    flagged_entities: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    evidence: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    recommended_action: Mapped[str] = mapped_column(String(20), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="OPEN", index=True)

    # ML model metadata
    scoring_mode: Mapped[str] = mapped_column(String(20), default="RULE_BASED")
    ml_fraud_probability: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    anomaly_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    model_agreement: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)

    # Review tracking
    created_at_ist: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_ist)
    reviewed_by_did: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    reviewed_at_ist: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    tender: Mapped["TenderORM"] = relationship(back_populates="ai_alerts")

    __table_args__ = (
        Index("ix_ai_alerts_risk", "risk_score"),
        Index("ix_ai_alerts_status", "status", "created_at_ist"),
    )

    def __repr__(self) -> str:
        return f"<AIAlert {self.alert_id} [{self.alert_type}] score={self.risk_score}>"


# ============================================================================
# Officer Risk Ledger
# ============================================================================

class OfficerRiskORM(Base):
    """
    Officer risk ledger — tracks procurement officers' risk profiles.
    Cumulative risk score based on tenders they've managed.
    """
    __tablename__ = "officer_risk"

    officer_did: Mapped[str] = mapped_column(String(100), primary_key=True)
    officer_name: Mapped[str] = mapped_column(String(200), nullable=False)
    ministry_code: Mapped[str] = mapped_column(String(15), nullable=False, index=True)
    department: Mapped[str] = mapped_column(String(200), default="")
    cumulative_risk_score: Mapped[float] = mapped_column(Float, default=0.0)
    total_tenders_managed: Mapped[int] = mapped_column(Integer, default=0)
    flagged_tenders_count: Mapped[int] = mapped_column(Integer, default=0)
    frozen_tenders_count: Mapped[int] = mapped_column(Integer, default=0)
    escalated_count: Mapped[int] = mapped_column(Integer, default=0)
    trust_score: Mapped[float] = mapped_column(Float, default=100.0)
    last_activity_ist: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_ist)
    created_at_ist: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_ist)

    __table_args__ = (
        Index("ix_officer_risk_score", "cumulative_risk_score"),
    )

    def __repr__(self) -> str:
        return f"<OfficerRisk {self.officer_did} trust={self.trust_score:.1f}>"
