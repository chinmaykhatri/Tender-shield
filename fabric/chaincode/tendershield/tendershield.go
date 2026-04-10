// SPDX-License-Identifier: MIT

package main

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// TenderShield Chaincode for Hyperledger Fabric 2.5
// Endorsement: AND('MinistryMSP.peer', 'NICMSP.peer')

// Tender represents a government procurement tender on the ledger
type Tender struct {
	ID             string  `json:"id"`
	Title          string  `json:"title"`
	Ministry       string  `json:"ministry"`
	EstimatedValue float64 `json:"estimated_value"`
	Status         string  `json:"status"` // DRAFT, OPEN, EVALUATION, AWARDED, FROZEN
	RiskScore      int     `json:"risk_score"`
	HashChain      string  `json:"hash_chain"` // SHA-256 hash of all events
	CreatedAt      string  `json:"created_at"`
	UpdatedAt      string  `json:"updated_at"`
	CreatedBy      string  `json:"created_by"`
}

// Bid represents a sealed bid commitment
type Bid struct {
	ID          string  `json:"id"`
	TenderID    string  `json:"tender_id"`
	BidderName  string  `json:"bidder_name"`
	Commitment  string  `json:"commitment"` // SHA-256(amount + nonce)
	Amount      float64 `json:"amount"`     // Revealed after unsealing
	Revealed    bool    `json:"revealed"`
	Flagged     bool    `json:"flagged"`
	SubmittedAt string  `json:"submitted_at"`
}

// AuditEvent represents an immutable audit log entry
type AuditEvent struct {
	ID        string `json:"id"`
	TenderID  string `json:"tender_id"`
	Action    string `json:"action"`
	Actor     string `json:"actor"`
	Severity  string `json:"severity"`
	Details   string `json:"details"`
	Timestamp string `json:"timestamp"`
}

// TenderShieldContract implements the chaincode interface
type TenderShieldContract struct {
	contractapi.Contract
}

// CreateTender creates a new tender on the ledger
func (c *TenderShieldContract) CreateTender(ctx contractapi.TransactionContextInterface, id string, title string, ministry string, value float64) error {
	exists, err := c.TenderExists(ctx, id)
	if err != nil {
		return err
	}
	if exists {
		return fmt.Errorf("tender %s already exists", id)
	}

	tender := Tender{
		ID:             id,
		Title:          title,
		Ministry:       ministry,
		EstimatedValue: value,
		Status:         "DRAFT",
		RiskScore:      0,
		CreatedAt:      time.Now().UTC().Format(time.RFC3339),
		UpdatedAt:      time.Now().UTC().Format(time.RFC3339),
	}

	tenderJSON, err := json.Marshal(tender)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(id, tenderJSON)
}

// SubmitBid records a sealed bid commitment
func (c *TenderShieldContract) SubmitBid(ctx contractapi.TransactionContextInterface, bidID string, tenderID string, bidderName string, commitment string) error {
	tender, err := c.ReadTender(ctx, tenderID)
	if err != nil {
		return err
	}
	if tender.Status != "OPEN" {
		return fmt.Errorf("tender %s is not open for bidding (status: %s)", tenderID, tender.Status)
	}

	bid := Bid{
		ID:          bidID,
		TenderID:    tenderID,
		BidderName:  bidderName,
		Commitment:  commitment,
		Revealed:    false,
		Flagged:     false,
		SubmittedAt: time.Now().UTC().Format(time.RFC3339),
	}

	bidJSON, err := json.Marshal(bid)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState("BID_"+bidID, bidJSON)
}

// FreezeTender freezes a tender for investigation
func (c *TenderShieldContract) FreezeTender(ctx contractapi.TransactionContextInterface, id string, reason string) error {
	tender, err := c.ReadTender(ctx, id)
	if err != nil {
		return err
	}

	tender.Status = "FROZEN"
	tender.UpdatedAt = time.Now().UTC().Format(time.RFC3339)

	tenderJSON, err := json.Marshal(tender)
	if err != nil {
		return err
	}

	// Log audit event
	event := AuditEvent{
		ID:        fmt.Sprintf("EVT_%d", time.Now().UnixNano()),
		TenderID:  id,
		Action:    "TENDER_FROZEN",
		Severity:  "CRITICAL",
		Details:   reason,
		Timestamp: time.Now().UTC().Format(time.RFC3339),
	}
	eventJSON, _ := json.Marshal(event)
	ctx.GetStub().PutState("EVENT_"+event.ID, eventJSON)

	return ctx.GetStub().PutState(id, tenderJSON)
}

// AwardTender awards a tender to the L1 bidder
func (c *TenderShieldContract) AwardTender(ctx contractapi.TransactionContextInterface, id string, winnerBidID string) error {
	tender, err := c.ReadTender(ctx, id)
	if err != nil {
		return err
	}

	if tender.Status == "FROZEN" {
		return fmt.Errorf("tender %s is frozen and cannot be awarded", id)
	}

	tender.Status = "AWARDED"
	tender.UpdatedAt = time.Now().UTC().Format(time.RFC3339)

	tenderJSON, err := json.Marshal(tender)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(id, tenderJSON)
}

// ReadTender retrieves a tender from the ledger
func (c *TenderShieldContract) ReadTender(ctx contractapi.TransactionContextInterface, id string) (*Tender, error) {
	tenderJSON, err := ctx.GetStub().GetState(id)
	if err != nil {
		return nil, fmt.Errorf("failed to read tender: %v", err)
	}
	if tenderJSON == nil {
		return nil, fmt.Errorf("tender %s does not exist", id)
	}

	var tender Tender
	err = json.Unmarshal(tenderJSON, &tender)
	if err != nil {
		return nil, err
	}

	return &tender, nil
}

// TenderExists checks if a tender exists
func (c *TenderShieldContract) TenderExists(ctx contractapi.TransactionContextInterface, id string) (bool, error) {
	tenderJSON, err := ctx.GetStub().GetState(id)
	if err != nil {
		return false, err
	}
	return tenderJSON != nil, nil
}

func main() {
	chaincode, err := contractapi.NewChaincode(&TenderShieldContract{})
	if err != nil {
		fmt.Printf("Error creating TenderShield chaincode: %v\n", err)
		return
	}

	if err := chaincode.Start(); err != nil {
		fmt.Printf("Error starting TenderShield chaincode: %v\n", err)
	}
}
