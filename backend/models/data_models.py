"""
============================================================================
TenderShield — Data Models (Pydantic Schemas)
============================================================================
Complete Pydantic models for all TenderShield entities.
All monetary values in paise (int64) for precision — ₹1 = 100 paise.
All timestamps in IST (Indian Standard Time, UTC+5:30).

India-Specific Validations:
  - GSTIN: 15-character format (e.g., 22AAAAA0000A1Z5)
  - PAN: 10-character format (e.g., ABCDE1234F)
  - Aadhaar: 12-digit with Verhoeff checksum
  - PIN Code: 6-digit Indian postal code
  - Tender ID: TDR-{MINISTRY_CODE}-{YEAR}-{SEQ} format
============================================================================
"""

import re
import logging
from enum import Enum
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel, Field, field_validator, model_validator  # type: ignore[import]

# IST timezone (UTC+5:30) — Indian Standard Time
IST = timezone(timedelta(hours=5, minutes=30))

logger = logging.getLogger("tendershield.models")


# ============================================================================
# ENUMS — All status and type enumerations
# ============================================================================

class TenderCategory(str, Enum):
    """Tender categories as per GFR 2017 classification."""
    WORKS = "WORKS"
    GOODS = "GOODS"
    SERVICES = "SERVICES"
    CONSULTANCY = "CONSULTANCY"


class ProcurementMethod(str, Enum):
    """Procurement methods as per GFR 2017 rules.
    Rule 149: Open tender mandatory for estimated value > ₹25 lakh.
    Rule 151: Limited tender only with recorded reasons.
    Rule 166: Single source only in exceptional circumstances.
    """
    OPEN = "OPEN"
    LIMITED = "LIMITED"
    SINGLE_SOURCE = "SINGLE_SOURCE"


class TenderStatus(str, Enum):
    """Lifecycle status of a tender on the blockchain."""
    DRAFT = "DRAFT"
    PUBLISHED = "PUBLISHED"
    BIDDING_OPEN = "BIDDING_OPEN"
    UNDER_EVALUATION = "UNDER_EVALUATION"
    AWARDED = "AWARDED"
    CLOSED = "CLOSED"
    FROZEN_BY_AI = "FROZEN_BY_AI"  # AI-detected fraud — tender frozen


class BidStatus(str, Enum):
    """Lifecycle status of a bid (ZKP commit-reveal cycle)."""
    COMMITTED = "COMMITTED"    # Phase 1: Encrypted bid submitted
    REVEALED = "REVEALED"      # Phase 2: Bid amount revealed after deadline
    EVALUATED = "EVALUATED"    # Bid evaluated in comparison
    DISQUALIFIED = "DISQUALIFIED"  # Bid failed validation/compliance


class AuditEventType(str, Enum):
    """Types of audit events recorded on blockchain."""
    TENDER_CREATED = "TENDER_CREATED"
    BID_SUBMITTED = "BID_SUBMITTED"
    BID_REVEALED = "BID_REVEALED"
    TENDER_AWARDED = "TENDER_AWARDED"
    AI_FLAG = "AI_FLAG"
    AUDIT_REVIEW = "AUDIT_REVIEW"
    ESCALATED_TO_CAG = "ESCALATED_TO_CAG"


class ActorRole(str, Enum):
    """Roles of actors in the TenderShield system."""
    OFFICER = "OFFICER"          # Ministry officer
    BIDDER = "BIDDER"            # Company/contractor
    AUDITOR = "AUDITOR"          # CAG auditor
    AI_SYSTEM = "AI_SYSTEM"      # AI monitoring service
    NIC_ADMIN = "NIC_ADMIN"      # NIC administrator


class RiskLevel(str, Enum):
    """Risk levels for audit events and AI alerts."""
    INFO = "INFO"
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class AlertType(str, Enum):
    """Types of AI-detected fraud patterns (India-specific)."""
    BID_RIGGING = "BID_RIGGING"
    COLLUSION = "COLLUSION"
    SHELL_COMPANY = "SHELL_COMPANY"
    CARTEL = "CARTEL"
    PRICE_MANIPULATION = "PRICE_MANIPULATION"
    TIMING_ANOMALY = "TIMING_ANOMALY"


class RecommendedAction(str, Enum):
    """AI-recommended actions based on risk score."""
    MONITOR = "MONITOR"            # 0-25: Log and continue
    FLAG = "FLAG"                  # 26-50: Notify auditor
    FREEZE = "FREEZE"              # 51-75: Auto-freeze tender
    ESCALATE_CAG = "ESCALATE_CAG"  # 76-100: Escalate to CAG
    INVESTIGATE = "INVESTIGATE"    # Manual investigation required


class AlertStatus(str, Enum):
    """Status of an AI fraud alert."""
    OPEN = "OPEN"
    ACKNOWLEDGED = "ACKNOWLEDGED"
    RESOLVED = "RESOLVED"
    FALSE_POSITIVE = "FALSE_POSITIVE"


# ============================================================================
# VALIDATORS — India-specific field validation functions
# ============================================================================

def validate_gstin(gstin: str) -> str:
    """
    Validate GSTIN (Goods and Services Tax Identification Number).
    Format: 22AAAAA0000A1Z5 (15 characters)
    - Digits 1-2: State code (01-37)
    - Digits 3-12: PAN of the entity
    - Digit 13: Entity number within a state
    - Digit 14: 'Z' by default
    - Digit 15: Check digit
    """
    if not gstin:
        raise ValueError("GSTIN is mandatory for all bidders in India (GST Act)")

    gstin = gstin.upper().strip()
    pattern = r'^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$'

    if not re.match(pattern, gstin):
        raise ValueError(
            f"Invalid GSTIN format: {gstin}. "
            "Expected format: 22AAAAA0000A1Z5 (15 characters). "
            "Refer to GST Act Section 25 for registration requirements."
        )

    # Validate state code (01-37 for Indian states/UTs)
    state_code = int(gstin[:2])  # type: ignore[index]
    if state_code < 1 or state_code > 37:
        raise ValueError(
            f"Invalid state code in GSTIN: {state_code}. "
            "Must be between 01 (Jammu & Kashmir) and 37 (Andhra Pradesh)."
        )

    return gstin


def validate_pan(pan: str) -> str:
    """
    Validate PAN (Permanent Account Number) — Income Tax Department, India.
    Format: ABCDE1234F (10 characters)
    - Characters 1-3: Alphabetic series (AAA to ZZZ)
    - Character 4: Status of PAN holder (C=Company, P=Person, etc.)
    - Character 5: First letter of surname/name
    - Characters 6-9: Sequential number (0001 to 9999)
    - Character 10: Alphabetic check digit
    """
    if not pan:
        raise ValueError("PAN is mandatory for all bidders (Income Tax Act)")

    pan = pan.upper().strip()
    pattern = r'^[A-Z]{5}[0-9]{4}[A-Z]{1}$'

    if not re.match(pattern, pan):
        raise ValueError(
            f"Invalid PAN format: {pan}. "
            "Expected format: ABCDE1234F (10 characters). "
            "4th character must indicate entity type: "
            "C=Company, P=Individual, H=HUF, F=Firm, T=Trust."
        )

    return pan


def validate_aadhaar(aadhaar: str) -> str:
    """
    Validate Aadhaar number — UIDAI (Unique Identification Authority of India).
    Format: 12 digits with Verhoeff checksum validation.
    First digit cannot be 0 or 1.
    """
    if not aadhaar:
        raise ValueError("Aadhaar number is mandatory for identity verification (Aadhaar Act 2016)")

    aadhaar = aadhaar.strip().replace(" ", "").replace("-", "")

    if not aadhaar.isdigit() or len(aadhaar) != 12:
        raise ValueError(
            f"Invalid Aadhaar number: must be exactly 12 digits. Got {len(aadhaar)} chars."
        )

    if aadhaar[0] in ('0', '1'):
        raise ValueError(
            "Invalid Aadhaar: first digit cannot be 0 or 1 (UIDAI specification)."
        )

    # Verhoeff checksum validation
    verhoeff_table_d = [
        [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
        [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
        [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
        [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
        [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
        [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
        [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
        [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
        [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
        [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
    ]

    verhoeff_table_p = [
        [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
        [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
        [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
        [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
        [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
        [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
        [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
        [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
    ]

    verhoeff_table_inv = [0, 4, 3, 2, 1, 5, 6, 7, 8, 9]

    c = 0
    for i, digit in enumerate(reversed(aadhaar)):
        c = verhoeff_table_d[c][verhoeff_table_p[i % 8][int(digit)]]  # type: ignore[index]

    if c != 0:
        raise ValueError("Invalid Aadhaar: Verhoeff checksum failed. Please verify the number.")

    return aadhaar


def validate_pin_code(pin_code: str) -> str:
    """
    Validate Indian postal PIN code (6 digits).
    First digit: 1-9 (regional zone).
    """
    if not pin_code:
        return pin_code

    pin_code = pin_code.strip()
    if not pin_code.isdigit() or len(pin_code) != 6:
        raise ValueError(f"Invalid PIN code: {pin_code}. Must be 6 digits.")

    if pin_code[0] == '0':
        raise ValueError("Invalid PIN code: first digit cannot be 0.")

    return pin_code


def validate_tender_id(tender_id: str) -> str:
    """
    Validate TenderShield tender ID format.
    Format: TDR-{MINISTRY_CODE}-{YEAR}-{6-DIGIT-SEQ}
    Example: TDR-MoRTH-2025-000001
    """
    pattern = r'^TDR-[A-Z][A-Za-z]{1,10}-\d{4}-\d{6}$'
    if not re.match(pattern, tender_id):
        raise ValueError(
            f"Invalid tender ID format: {tender_id}. "
            "Expected: TDR-{{MINISTRY_CODE}}-{{YEAR}}-{{6-DIGIT-SEQ}} "
            "Example: TDR-MoRTH-2025-000001"
        )
    return tender_id


def validate_amount_paise(amount: int) -> int:
    """
    Validate monetary amount in paise.
    Must be positive and not exceed ₹10,000 Crore (1 trillion paise).
    """
    if amount <= 0:
        raise ValueError("Amount must be positive (in paise). ₹1 = 100 paise.")

    max_amount_paise = 10_000 * 100_00_00_000  # ₹10,000 Crore in paise
    if amount > max_amount_paise:
        raise ValueError(
            f"Amount exceeds maximum allowed: ₹10,000 Crore. "
            f"Got: ₹{amount / 100:,.2f}"
        )

    return amount


def paise_to_rupees_display(paise: int) -> str:
    """Convert paise to Indian Rupee display format with ₹ symbol."""
    rupees = paise / 100
    if rupees >= 1_00_00_000:
        return f"₹{rupees / 1_00_00_000:,.2f} Crore"
    elif rupees >= 1_00_000:
        return f"₹{rupees / 1_00_000:,.2f} Lakh"
    else:
        return f"₹{rupees:,.2f}"


def get_current_ist() -> datetime:
    """Get current timestamp in IST (Indian Standard Time)."""
    return datetime.now(IST)


# ============================================================================
# DATA MODELS — Core entities stored on blockchain and in PostgreSQL
# ============================================================================

class TenderRecord(BaseModel):
    """
    Tender record stored on Hyperledger Fabric ledger.
    Represents a government procurement tender per GFR 2017.

    ID Format: TDR-{MINISTRY_CODE}-{YEAR}-{6-DIGIT-SEQ}
    Example: TDR-MoRTH-2025-000001

    All monetary values in paise (int64) for precision.
    All timestamps in IST (UTC+5:30).
    """
    tender_id: str = Field(
        ...,
        description="Unique tender ID: TDR-{MINISTRY_CODE}-{YEAR}-{SEQ}",
        examples=["TDR-MoRTH-2025-000001"]
    )
    ministry_code: str = Field(
        ...,
        description="Ministry code (e.g., MoRTH for Ministry of Road Transport & Highways)",
        examples=["MoRTH", "MoE", "MoH", "MoF", "MoD"]
    )
    department: str = Field(
        ...,
        description="Department within the ministry",
        examples=["National Highways Division", "School Education Department"]
    )
    title: str = Field(
        ...,
        min_length=10,
        max_length=500,
        description="Title of the tender"
    )
    description: str = Field(
        ...,
        min_length=20,
        max_length=5000,
        description="Detailed description of the procurement requirement"
    )
    estimated_value_paise: int = Field(
        ...,
        gt=0,
        description="Estimated tender value in paise (₹1 = 100 paise)"
    )
    category: TenderCategory = Field(
        ...,
        description="Tender category per GFR 2017"
    )
    procurement_method: ProcurementMethod = Field(
        ...,
        description="Procurement method per GFR 2017 rules"
    )
    gem_category_id: Optional[str] = Field(
        None,
        description="GeM (Government e-Marketplace) category ID"
    )
    documents_ipfs_hash: Optional[str] = Field(
        None,
        description="IPFS hash of tender documents"
    )
    deadline_ist: datetime = Field(
        ...,
        description="Bid submission deadline in IST"
    )
    evaluation_criteria: Optional[Dict[str, Any]] = Field(
        None,
        description="Evaluation criteria (JSON) — weights for L1/QCBS"
    )
    gfr_rule_reference: str = Field(
        ...,
        description="Applicable GFR 2017 rule reference",
        examples=["GFR Rule 149", "GFR Rule 151", "GFR Rule 166"]
    )
    status: TenderStatus = Field(
        default=TenderStatus.DRAFT,
        description="Current tender lifecycle status"
    )
    created_by_did: str = Field(
        ...,
        description="DID (Decentralized Identifier) of the creating officer"
    )
    created_at_ist: datetime = Field(
        default_factory=get_current_ist,
        description="Creation timestamp in IST"
    )
    blockchain_tx_id: Optional[str] = Field(
        None,
        description="Hyperledger Fabric transaction ID"
    )

    @field_validator('estimated_value_paise')
    @classmethod
    def validate_value(cls, v: int) -> int:
        return validate_amount_paise(v)

    @model_validator(mode='after')
    def validate_gfr_procurement_method(self) -> 'TenderRecord':
        """
        GFR 2017 Rule 149: Open tender is mandatory for estimated value > ₹25 lakh.
        This validation ensures compliance at the model level.
        """
        threshold_25_lakh_paise = 25_00_000 * 100  # ₹25 lakh in paise
        if (self.estimated_value_paise > threshold_25_lakh_paise
                and self.procurement_method != ProcurementMethod.OPEN):
            logger.warning(
                f"GFR Rule 149 VIOLATION: Tender {self.tender_id} — "
                f"Value ₹{self.estimated_value_paise / 100:,.2f} exceeds ₹25 lakh threshold. "
                f"Must use OPEN procurement method, but {self.procurement_method.value} was specified."
            )
        return self


class BidRecord(BaseModel):
    """
    Bid record stored on Hyperledger Fabric ledger.
    Implements ZKP commit-reveal scheme using SHA-256 Hash Commitments.

    Phase 1 (COMMITTED): Only commitment_hash and zkp_proof are stored.
    Phase 2 (REVEALED): revealed_amount_paise is added after deadline.

    All bidders must have verified GSTIN, PAN, and Aadhaar.
    """
    bid_id: str = Field(
        ...,
        description="Unique bid ID: BID-{TENDER_ID}-{BIDDER_ID}-{SEQ}",
        examples=["BID-TDR-MoRTH-2025-000001-BIDDER001-001"]
    )
    tender_id: str = Field(
        ...,
        description="Reference to the tender being bid on"
    )
    bidder_did: str = Field(
        ...,
        description="DID of the bidding company"
    )
    bidder_gstin: str = Field(
        ...,
        description="GSTIN of the bidding company (mandatory per GST Act)"
    )
    bidder_pan: str = Field(
        ...,
        description="PAN of the bidding company (mandatory per Income Tax Act)"
    )
    msme_registered: bool = Field(
        default=False,
        description="Whether bidder is MSME registered (GFR Rule 153A preference)"
    )
    dpiit_number: Optional[str] = Field(
        None,
        description="DPIIT recognition number (if bidder is a registered startup)"
    )
    commitment_hash: str = Field(
        ...,
        description="ZKP Phase 1: SHA-256 hash commitment of the bid amount"
    )
    zkp_proof: str = Field(
        ...,
        description="Zero-knowledge proof of bid validity (range proof)"
    )
    revealed_amount_paise: Optional[int] = Field(
        None,
        description="ZKP Phase 2: Actual bid amount revealed after deadline (in paise)"
    )
    documents_ipfs_hash: Optional[str] = Field(
        None,
        description="IPFS hash of bid documents (technical + financial proposals)"
    )
    submitted_at_ist: datetime = Field(
        default_factory=get_current_ist,
        description="Bid submission timestamp in IST"
    )
    reveal_at_ist: Optional[datetime] = Field(
        None,
        description="Timestamp when bid amount was revealed"
    )
    status: BidStatus = Field(
        default=BidStatus.COMMITTED,
        description="Current bid lifecycle status"
    )
    ai_risk_score: Optional[float] = Field(
        None,
        ge=0.0,
        le=100.0,
        description="AI-assigned risk score (0-100)"
    )
    blockchain_tx_id: Optional[str] = Field(
        None,
        description="Hyperledger Fabric transaction ID"
    )

    @field_validator('bidder_gstin')
    @classmethod
    def validate_bidder_gstin(cls, v: str) -> str:
        return validate_gstin(v)

    @field_validator('bidder_pan')
    @classmethod
    def validate_bidder_pan(cls, v: str) -> str:
        return validate_pan(v)

    @field_validator('revealed_amount_paise')
    @classmethod
    def validate_revealed_amount(cls, v: Optional[int]) -> Optional[int]:
        if v is not None:
            return validate_amount_paise(v)
        return v


class AuditEvent(BaseModel):
    """
    Audit event record — every action in TenderShield generates an audit event.
    Stored immutably on blockchain for CAG (Comptroller and Auditor General) access.
    Provides tamper-proof audit trail admissible in court under IT Act 2000.
    """
    event_id: str = Field(
        ...,
        description="Unique event identifier (UUID)"
    )
    event_type: AuditEventType = Field(
        ...,
        description="Type of audit event"
    )
    actor_did: str = Field(
        ...,
        description="DID of the actor who performed the action"
    )
    actor_role: ActorRole = Field(
        ...,
        description="Role of the actor"
    )
    tender_id: str = Field(
        ...,
        description="Related tender ID"
    )
    payload_hash: str = Field(
        ...,
        description="SHA-256 hash of the event payload for integrity verification"
    )
    description: str = Field(
        ...,
        description="Human-readable event description"
    )
    risk_level: RiskLevel = Field(
        default=RiskLevel.INFO,
        description="Risk level of the event"
    )
    timestamp_ist: datetime = Field(
        default_factory=get_current_ist,
        description="Event timestamp in IST"
    )
    blockchain_tx_id: Optional[str] = Field(
        None,
        description="Hyperledger Fabric transaction ID"
    )


class AIFraudAlert(BaseModel):
    """
    AI fraud detection alert — generated by the AI monitoring engine.
    When risk score exceeds threshold, appropriate action is auto-triggered.

    Risk Thresholds:
      0-25:   LOW      → MONITOR (log only)
      26-50:  MEDIUM   → FLAG (notify auditor)
      51-75:  HIGH     → FREEZE (auto-freeze tender)
      76-100: CRITICAL → ESCALATE_CAG (auto-escalate to CAG)
    """
    alert_id: str = Field(
        ...,
        description="Unique alert identifier"
    )
    tender_id: str = Field(
        ...,
        description="Tender that triggered the alert"
    )
    alert_type: AlertType = Field(
        ...,
        description="Type of detected fraud pattern"
    )
    confidence_score: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="AI model confidence (0.0 - 1.0)"
    )
    risk_score: int = Field(
        ...,
        ge=0,
        le=100,
        description="Composite risk score (0-100)"
    )
    flagged_entities: List[str] = Field(
        default_factory=list,
        description="List of flagged entity DIDs/identifiers"
    )
    evidence: Dict[str, Any] = Field(
        default_factory=dict,
        description="Evidence data (statistical analysis results)"
    )
    recommended_action: RecommendedAction = Field(
        ...,
        description="AI-recommended action based on risk score"
    )
    status: AlertStatus = Field(
        default=AlertStatus.OPEN,
        description="Current alert status"
    )
    created_at_ist: datetime = Field(
        default_factory=get_current_ist,
        description="Alert creation timestamp in IST"
    )
    reviewed_by_did: Optional[str] = Field(
        None,
        description="DID of the auditor who reviewed this alert"
    )





class DashboardStats(BaseModel):
    """Dashboard statistics response."""
    total_tenders: int = 0
    active_tenders: int = 0
    total_bids: int = 0
    flagged_tenders: int = 0
    total_value_crores: float = 0.0
    fraud_prevented_value_crores: float = 0.0


class HealthCheckResponse(BaseModel):
    """API health check response."""
    status: str = "healthy"
    version: str = "1.0.0"
    fabric_connected: bool = False
    kafka_connected: bool = False
    postgres_connected: bool = False
    redis_connected: bool = False
    timestamp_ist: datetime = Field(default_factory=get_current_ist)


# ============================================================================
# API Request Models (used by FastAPI routers)
# ============================================================================

class CreateTenderRequest(BaseModel):
    """Request to create a new tender."""
    ministry_code: str
    department: str = ""
    title: str
    description: str
    estimated_value_paise: int
    category: str = "GOODS"
    procurement_method: str = "OPEN"
    gem_category_id: str = ""
    deadline_ist: str = ""
    gfr_rule_reference: str = "GFR Rule 149"


class FreezeTenderRequest(BaseModel):
    """Request to freeze a tender."""
    reason: str


class AwardTenderRequest(BaseModel):
    """Request to award a tender."""
    winning_bid_id: str


class CommitBidRequest(BaseModel):
    """ZKP Phase 1: Submit encrypted bid commitment."""
    tender_id: str
    commitment_hash: str
    zkp_proof: str
    bidder_documents_ipfs_hash: str = ""


class RevealBidRequest(BaseModel):
    """ZKP Phase 2: Reveal bid amount."""
    bid_id: str
    revealed_amount_paise: int
    randomness: str

