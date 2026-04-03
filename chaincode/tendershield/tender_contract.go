// ============================================================================
// TenderShield — Main Smart Contract (Hyperledger Fabric Chaincode)
// ============================================================================
// This is the core business logic running on all Fabric peers.
// It implements 13 chaincode functions covering the complete tender lifecycle:
//
//   INITIALIZATION:
//     1.  InitLedger          — Seeds 3 demo tenders (MoRTH, MoE, MoH)
//
//   TENDER LIFECYCLE:
//     2.  CreateTender        — Creates a tender with GFR compliance validation
//     3.  PublishTender       — Changes status to BIDDING_OPEN
//     4.  FreezeTender        — AI/NIC freezes a suspect tender
//     5.  AwardTender         — Awards tender to winning bidder
//
//   BID LIFECYCLE (SHA-256 Commit-Reveal):
//     6.  SubmitBid           — Phase 1: Submit SHA-256 commitment hash
//     7.  RevealBid           — Phase 2: Reveal bid amount after deadline
//     8.  EvaluateBids        — Evaluate all revealed bids for a tender
//
//   QUERY FUNCTIONS:
//     9.  QueryTenderByID     — Get single tender
//     10. QueryTendersByStatus — Get tenders by status (e.g., BIDDING_OPEN)
//     11. GetTenderHistory    — Blockchain history of a tender state
//     12. GetDashboardStats   — Aggregated stats for dashboard
//
//   AUDIT:
//     13. RecordAuditEvent    — Immutable audit event on blockchain
//
// DESIGN DECISIONS:
//   - All writes go through endorsement policy (MinistryOrg AND NICOrg)
//   - All reads are available to all channel members
//   - CouchDB rich queries for flexible dashboard queries
//   - Composite keys for efficient key-range lookups
//   - Every state change creates an audit event automatically
//
// ENDORSEMENT POLICY: AND('MinistryOrgMSP.peer','NICOrgMSP.peer')
// This means both MinistryOrg and NICOrg peers must endorse every transaction.
// ============================================================================

package main

import (
	"encoding/json"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// TenderShieldContract implements the Fabric Contract API
type TenderShieldContract struct {
	contractapi.Contract
}

// ============================================================================
// 1. InitLedger — Seed Demo Data
// ============================================================================
// Seeds 3 demo tenders representing real Indian government procurement
// scenarios. These are seeded during network setup for competition demo.
//
// DEMO TENDERS:
//   TDR-MoRTH-2025-000001 — NH-44 Highway Expansion (₹450 Cr) — BIDDING_OPEN
//   TDR-MoE-2025-000001   — PM SHRI Schools Digital (₹85 Cr)  — BIDDING_OPEN
//   TDR-MoH-2025-000001   — AIIMS Medical Equipment (₹120 Cr) — FROZEN_BY_AI
//
// ACCESS: Any org admin (for initialization only)
func (c *TenderShieldContract) InitLedger(ctx contractapi.TransactionContextInterface) error {
	log.Println("[TenderShield] InitLedger — Seeding demo tenders...")

	now := GetCurrentIST()

	demoTenders := []TenderRecord{
		{
			DocType:             "tender",
			TenderID:            "TDR-MoRTH-2025-000001",
			MinistryCode:        "MoRTH",
			Department:          "National Highways Division",
			Title:               "Construction and widening of NH-44 Delhi-Agra Highway (6-lane)",
			Description:         "Construction and widening of National Highway 44, Section KM 12.500 to KM 145.000, from existing 4-lane to 6-lane divided carriageway with paved shoulders, including construction of grade-separated junctions, service roads, underpasses, flyovers, and drainage structures as per IRC Standards. Project includes land acquisition, utility shifting, and environmental mitigation measures per NHAI guidelines.",
			EstimatedValuePaise: 450_00_00_000 * 100, // ₹450 Crore in paise
			Category:            CategoryWorks,
			ProcurementMethod:   MethodOpen,
			GeMCategoryID:       "SRV-INFRA-HIGHWAY",
			DeadlineIST:         time.Now().In(IST).Add(30 * 24 * time.Hour).Format("2006-01-02T15:04:05+05:30"),
			GFRRuleReference:    "GFR Rule 149",
			Status:              StatusBiddingOpen,
			CreatedByDID:        "did:tendershield:ministryorgmsp:officer.morth",
			CreatedAtIST:        now,
		},
		{
			DocType:             "tender",
			TenderID:            "TDR-MoE-2025-000001",
			MinistryCode:        "MoE",
			Department:          "School Education Department",
			Title:               "PM SHRI Schools — Digital Infrastructure Upgrade (Phase II)",
			Description:         "Supply, installation, testing and commissioning of ICT infrastructure for 500 PM SHRI Schools across 10 states, including smart boards, tablets (1:1 student-device ratio for Class 9-12), campus WiFi (minimum 100 Mbps per school), solar panels, and learning management system (LMS) with vernacular language support. Must comply with NIPUN Bharat framework and NEP 2020 guidelines.",
			EstimatedValuePaise: 85_00_00_000 * 100, // ₹85 Crore in paise
			Category:            CategoryGoods,
			ProcurementMethod:   MethodOpen,
			GeMCategoryID:       "GDS-ICT-EDTECH",
			DeadlineIST:         time.Now().In(IST).Add(21 * 24 * time.Hour).Format("2006-01-02T15:04:05+05:30"),
			GFRRuleReference:    "GFR Rule 149",
			Status:              StatusBiddingOpen,
			CreatedByDID:        "did:tendershield:ministryorgmsp:officer.moe",
			CreatedAtIST:        now,
		},
		{
			DocType:             "tender",
			TenderID:            "TDR-MoH-2025-000001",
			MinistryCode:        "MoH",
			Department:          "AIIMS Medical Equipment Division",
			Title:               "AIIMS New Delhi — Advanced Medical Imaging Equipment Procurement",
			Description:         "Procurement of advanced medical imaging equipment for AIIMS New Delhi, including 3T MRI (2 units), 128-slice CT Scanner (3 units), PET-CT Scanner (1 unit), Digital Mammography (5 units), and Ultrasound Systems (10 units). Equipment must be FDA/CE certified with minimum 5-year comprehensive warranty including spare parts. Installation includes radiation shielding and AERB compliance.",
			EstimatedValuePaise: 120_00_00_000 * 100, // ₹120 Crore in paise
			Category:            CategoryGoods,
			ProcurementMethod:   MethodOpen,
			GeMCategoryID:       "GDS-MEDICAL-IMAGING",
			DeadlineIST:         time.Now().In(IST).Add(14 * 24 * time.Hour).Format("2006-01-02T15:04:05+05:30"),
			GFRRuleReference:    "GFR Rule 149",
			Status:              StatusFrozenByAI,
			CreatedByDID:        "did:tendershield:ministryorgmsp:officer.moh",
			CreatedAtIST:        now,
		},
	}

	for _, tender := range demoTenders {
		tenderJSON, err := json.Marshal(tender)
		if err != nil {
			return fmt.Errorf("INIT_ERROR: failed to marshal tender %s: %v", tender.TenderID, err)
		}

		key := CreateTenderCompositeKey(tender.MinistryCode, tender.TenderID)
		err = ctx.GetStub().PutState(key, tenderJSON)
		if err != nil {
			return fmt.Errorf("INIT_ERROR: failed to put tender %s: %v", tender.TenderID, err)
		}

		log.Printf("[TenderShield] Seeded: %s — %s (%s) — %s",
			tender.TenderID, tender.Title[:50], PaiseToRupeesDisplay(tender.EstimatedValuePaise), string(tender.Status))
	}

	log.Println("[TenderShield] InitLedger complete — 3 demo tenders seeded ✅")
	return nil
}

// ============================================================================
// 2. CreateTender — Create a New Tender
// ============================================================================
// Creates a new tender on the blockchain after validating GFR 2017 compliance.
//
// WORKFLOW:
//   1. Verify caller is MinistryOrg officer
//   2. Parse tender data from JSON input
//   3. Run GFR 2017 compliance validation
//   4. Store tender on ledger with DRAFT status
//   5. Create audit event
//
// ACCESS: MinistryOrgMSP only (officers)
// ENDORSEMENT: Requires MinistryOrg AND NICOrg peers
func (c *TenderShieldContract) CreateTender(ctx contractapi.TransactionContextInterface, tenderJSON string) error {
	log.Println("[TenderShield] CreateTender called")

	// Step 1: Verify caller identity
	err := ValidateOrgAccess(ctx, "MinistryOrgMSP")
	if err != nil {
		return fmt.Errorf("CREATE_TENDER_FAILED: %v", err)
	}

	identity, err := GetCallerIdentity(ctx)
	if err != nil {
		return fmt.Errorf("CREATE_TENDER_FAILED: %v", err)
	}

	// Step 2: Parse tender data
	var tender TenderRecord
	err = json.Unmarshal([]byte(tenderJSON), &tender)
	if err != nil {
		return fmt.Errorf("CREATE_TENDER_FAILED: invalid tender JSON: %v", err)
	}

	// Step 3: Set system fields
	tender.DocType = "tender"
	tender.Status = StatusDraft
	tender.CreatedByDID = identity.DID
	tender.CreatedAtIST = GetCurrentIST()
	tender.BlockchainTxID = ctx.GetStub().GetTxID()

	// Step 4: Validate GFR 2017 compliance
	compliance := ValidateGFRCompliance(tender)
	if !compliance.IsCompliant {
		return fmt.Errorf("GFR_COMPLIANCE_FAILED: tender violates GFR 2017 rules: %s",
			strings.Join(compliance.Violations, "; "))
	}

	// Step 5: Check for duplicate tender ID
	key := CreateTenderCompositeKey(tender.MinistryCode, tender.TenderID)
	existing, err := ctx.GetStub().GetState(key)
	if err != nil {
		return fmt.Errorf("CREATE_TENDER_FAILED: ledger read error: %v", err)
	}
	if existing != nil {
		return fmt.Errorf("CREATE_TENDER_FAILED: tender %s already exists", tender.TenderID)
	}

	// Step 6: Store tender on ledger
	tenderBytes, err := json.Marshal(tender)
	if err != nil {
		return fmt.Errorf("CREATE_TENDER_FAILED: marshal error: %v", err)
	}

	err = ctx.GetStub().PutState(key, tenderBytes)
	if err != nil {
		return fmt.Errorf("CREATE_TENDER_FAILED: ledger write error: %v", err)
	}

	// Step 7: Create audit event
	auditEvent := AuditEvent{
		DocType:        "audit",
		EventID:        fmt.Sprintf("EVT-%s-CREATED", tender.TenderID),
		EventType:      EventTenderCreated,
		ActorDID:       identity.DID,
		ActorRole:      ActorRole(identity.Role),
		TenderID:       tender.TenderID,
		PayloadHash:    HashTenderData(tender.TenderID, tender.MinistryCode, tender.Title, tender.EstimatedValuePaise),
		Description:    fmt.Sprintf("Tender %s created by %s — %s (%s)", tender.TenderID, identity.DID, tender.Title, PaiseToRupeesDisplay(tender.EstimatedValuePaise)),
		RiskLevel:      RiskInfo,
		TimestampIST:   GetCurrentIST(),
		BlockchainTxID: ctx.GetStub().GetTxID(),
	}
	auditBytes, _ := json.Marshal(auditEvent)
	auditKey := CreateAuditCompositeKey(tender.TenderID, auditEvent.EventID)
	ctx.GetStub().PutState(auditKey, auditBytes)

	log.Printf("[TenderShield] Tender created: %s by %s ✅", tender.TenderID, identity.DID)
	return nil
}

// ============================================================================
// 3. PublishTender — Change Status to BIDDING_OPEN
// ============================================================================
// Publishes a DRAFT tender, opening it for bid submissions.
//
// ACCESS: MinistryOrgMSP only
func (c *TenderShieldContract) PublishTender(ctx contractapi.TransactionContextInterface, ministryCode, tenderID string) error {
	log.Printf("[TenderShield] PublishTender: %s", tenderID)

	err := ValidateOrgAccess(ctx, "MinistryOrgMSP")
	if err != nil {
		return fmt.Errorf("PUBLISH_FAILED: %v", err)
	}

	key := CreateTenderCompositeKey(ministryCode, tenderID)
	tender, err := getTenderByKey(ctx, key)
	if err != nil {
		return err
	}

	if tender.Status != StatusDraft && tender.Status != StatusPublished {
		return fmt.Errorf("PUBLISH_FAILED: tender %s is in %s state — can only publish DRAFT tenders", tenderID, string(tender.Status))
	}

	tender.Status = StatusBiddingOpen
	tender.BlockchainTxID = ctx.GetStub().GetTxID()

	return putTender(ctx, key, *tender)
}

// ============================================================================
// 4. FreezeTender — AI/NIC Freezes a Suspect Tender
// ============================================================================
// Freezes a tender when the AI engine detects fraud or NIC admin intervenes.
// Frozen tenders cannot accept bids or be awarded.
//
// ACCESS: NICOrgMSP only (AI service or NIC admin)
// AUDIT: Automatically creates FROZEN audit event
func (c *TenderShieldContract) FreezeTender(ctx contractapi.TransactionContextInterface, ministryCode, tenderID, reason string) error {
	log.Printf("[TenderShield] FreezeTender: %s — Reason: %s", tenderID, reason)

	err := ValidateOrgAccess(ctx, "NICOrgMSP")
	if err != nil {
		return fmt.Errorf("FREEZE_FAILED: %v", err)
	}

	identity, _ := GetCallerIdentity(ctx)

	key := CreateTenderCompositeKey(ministryCode, tenderID)
	tender, err := getTenderByKey(ctx, key)
	if err != nil {
		return err
	}

	if tender.Status == StatusFrozenByAI {
		return fmt.Errorf("FREEZE_FAILED: tender %s is already frozen", tenderID)
	}
	if tender.Status == StatusClosed || tender.Status == StatusAwarded {
		return fmt.Errorf("FREEZE_FAILED: cannot freeze — tender %s is in %s state", tenderID, string(tender.Status))
	}

	previousStatus := tender.Status
	tender.Status = StatusFrozenByAI
	tender.BlockchainTxID = ctx.GetStub().GetTxID()

	err = putTender(ctx, key, *tender)
	if err != nil {
		return err
	}

	// Audit event
	auditEvent := AuditEvent{
		DocType:        "audit",
		EventID:        fmt.Sprintf("EVT-%s-FROZEN-%s", tenderID, ctx.GetStub().GetTxID()[:8]),
		EventType:      EventAIFlag,
		ActorDID:       identity.DID,
		ActorRole:      RoleAISystem,
		TenderID:       tenderID,
		PayloadHash:    HashTenderData(tenderID, ministryCode, reason, tender.EstimatedValuePaise),
		Description:    fmt.Sprintf("🚨 TENDER FROZEN: %s — Previous status: %s. Reason: %s. Frozen by: %s", tenderID, string(previousStatus), reason, identity.DID),
		RiskLevel:      RiskHigh,
		TimestampIST:   GetCurrentIST(),
		BlockchainTxID: ctx.GetStub().GetTxID(),
	}
	auditBytes, _ := json.Marshal(auditEvent)
	auditKey := CreateAuditCompositeKey(tenderID, auditEvent.EventID)
	ctx.GetStub().PutState(auditKey, auditBytes)

	log.Printf("[TenderShield] 🚨 Tender FROZEN: %s — Reason: %s ✅", tenderID, reason)
	return nil
}

// ============================================================================
// 5. AwardTender — Award to Winning Bidder
// ============================================================================
// Awards a tender to the specified winning bid after evaluation.
//
// ACCESS: MinistryOrgMSP only
func (c *TenderShieldContract) AwardTender(ctx contractapi.TransactionContextInterface, ministryCode, tenderID, winningBidID, justification string) error {
	log.Printf("[TenderShield] AwardTender: %s → %s", tenderID, winningBidID)

	err := ValidateOrgAccess(ctx, "MinistryOrgMSP")
	if err != nil {
		return fmt.Errorf("AWARD_FAILED: %v", err)
	}

	identity, _ := GetCallerIdentity(ctx)

	key := CreateTenderCompositeKey(ministryCode, tenderID)
	tender, err := getTenderByKey(ctx, key)
	if err != nil {
		return err
	}

	if tender.Status != StatusUnderEvaluation {
		return fmt.Errorf("AWARD_FAILED: tender %s must be in UNDER_EVALUATION state to award (current: %s)",
			tenderID, string(tender.Status))
	}

	tender.Status = StatusAwarded
	tender.BlockchainTxID = ctx.GetStub().GetTxID()

	err = putTender(ctx, key, *tender)
	if err != nil {
		return err
	}

	// Audit event
	auditEvent := AuditEvent{
		DocType:        "audit",
		EventID:        fmt.Sprintf("EVT-%s-AWARDED-%s", tenderID, ctx.GetStub().GetTxID()[:8]),
		EventType:      EventTenderAwarded,
		ActorDID:       identity.DID,
		ActorRole:      RoleOfficer,
		TenderID:       tenderID,
		PayloadHash:    HashTenderData(tenderID, ministryCode, winningBidID, tender.EstimatedValuePaise),
		Description:    fmt.Sprintf("Tender %s awarded to bid %s. Justification: %s. By: %s", tenderID, winningBidID, justification, identity.DID),
		RiskLevel:      RiskInfo,
		TimestampIST:   GetCurrentIST(),
		BlockchainTxID: ctx.GetStub().GetTxID(),
	}
	auditBytes, _ := json.Marshal(auditEvent)
	auditKey := CreateAuditCompositeKey(tenderID, auditEvent.EventID)
	ctx.GetStub().PutState(auditKey, auditBytes)

	log.Printf("[TenderShield] Tender AWARDED: %s → %s ✅", tenderID, winningBidID)
	return nil
}

// ============================================================================
// 6. SubmitBid — Commit Phase: Submit SHA-256 Commitment Hash
// ============================================================================
// Bidder submits a SHA-256 commitment hash. The actual bid amount is hidden
// behind a cryptographic commitment: C = SHA-256(amount || randomness).
// No one — not even the blockchain nodes — can reverse the hash to see the amount.
//
// ACCESS: BidderOrgMSP only
func (c *TenderShieldContract) SubmitBid(ctx contractapi.TransactionContextInterface, bidJSON string) error {
	log.Println("[TenderShield] SubmitBid (Commit Phase) called")

	err := ValidateOrgAccess(ctx, "BidderOrgMSP")
	if err != nil {
		return fmt.Errorf("SUBMIT_BID_FAILED: %v", err)
	}

	identity, _ := GetCallerIdentity(ctx)

	var bid BidRecord
	err = json.Unmarshal([]byte(bidJSON), &bid)
	if err != nil {
		return fmt.Errorf("SUBMIT_BID_FAILED: invalid bid JSON: %v", err)
	}

	// Validate commitment fields
	if bid.CommitmentHash == "" {
		return fmt.Errorf("SUBMIT_BID_FAILED: commitment_hash is required for commit phase")
	}
	if bid.ZKPProof == "" {
		return fmt.Errorf("SUBMIT_BID_FAILED: range_check_proof is required")
	}

	// Verify range proof format
	valid, err := VerifyRangeProof(bid.ZKPProof)
	if err != nil || !valid {
		return fmt.Errorf("SUBMIT_BID_FAILED: invalid range proof: %v", err)
	}

	// Verify tender exists and is open for bidding
	tenderKey := CreateTenderCompositeKey(extractMinistryFromTenderID(bid.TenderID), bid.TenderID)
	tenderBytes, err := ctx.GetStub().GetState(tenderKey)
	if err != nil || tenderBytes == nil {
		return fmt.Errorf("SUBMIT_BID_FAILED: tender %s not found", bid.TenderID)
	}

	var tender TenderRecord
	json.Unmarshal(tenderBytes, &tender)

	if tender.Status != StatusBiddingOpen {
		return fmt.Errorf("SUBMIT_BID_FAILED: tender %s is not open for bidding (status: %s)",
			bid.TenderID, string(tender.Status))
	}

	// Set system fields
	bid.DocType = "bid"
	bid.BidderDID = identity.DID
	bid.Status = BidCommitted
	bid.SubmittedAtIST = GetCurrentIST()
	bid.BlockchainTxID = ctx.GetStub().GetTxID()

	// Store bid
	bidKey := CreateBidCompositeKey(bid.TenderID, bid.BidderDID, bid.BidID)
	bidBytes, _ := json.Marshal(bid)
	err = ctx.GetStub().PutState(bidKey, bidBytes)
	if err != nil {
		return fmt.Errorf("SUBMIT_BID_FAILED: ledger write error: %v", err)
	}

	// Audit event
	auditEvent := AuditEvent{
		DocType:        "audit",
		EventID:        fmt.Sprintf("EVT-%s-BID-%s", bid.TenderID, bid.BidID),
		EventType:      EventBidSubmitted,
		ActorDID:       identity.DID,
		ActorRole:      RoleBidder,
		TenderID:       bid.TenderID,
		PayloadHash:    HashBidData(bid.BidID, bid.TenderID, bid.BidderDID, 0),
		Description:    fmt.Sprintf("Sealed bid committed: %s for tender %s by %s. Amount HIDDEN (Commit Phase — SHA-256 commitment).", bid.BidID, bid.TenderID, identity.DID),
		RiskLevel:      RiskInfo,
		TimestampIST:   GetCurrentIST(),
		BlockchainTxID: ctx.GetStub().GetTxID(),
	}
	auditBytes, _ := json.Marshal(auditEvent)
	auditKey := CreateAuditCompositeKey(bid.TenderID, auditEvent.EventID)
	ctx.GetStub().PutState(auditKey, auditBytes)

	log.Printf("[TenderShield] Bid committed (Commit Phase): %s for tender %s ✅", bid.BidID, bid.TenderID)
	return nil
}

// ============================================================================
// 7. RevealBid — Reveal Phase: Reveal Bid Amount
// ============================================================================
// After the bid deadline, bidders reveal their actual amount + randomness.
// The chaincode verifies: SHA-256(amount || randomness) == stored commitment.
//
// ACCESS: BidderOrgMSP only
func (c *TenderShieldContract) RevealBid(ctx contractapi.TransactionContextInterface, tenderID, bidID, bidderDID string, revealedAmountPaise int64, randomnessHex string) error {
	log.Printf("[TenderShield] RevealBid (Reveal Phase): %s — Revealing amount", bidID)

	err := ValidateOrgAccess(ctx, "BidderOrgMSP")
	if err != nil {
		return fmt.Errorf("REVEAL_BID_FAILED: %v", err)
	}

	identity, _ := GetCallerIdentity(ctx)

	// Fetch the committed bid
	bidKey := CreateBidCompositeKey(tenderID, bidderDID, bidID)
	bidBytes, err := ctx.GetStub().GetState(bidKey)
	if err != nil || bidBytes == nil {
		return fmt.Errorf("REVEAL_BID_FAILED: bid %s not found", bidID)
	}

	var bid BidRecord
	json.Unmarshal(bidBytes, &bid)

	if bid.Status != BidCommitted {
		return fmt.Errorf("REVEAL_BID_FAILED: bid %s is in %s state — can only reveal COMMITTED bids",
			bidID, string(bid.Status))
	}

	// Verify SHA-256 commitment: SHA-256(revealed_amount || randomness) == stored_hash
	valid, err := VerifyCommitment(bid.CommitmentHash, revealedAmountPaise, randomnessHex)
	if !valid || err != nil {
		// SECURITY: Failed verification is logged as HIGH risk — possible tampering
		auditEvent := AuditEvent{
			DocType:        "audit",
			EventID:        fmt.Sprintf("EVT-%s-REVEAL-FAILED-%s", tenderID, bidID),
			EventType:      EventAIFlag,
			ActorDID:       identity.DID,
			ActorRole:      RoleBidder,
			TenderID:       tenderID,
			PayloadHash:    HashBidData(bidID, tenderID, bidderDID, revealedAmountPaise),
			Description:    fmt.Sprintf("🚨 COMMITMENT VERIFICATION FAILED: bid %s — hash mismatch. Possible bid tampering by %s", bidID, identity.DID),
			RiskLevel:      RiskHigh,
			TimestampIST:   GetCurrentIST(),
			BlockchainTxID: ctx.GetStub().GetTxID(),
		}
		auditBytes, _ := json.Marshal(auditEvent)
		auditKey := CreateAuditCompositeKey(tenderID, auditEvent.EventID)
		ctx.GetStub().PutState(auditKey, auditBytes)

		return fmt.Errorf("REVEAL_BID_FAILED: SHA-256 commitment verification failed for bid %s: %v", bidID, err)
	}

	// Update bid with revealed amount
	bid.RevealedAmountPaise = revealedAmountPaise
	bid.Status = BidRevealed
	bid.RevealAtIST = GetCurrentIST()
	bid.BlockchainTxID = ctx.GetStub().GetTxID()

	bidBytes, _ = json.Marshal(bid)
	ctx.GetStub().PutState(bidKey, bidBytes)

	// Audit event — successful reveal
	auditEvent := AuditEvent{
		DocType:        "audit",
		EventID:        fmt.Sprintf("EVT-%s-REVEALED-%s", tenderID, bidID),
		EventType:      EventBidRevealed,
		ActorDID:       identity.DID,
		ActorRole:      RoleBidder,
		TenderID:       tenderID,
		PayloadHash:    HashBidData(bidID, tenderID, bidderDID, revealedAmountPaise),
		Description:    fmt.Sprintf("Bid revealed: %s — Amount: %s (commitment verified ✅)", bidID, PaiseToRupeesDisplay(revealedAmountPaise)),
		RiskLevel:      RiskInfo,
		TimestampIST:   GetCurrentIST(),
		BlockchainTxID: ctx.GetStub().GetTxID(),
	}
	auditBytes, _ := json.Marshal(auditEvent)
	auditKey := CreateAuditCompositeKey(tenderID, auditEvent.EventID)
	ctx.GetStub().PutState(auditKey, auditBytes)

	log.Printf("[TenderShield] Bid REVEALED: %s — %s (commitment verified ✅)", bidID, PaiseToRupeesDisplay(revealedAmountPaise))
	return nil
}

// ============================================================================
// 8. EvaluateBids — Evaluate All Revealed Bids
// ============================================================================
// Evaluates all revealed bids for a tender, applies MSME preferences,
// ranks them, and moves the tender to UNDER_EVALUATION status.
//
// ACCESS: MinistryOrgMSP only
func (c *TenderShieldContract) EvaluateBids(ctx contractapi.TransactionContextInterface, ministryCode, tenderID string) (string, error) {
	log.Printf("[TenderShield] EvaluateBids for tender: %s", tenderID)

	err := ValidateOrgAccess(ctx, "MinistryOrgMSP")
	if err != nil {
		return "", fmt.Errorf("EVALUATE_FAILED: %v", err)
	}

	// Fetch tender
	tenderKey := CreateTenderCompositeKey(ministryCode, tenderID)
	tender, err := getTenderByKey(ctx, tenderKey)
	if err != nil {
		return "", err
	}

	if tender.Status == StatusFrozenByAI {
		return "", fmt.Errorf("EVALUATE_FAILED: tender %s is FROZEN — cannot evaluate", tenderID)
	}

	// Query all revealed bids using CouchDB rich query
	queryString := fmt.Sprintf(`{
		"selector": {
			"docType": "bid",
			"tender_id": "%s",
			"status": "REVEALED"
		}
	}`, tenderID)

	resultsIterator, err := ctx.GetStub().GetQueryResult(queryString)
	if err != nil {
		return "", fmt.Errorf("EVALUATE_FAILED: CouchDB query error: %v", err)
	}
	defer resultsIterator.Close()

	var evaluations []BidEvaluation
	for resultsIterator.HasNext() {
		result, err := resultsIterator.Next()
		if err != nil {
			continue
		}

		var bid BidRecord
		json.Unmarshal(result.Value, &bid)

		// Calculate MSME preference
		msmePref := CheckMSMEPreference(bid, *tender)
		adjustedAmount := bid.RevealedAmountPaise
		if msmePref > 0 {
			// Apply MSME discount for evaluation purposes only
			discount := float64(bid.RevealedAmountPaise) * msmePref / 100.0
			adjustedAmount = bid.RevealedAmountPaise - int64(discount)
		}

		eval := BidEvaluation{
			BidID:             bid.BidID,
			BidderDID:         bid.BidderDID,
			RevealedAmount:    bid.RevealedAmountPaise,
			MSMEPreference:    msmePref,
			AdjustedAmount:    adjustedAmount,
			EvaluationRemarks: fmt.Sprintf("Method: %s", string(GetEvaluationMethod(tender.Category))),
		}

		evaluations = append(evaluations, eval)
	}

	if len(evaluations) == 0 {
		return "", fmt.Errorf("EVALUATE_FAILED: no revealed bids found for tender %s", tenderID)
	}

	// Sort by adjusted amount (L1 = lowest wins)
	for i := 0; i < len(evaluations); i++ {
		for j := i + 1; j < len(evaluations); j++ {
			if evaluations[j].AdjustedAmount < evaluations[i].AdjustedAmount {
				evaluations[i], evaluations[j] = evaluations[j], evaluations[i]
			}
		}
	}

	// Assign ranks and mark winner
	for i := range evaluations {
		evaluations[i].Rank = i + 1
		evaluations[i].IsWinner = (i == 0)
		if evaluations[i].IsWinner {
			evaluations[i].EvaluationRemarks += " | L1 WINNER"
		}
	}

	// Update tender status
	tender.Status = StatusUnderEvaluation
	tender.BlockchainTxID = ctx.GetStub().GetTxID()
	putTender(ctx, tenderKey, *tender)

	// Return evaluation results as JSON
	evalJSON, _ := json.Marshal(evaluations)
	log.Printf("[TenderShield] Evaluation complete: %s — %d bids ranked ✅", tenderID, len(evaluations))
	return string(evalJSON), nil
}

// ============================================================================
// 9. QueryTenderByID — Get Single Tender
// ============================================================================
func (c *TenderShieldContract) QueryTenderByID(ctx contractapi.TransactionContextInterface, ministryCode, tenderID string) (string, error) {
	key := CreateTenderCompositeKey(ministryCode, tenderID)
	tenderBytes, err := ctx.GetStub().GetState(key)
	if err != nil {
		return "", fmt.Errorf("QUERY_ERROR: %v", err)
	}
	if tenderBytes == nil {
		return "", fmt.Errorf("QUERY_ERROR: tender %s not found", tenderID)
	}
	return string(tenderBytes), nil
}

// ============================================================================
// 10. QueryTendersByStatus — Get Tenders by Status
// ============================================================================
// Uses CouchDB rich query to find tenders by lifecycle status.
func (c *TenderShieldContract) QueryTendersByStatus(ctx contractapi.TransactionContextInterface, status string) (string, error) {
	queryString := fmt.Sprintf(`{
		"selector": {
			"docType": "tender",
			"status": "%s"
		},
		"sort": [{"created_at_ist": "desc"}],
		"limit": 100
	}`, status)

	resultsIterator, err := ctx.GetStub().GetQueryResult(queryString)
	if err != nil {
		return "", fmt.Errorf("QUERY_ERROR: CouchDB query failed: %v", err)
	}
	defer resultsIterator.Close()

	var tenders []TenderRecord
	for resultsIterator.HasNext() {
		result, err := resultsIterator.Next()
		if err != nil {
			continue
		}
		var tender TenderRecord
		json.Unmarshal(result.Value, &tender)
		tenders = append(tenders, tender)
	}

	tendersJSON, _ := json.Marshal(tenders)
	return string(tendersJSON), nil
}

// ============================================================================
// 11. GetTenderHistory — Blockchain History of a Tender
// ============================================================================
// Returns the complete modification history of a tender from the blockchain.
// Every state change is permanently recorded — this is the core audit trail
// that makes TenderShield tamper-proof.
func (c *TenderShieldContract) GetTenderHistory(ctx contractapi.TransactionContextInterface, ministryCode, tenderID string) (string, error) {
	key := CreateTenderCompositeKey(ministryCode, tenderID)

	historyIterator, err := ctx.GetStub().GetHistoryForKey(key)
	if err != nil {
		return "", fmt.Errorf("HISTORY_ERROR: %v", err)
	}
	defer historyIterator.Close()

	var history []HistoryRecord
	for historyIterator.HasNext() {
		modification, err := historyIterator.Next()
		if err != nil {
			continue
		}

		var tender TenderRecord
		if modification.Value != nil {
			json.Unmarshal(modification.Value, &tender)
		}

		record := HistoryRecord{
			TxID:      modification.TxId,
			Timestamp: modification.Timestamp.AsTime().In(IST).Format("2006-01-02T15:04:05+05:30"),
			Value:     tender,
			IsDeleted: modification.IsDelete,
		}
		history = append(history, record)
	}

	historyJSON, _ := json.Marshal(history)
	return string(historyJSON), nil
}

// ============================================================================
// 12. GetDashboardStats — Aggregated Statistics
// ============================================================================
func (c *TenderShieldContract) GetDashboardStats(ctx contractapi.TransactionContextInterface) (string, error) {
	stats := DashboardStats{}

	// Query all tenders
	tenderQuery := `{"selector": {"docType": "tender"}}`
	tenderIterator, err := ctx.GetStub().GetQueryResult(tenderQuery)
	if err != nil {
		return "", fmt.Errorf("STATS_ERROR: %v", err)
	}
	defer tenderIterator.Close()

	for tenderIterator.HasNext() {
		result, err := tenderIterator.Next()
		if err != nil {
			continue
		}

		var tender TenderRecord
		json.Unmarshal(result.Value, &tender)

		stats.TotalTenders++
		stats.TotalValueCrores += float64(tender.EstimatedValuePaise) / (100.0 * 100_00_00_000)

		switch tender.Status {
		case StatusBiddingOpen, StatusPublished, StatusUnderEvaluation:
			stats.ActiveTenders++
		case StatusFrozenByAI:
			stats.FlaggedTenders++
			stats.FraudPreventedValueCrores += float64(tender.EstimatedValuePaise) / (100.0 * 100_00_00_000)
		}
	}

	// Count bids
	bidQuery := `{"selector": {"docType": "bid"}}`
	bidIterator, err := ctx.GetStub().GetQueryResult(bidQuery)
	if err == nil {
		defer bidIterator.Close()
		for bidIterator.HasNext() {
			bidIterator.Next()
			stats.TotalBids++
		}
	}

	statsJSON, _ := json.Marshal(stats)
	return string(statsJSON), nil
}

// ============================================================================
// 13. RecordAuditEvent — Write Audit Event to Blockchain
// ============================================================================
// Allows authorized orgs to record audit events for CAG trail.
//
// ACCESS: All orgs (MinistryOrg, AuditorOrg, NICOrg for AI events)
func (c *TenderShieldContract) RecordAuditEvent(ctx contractapi.TransactionContextInterface, auditJSON string) error {
	err := ValidateMultiOrgAccess(ctx, []string{"MinistryOrgMSP", "AuditorOrgMSP", "NICOrgMSP"})
	if err != nil {
		return fmt.Errorf("AUDIT_EVENT_FAILED: %v", err)
	}

	var event AuditEvent
	err = json.Unmarshal([]byte(auditJSON), &event)
	if err != nil {
		return fmt.Errorf("AUDIT_EVENT_FAILED: invalid JSON: %v", err)
	}

	event.DocType = "audit"
	event.BlockchainTxID = ctx.GetStub().GetTxID()
	if event.TimestampIST == "" {
		event.TimestampIST = GetCurrentIST()
	}

	eventBytes, _ := json.Marshal(event)
	key := CreateAuditCompositeKey(event.TenderID, event.EventID)
	return ctx.GetStub().PutState(key, eventBytes)
}

// ============================================================================
// Internal Helper Functions
// ============================================================================

// getTenderByKey fetches a tender from the ledger by its composite key
func getTenderByKey(ctx contractapi.TransactionContextInterface, key string) (*TenderRecord, error) {
	tenderBytes, err := ctx.GetStub().GetState(key)
	if err != nil {
		return nil, fmt.Errorf("LEDGER_ERROR: failed to read tender: %v", err)
	}
	if tenderBytes == nil {
		return nil, fmt.Errorf("NOT_FOUND: tender not found for key: %s", key)
	}

	var tender TenderRecord
	err = json.Unmarshal(tenderBytes, &tender)
	if err != nil {
		return nil, fmt.Errorf("PARSE_ERROR: failed to unmarshal tender: %v", err)
	}

	return &tender, nil
}

// putTender writes a tender to the ledger
func putTender(ctx contractapi.TransactionContextInterface, key string, tender TenderRecord) error {
	tenderBytes, err := json.Marshal(tender)
	if err != nil {
		return fmt.Errorf("MARSHAL_ERROR: %v", err)
	}
	return ctx.GetStub().PutState(key, tenderBytes)
}

// extractMinistryFromTenderID extracts ministry code from tender ID
// TDR-MoRTH-2025-000001 → MoRTH
func extractMinistryFromTenderID(tenderID string) string {
	parts := strings.Split(tenderID, "-")
	if len(parts) >= 3 {
		return parts[1]
	}
	return ""
}

// ============================================================================
// Main — Chaincode Entrypoint
// ============================================================================

func main() {
	chaincode, err := contractapi.NewChaincode(&TenderShieldContract{})
	if err != nil {
		log.Panicf("FATAL: Error creating TenderShield chaincode: %v", err)
	}

	chaincode.Info.Title = "TenderShield"
	chaincode.Info.Version = "1.0.0"

	if err := chaincode.Start(); err != nil {
		log.Panicf("FATAL: Error starting TenderShield chaincode: %v", err)
	}
}
