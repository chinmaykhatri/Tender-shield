// ============================================================================
// TenderShield — Go Data Models for Hyperledger Fabric Chaincode
// ============================================================================
// These structs match the Python Pydantic models exactly for cross-layer
// compatibility. All monetary values use int64 paise (₹1 = 100 paise).
// All timestamps in IST (Indian Standard Time, UTC+5:30).
//
// CouchDB composite key indices are defined for efficient rich queries:
//   - Index by ministry_code
//   - Index by status
//   - Index by bidder_did
//   - Index by risk_score
// ============================================================================

package main

import (
	"fmt"
	"time"
)

// IST represents Indian Standard Time (UTC+5:30)
var IST = time.FixedZone("IST", 5*60*60+30*60)

// ============================================================================
// ENUMS — String constants for type safety
// ============================================================================

// TenderCategory represents procurement categories per GFR 2017
type TenderCategory string

const (
	CategoryWorks       TenderCategory = "WORKS"
	CategoryGoods       TenderCategory = "GOODS"
	CategoryServices    TenderCategory = "SERVICES"
	CategoryConsultancy TenderCategory = "CONSULTANCY"
)

// ProcurementMethod per GFR 2017 rules
type ProcurementMethod string

const (
	MethodOpen         ProcurementMethod = "OPEN"
	MethodLimited      ProcurementMethod = "LIMITED"
	MethodSingleSource ProcurementMethod = "SINGLE_SOURCE"
)

// TenderStatus represents the lifecycle of a tender on blockchain
type TenderStatus string

const (
	StatusDraft           TenderStatus = "DRAFT"
	StatusPublished       TenderStatus = "PUBLISHED"
	StatusBiddingOpen     TenderStatus = "BIDDING_OPEN"
	StatusUnderEvaluation TenderStatus = "UNDER_EVALUATION"
	StatusAwarded         TenderStatus = "AWARDED"
	StatusClosed          TenderStatus = "CLOSED"
	StatusFrozenByAI      TenderStatus = "FROZEN_BY_AI"
)

// BidStatus represents the lifecycle of a bid (ZKP commit-reveal)
type BidStatus string

const (
	BidCommitted    BidStatus = "COMMITTED"
	BidRevealed     BidStatus = "REVEALED"
	BidEvaluated    BidStatus = "EVALUATED"
	BidDisqualified BidStatus = "DISQUALIFIED"
)

// AuditEventType for immutable audit trail
type AuditEventType string

const (
	EventTenderCreated  AuditEventType = "TENDER_CREATED"
	EventBidSubmitted   AuditEventType = "BID_SUBMITTED"
	EventBidRevealed    AuditEventType = "BID_REVEALED"
	EventTenderAwarded  AuditEventType = "TENDER_AWARDED"
	EventAIFlag         AuditEventType = "AI_FLAG"
	EventAuditReview    AuditEventType = "AUDIT_REVIEW"
	EventEscalatedToCAG AuditEventType = "ESCALATED_TO_CAG"
)

// ActorRole identifies the role of an actor in the system
type ActorRole string

const (
	RoleOfficer  ActorRole = "OFFICER"
	RoleBidder   ActorRole = "BIDDER"
	RoleAuditor  ActorRole = "AUDITOR"
	RoleAISystem ActorRole = "AI_SYSTEM"
	RoleNICAdmin ActorRole = "NIC_ADMIN"
)

// RiskLevel for categorizing alert severity
type RiskLevel string

const (
	RiskInfo     RiskLevel = "INFO"
	RiskLow      RiskLevel = "LOW"
	RiskMedium   RiskLevel = "MEDIUM"
	RiskHigh     RiskLevel = "HIGH"
	RiskCritical RiskLevel = "CRITICAL"
)

// AlertType for AI-detected fraud patterns (India-specific)
type AlertType string

const (
	AlertBidRigging        AlertType = "BID_RIGGING"
	AlertCollusion         AlertType = "COLLUSION"
	AlertShellCompany      AlertType = "SHELL_COMPANY"
	AlertCartel            AlertType = "CARTEL"
	AlertPriceManipulation AlertType = "PRICE_MANIPULATION"
	AlertTimingAnomaly     AlertType = "TIMING_ANOMALY"
)

// RecommendedAction based on composite risk score
type RecommendedAction string

const (
	ActionMonitor     RecommendedAction = "MONITOR"
	ActionFlag        RecommendedAction = "FLAG"
	ActionFreeze      RecommendedAction = "FREEZE"
	ActionEscalateCAG RecommendedAction = "ESCALATE_CAG"
	ActionInvestigate RecommendedAction = "INVESTIGATE"
)

// AlertStatus tracks the lifecycle of an AI fraud alert
type AlertStatus string

const (
	AlertOpen          AlertStatus = "OPEN"
	AlertAcknowledged  AlertStatus = "ACKNOWLEDGED"
	AlertResolved      AlertStatus = "RESOLVED"
	AlertFalsePositive AlertStatus = "FALSE_POSITIVE"
)

// ============================================================================
// CORE DATA MODELS — Stored on Hyperledger Fabric Ledger
// ============================================================================

// TenderRecord represents a government procurement tender
// Stored on blockchain with composite key: TENDER~{ministry_code}~{tender_id}
// All monetary values in paise (int64) — ₹1 = 100 paise
// GFR 2017 compliance fields are mandatory
type TenderRecord struct {
	// DocType is used for CouchDB rich queries to identify document type
	DocType string `json:"docType"`

	// TenderID format: TDR-{MINISTRY_CODE}-{YEAR}-{6-DIGIT-SEQ}
	// Example: TDR-MoRTH-2025-000001
	TenderID string `json:"tender_id" validate:"required"`

	// MinistryCode — Indian ministry abbreviation
	// Examples: MoRTH (Roads), MoE (Education), MoH (Health), MoF (Finance)
	MinistryCode string `json:"ministry_code" validate:"required"`

	// Department within the ministry
	Department string `json:"department" validate:"required"`

	// Title of the procurement tender
	Title string `json:"title" validate:"required,min=10,max=500"`

	// Description — detailed procurement requirement
	Description string `json:"description" validate:"required,min=20,max=5000"`

	// EstimatedValuePaise — tender value in paise for precision
	// ₹450 Crore = 450_00_00_000 * 100 = 4500000000000 paise
	EstimatedValuePaise int64 `json:"estimated_value_paise" validate:"required,gt=0"`

	// Category — GFR 2017 tender classification
	Category TenderCategory `json:"category" validate:"required"`

	// ProcurementMethod — GFR 2017 Rule 149/151/166
	ProcurementMethod ProcurementMethod `json:"procurement_method" validate:"required"`

	// GeMCategoryID — Government e-Marketplace category for integration
	GeMCategoryID string `json:"gem_category_id,omitempty"`

	// DocumentsIPFSHash — IPFS content hash of tender documents
	DocumentsIPFSHash string `json:"documents_ipfs_hash,omitempty"`

	// DeadlineIST — bid submission deadline in IST
	DeadlineIST string `json:"deadline_ist" validate:"required"`

	// EvaluationCriteria — JSON criteria for bid evaluation (L1/QCBS)
	EvaluationCriteria string `json:"evaluation_criteria,omitempty"`

	// GFRRuleReference — applicable GFR 2017 rule (e.g., "GFR Rule 149")
	GFRRuleReference string `json:"gfr_rule_reference" validate:"required"`

	// Status — current lifecycle status on blockchain
	Status TenderStatus `json:"status" validate:"required"`

	// CreatedByDID — Decentralized Identifier of the creating officer
	CreatedByDID string `json:"created_by_did" validate:"required"`

	// CreatedAtIST — creation timestamp in IST
	CreatedAtIST string `json:"created_at_ist"`

	// BlockchainTxID — Hyperledger Fabric transaction ID
	BlockchainTxID string `json:"blockchain_tx_id,omitempty"`
}

// BidRecord represents a bid with ZKP commit-reveal scheme
// Stored with composite key: BID~{tender_id}~{bidder_did}~{bid_id}
type BidRecord struct {
	DocType string `json:"docType"`

	// BidID format: BID-{TENDER_ID}-{BIDDER_ID}-{SEQ}
	BidID string `json:"bid_id" validate:"required"`

	// TenderID — reference to the tender being bid on
	TenderID string `json:"tender_id" validate:"required"`

	// BidderDID — Decentralized Identifier of the bidding company
	BidderDID string `json:"bidder_did" validate:"required"`

	// BidderGSTIN — GST Identification Number (15 chars, mandatory in India)
	BidderGSTIN string `json:"bidder_gstin" validate:"required,len=15"`

	// BidderPAN — Permanent Account Number (10 chars, mandatory)
	BidderPAN string `json:"bidder_pan" validate:"required,len=10"`

	// MSMERegistered — whether bidder has MSME registration (GFR Rule 153A)
	MSMERegistered bool `json:"msme_registered"`

	// DPIITNumber — DPIIT startup recognition number (if applicable)
	DPIITNumber string `json:"dpiit_number,omitempty"`

	// CommitmentHash — SHA-256 commitment: C = SHA256(amount_paise || "||" || randomness_hex)
	CommitmentHash string `json:"commitment_hash" validate:"required"`

	// ZKPProof — zero-knowledge proof of bid validity (range proof)
	ZKPProof string `json:"zkp_proof" validate:"required"`

	// RevealedAmountPaise — ZKP Phase 2: actual bid in paise (revealed after deadline)
	RevealedAmountPaise int64 `json:"revealed_amount_paise,omitempty"`

	// DocumentsIPFSHash — IPFS hash of bid documents
	DocumentsIPFSHash string `json:"documents_ipfs_hash,omitempty"`

	// SubmittedAtIST — bid submission timestamp in IST
	SubmittedAtIST string `json:"submitted_at_ist"`

	// RevealAtIST — timestamp when bid was revealed
	RevealAtIST string `json:"reveal_at_ist,omitempty"`

	// Status — current bid lifecycle status
	Status BidStatus `json:"status" validate:"required"`

	// AIRiskScore — AI-assigned risk score (0.0 - 100.0)
	AIRiskScore float64 `json:"ai_risk_score,omitempty"`

	// BlockchainTxID — Hyperledger Fabric transaction ID
	BlockchainTxID string `json:"blockchain_tx_id,omitempty"`
}

// AuditEvent — every action generates an immutable audit record
// Stored with composite key: AUDIT~{tender_id}~{event_id}
// Provides tamper-proof trail admissible in court under IT Act 2000
type AuditEvent struct {
	DocType string `json:"docType"`

	// EventID — UUID for unique identification
	EventID string `json:"event_id" validate:"required"`

	// EventType — what action occurred
	EventType AuditEventType `json:"event_type" validate:"required"`

	// ActorDID — who performed the action
	ActorDID string `json:"actor_did" validate:"required"`

	// ActorRole — role of the actor
	ActorRole ActorRole `json:"actor_role" validate:"required"`

	// TenderID — related tender
	TenderID string `json:"tender_id" validate:"required"`

	// PayloadHash — SHA-256 hash of the event payload
	PayloadHash string `json:"payload_hash" validate:"required"`

	// Description — human-readable event description
	Description string `json:"description" validate:"required"`

	// RiskLevel — severity classification
	RiskLevel RiskLevel `json:"risk_level"`

	// TimestampIST — event timestamp in IST
	TimestampIST string `json:"timestamp_ist"`

	// BlockchainTxID — Hyperledger Fabric transaction ID
	BlockchainTxID string `json:"blockchain_tx_id,omitempty"`
}

// AIFraudAlert — AI-generated fraud detection alert
// Stored with composite key: ALERT~{tender_id}~{alert_id}
type AIFraudAlert struct {
	DocType string `json:"docType"`

	// AlertID — unique alert identifier
	AlertID string `json:"alert_id" validate:"required"`

	// TenderID — tender that triggered the alert
	TenderID string `json:"tender_id" validate:"required"`

	// AlertType — type of detected fraud pattern
	AlertType AlertType `json:"alert_type" validate:"required"`

	// ConfidenceScore — AI model confidence (0.0 - 1.0)
	ConfidenceScore float64 `json:"confidence_score" validate:"min=0,max=1"`

	// RiskScore — composite risk score (0-100)
	RiskScore int `json:"risk_score" validate:"min=0,max=100"`

	// FlaggedEntities — list of flagged entity DIDs/identifiers
	FlaggedEntities []string `json:"flagged_entities"`

	// Evidence — JSON evidence data (statistical analysis results)
	Evidence string `json:"evidence"`

	// RecommendedAction — AI-recommended response
	RecommendedAction RecommendedAction `json:"recommended_action" validate:"required"`

	// Status — alert lifecycle status
	Status AlertStatus `json:"status"`

	// CreatedAtIST — alert creation timestamp in IST
	CreatedAtIST string `json:"created_at_ist"`

	// ReviewedByDID — DID of the auditor who reviewed this alert
	ReviewedByDID string `json:"reviewed_by_did,omitempty"`
}

// ============================================================================
// COMPOSITE KEY HELPERS — For CouchDB Rich Query Indexes
// ============================================================================

// StateIndex defines CouchDB index configurations for efficient queries
type StateIndex struct {
	IndexName string   `json:"index_name"`
	DocType   string   `json:"doc_type"`
	Fields    []string `json:"fields"`
}

// GetTenderIndexes returns all CouchDB indexes needed for tender queries
func GetTenderIndexes() []StateIndex {
	return []StateIndex{
		{
			IndexName: "indexTenderByMinistry",
			DocType:   "tender",
			Fields:    []string{"ministry_code", "status"},
		},
		{
			IndexName: "indexTenderByStatus",
			DocType:   "tender",
			Fields:    []string{"status", "created_at_ist"},
		},
		{
			IndexName: "indexTenderByCategory",
			DocType:   "tender",
			Fields:    []string{"category", "status"},
		},
		{
			IndexName: "indexTenderByValue",
			DocType:   "tender",
			Fields:    []string{"estimated_value_paise"},
		},
	}
}

// GetBidIndexes returns all CouchDB indexes needed for bid queries
func GetBidIndexes() []StateIndex {
	return []StateIndex{
		{
			IndexName: "indexBidByTender",
			DocType:   "bid",
			Fields:    []string{"tender_id", "status"},
		},
		{
			IndexName: "indexBidByBidder",
			DocType:   "bid",
			Fields:    []string{"bidder_did", "tender_id"},
		},
		{
			IndexName: "indexBidByRiskScore",
			DocType:   "bid",
			Fields:    []string{"ai_risk_score"},
		},
	}
}

// GetAlertIndexes returns CouchDB indexes for AI fraud alerts
func GetAlertIndexes() []StateIndex {
	return []StateIndex{
		{
			IndexName: "indexAlertByRisk",
			DocType:   "alert",
			Fields:    []string{"risk_score", "status"},
		},
		{
			IndexName: "indexAlertByTender",
			DocType:   "alert",
			Fields:    []string{"tender_id", "alert_type"},
		},
	}
}

// ============================================================================
// COMPOSITE KEY CONSTRUCTORS
// ============================================================================

// CreateTenderCompositeKey generates the composite key for a tender
// Format: TENDER~{ministry_code}~{tender_id}
func CreateTenderCompositeKey(ministryCode, tenderID string) string {
	return fmt.Sprintf("TENDER~%s~%s", ministryCode, tenderID)
}

// CreateBidCompositeKey generates the composite key for a bid
// Format: BID~{tender_id}~{bidder_did}~{bid_id}
func CreateBidCompositeKey(tenderID, bidderDID, bidID string) string {
	return fmt.Sprintf("BID~%s~%s~%s", tenderID, bidderDID, bidID)
}

// CreateAuditCompositeKey generates the composite key for an audit event
// Format: AUDIT~{tender_id}~{event_id}
func CreateAuditCompositeKey(tenderID, eventID string) string {
	return fmt.Sprintf("AUDIT~%s~%s", tenderID, eventID)
}

// CreateAlertCompositeKey generates the composite key for an AI alert
// Format: ALERT~{tender_id}~{alert_id}
func CreateAlertCompositeKey(tenderID, alertID string) string {
	return fmt.Sprintf("ALERT~%s~%s", tenderID, alertID)
}

// ============================================================================
// HELPER TYPES
// ============================================================================

// BidEvaluation represents the result of evaluating bids for a tender
type BidEvaluation struct {
	BidID             string  `json:"bid_id"`
	BidderDID         string  `json:"bidder_did"`
	RevealedAmount    int64   `json:"revealed_amount_paise"`
	MSMEPreference    float64 `json:"msme_preference_percent"`
	AdjustedAmount    int64   `json:"adjusted_amount_paise"`
	Rank              int     `json:"rank"`
	IsWinner          bool    `json:"is_winner"`
	EvaluationRemarks string  `json:"evaluation_remarks"`
}

// HistoryRecord represents a single entry in the blockchain history
type HistoryRecord struct {
	TxID      string       `json:"tx_id"`
	Timestamp string       `json:"timestamp_ist"`
	Value     TenderRecord `json:"value"`
	IsDeleted bool         `json:"is_deleted"`
}

// DashboardStats holds aggregated statistics for the dashboard
type DashboardStats struct {
	TotalTenders              int     `json:"total_tenders"`
	ActiveTenders             int     `json:"active_tenders"`
	TotalBids                 int     `json:"total_bids"`
	FlaggedTenders            int     `json:"flagged_tenders"`
	TotalValueCrores          float64 `json:"total_value_crores"`
	FraudPreventedValueCrores float64 `json:"fraud_prevented_value_crores"`
}

// ComplianceResult from GFR 2017 validation
type ComplianceResult struct {
	IsCompliant    bool     `json:"is_compliant"`
	Violations     []string `json:"violations"`
	RuleReferences []string `json:"rule_references"`
	CheckedAt      string   `json:"checked_at_ist"`
}

// BidSecurityRequirement per GFR Rule 153
type BidSecurityRequirement struct {
	MinPercentage   float64 `json:"min_percentage"`
	MaxPercentage   float64 `json:"max_percentage"`
	CalculatedPaise int64   `json:"calculated_paise"`
	GFRReference    string  `json:"gfr_reference"`
}

// CallerIdentity extracted from transaction context
type CallerIdentity struct {
	MSPID         string `json:"msp_id"`
	CertificateCN string `json:"certificate_cn"`
	DID           string `json:"did"`
	Role          string `json:"role"`
}

// GetCurrentIST returns the current time in IST as a formatted string
func GetCurrentIST() string {
	return time.Now().In(IST).Format("2006-01-02T15:04:05+05:30")
}

// PaiseToRupeesDisplay converts paise to a human-readable Indian Rupee format
func PaiseToRupeesDisplay(paise int64) string {
	rupees := float64(paise) / 100.0
	if rupees >= 10000000 { // ₹1 Crore
		return fmt.Sprintf("₹%.2f Crore", rupees/10000000.0)
	} else if rupees >= 100000 { // ₹1 Lakh
		return fmt.Sprintf("₹%.2f Lakh", rupees/100000.0)
	}
	return fmt.Sprintf("₹%.2f", rupees)
}
