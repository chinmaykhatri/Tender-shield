// ============================================================================
// TenderShield — Chaincode Unit Tests
// ============================================================================
// Tests for ZKP commit-reveal protocol, GFR compliance validation,
// identity verification, and core business logic.
//
// DESIGN DECISION: Using Go's standard testing package rather than a
// BDD framework for simplicity and compatibility with Fabric CI pipelines.
//
// Run: go test -v ./...
// ============================================================================

package main

import (
	"encoding/json"
	"testing"
)

// ============================================================================
// ZKP Commitment Tests
// ============================================================================

func TestCreateCommitment_ValidAmount(t *testing.T) {
	// Test: Create a commitment for ₹10 Crore (valid amount)
	amountPaise := int64(10_00_00_000 * 100) // ₹10 Crore in paise

	commitment, randomness, err := CreateCommitment(amountPaise)
	if err != nil {
		t.Fatalf("CreateCommitment failed: %v", err)
	}

	if commitment == "" {
		t.Fatal("Expected non-empty commitment hash")
	}
	if randomness == "" {
		t.Fatal("Expected non-empty randomness")
	}

	// Commitment should be 64 hex chars (SHA-256 = 32 bytes = 64 hex)
	if len(commitment) != 64 {
		t.Fatalf("Expected 64 char commitment hash, got %d", len(commitment))
	}

	// Randomness should be 64 hex chars (32 bytes = 64 hex)
	if len(randomness) != 64 {
		t.Fatalf("Expected 64 char randomness, got %d", len(randomness))
	}

	t.Logf("✅ Commitment: %s", commitment[:16]+"...")
	t.Logf("✅ Randomness: %s", randomness[:16]+"...")
}

func TestCreateCommitment_MinimumAmount(t *testing.T) {
	// Test: Create commitment for minimum amount (₹1 = 100 paise)
	_, _, err := CreateCommitment(100)
	if err != nil {
		t.Fatalf("CreateCommitment for ₹1 should succeed: %v", err)
	}
	t.Log("✅ Minimum amount (₹1) commitment created successfully")
}

func TestCreateCommitment_BelowMinimum(t *testing.T) {
	// Test: Amount below minimum should fail
	_, _, err := CreateCommitment(50) // ₹0.50
	if err == nil {
		t.Fatal("Expected error for amount below minimum")
	}
	t.Logf("✅ Correctly rejected amount below minimum: %v", err)
}

func TestCreateCommitment_AboveMaximum(t *testing.T) {
	// Test: Amount above ₹10,000 Crore should fail
	_, _, err := CreateCommitment(MaxBidAmountPaise + 1)
	if err == nil {
		t.Fatal("Expected error for amount above maximum")
	}
	t.Logf("✅ Correctly rejected amount above maximum: %v", err)
}

func TestVerifyCommitment_ValidReveal(t *testing.T) {
	// Test: Commit then reveal — should verify successfully
	amountPaise := int64(450_00_00_000 * 100) // ₹450 Crore

	commitment, randomness, err := CreateCommitment(amountPaise)
	if err != nil {
		t.Fatalf("CreateCommitment failed: %v", err)
	}

	valid, err := VerifyCommitment(commitment, amountPaise, randomness)
	if err != nil {
		t.Fatalf("VerifyCommitment failed: %v", err)
	}
	if !valid {
		t.Fatal("Expected verification to pass for correct reveal")
	}

	t.Log("✅ ZKP commit-reveal verified successfully")
}

func TestVerifyCommitment_WrongAmount(t *testing.T) {
	// Test: Reveal with different amount — should FAIL (binding property)
	// SECURITY: This proves a bidder cannot change their bid after committing
	originalAmount := int64(450_00_00_000 * 100)  // ₹450 Crore
	tamperedAmount := int64(400_00_00_000 * 100)   // ₹400 Crore (cheaper)

	commitment, randomness, _ := CreateCommitment(originalAmount)

	valid, err := VerifyCommitment(commitment, tamperedAmount, randomness)
	if valid {
		t.Fatal("SECURITY FAILURE: Verification should fail for wrong amount — binding property broken!")
	}

	t.Logf("✅ Correctly rejected tampered amount: %v", err)
}

func TestVerifyCommitment_WrongRandomness(t *testing.T) {
	// Test: Reveal with wrong randomness — should FAIL
	amount := int64(85_00_00_000 * 100) // ₹85 Crore

	commitment, _, _ := CreateCommitment(amount)

	// Try with fabricated randomness
	valid, err := VerifyCommitment(commitment, amount, "deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef")
	if valid {
		t.Fatal("SECURITY FAILURE: Verification should fail for wrong randomness!")
	}

	t.Logf("✅ Correctly rejected wrong randomness: %v", err)
}

func TestVerifyCommitment_UniqueCommitments(t *testing.T) {
	// Test: Same amount produces different commitments (hiding property)
	// SECURITY: Two bidders with same amount won't have matching commitments
	amount := int64(120_00_00_000 * 100)

	commitment1, _, _ := CreateCommitment(amount)
	commitment2, _, _ := CreateCommitment(amount)

	if commitment1 == commitment2 {
		t.Fatal("SECURITY CONCERN: Same amount produced identical commitments — hiding property weak")
	}

	t.Log("✅ Same amount produces different commitments (hiding property confirmed)")
}

// ============================================================================
// Range Proof Tests
// ============================================================================

func TestRangeProof_ValidProof(t *testing.T) {
	amount := int64(85_00_00_000 * 100) // ₹85 Crore
	_, randomness, _ := CreateCommitment(amount)

	proof, err := CreateRangeProof(amount, randomness)
	if err != nil {
		t.Fatalf("CreateRangeProof failed: %v", err)
	}

	valid, err := VerifyRangeProof(proof)
	if err != nil || !valid {
		t.Fatalf("VerifyRangeProof failed: %v", err)
	}

	t.Logf("✅ Range proof verified: %s", proof[:30]+"...")
}

func TestRangeProof_InvalidFormat(t *testing.T) {
	_, err := VerifyRangeProof("INVALID_PROOF")
	if err == nil {
		t.Fatal("Expected error for invalid range proof format")
	}
	t.Logf("✅ Correctly rejected invalid proof: %v", err)
}

// ============================================================================
// GFR Compliance Tests
// ============================================================================

func TestGFRCompliance_ValidOpenTender(t *testing.T) {
	// Test: ₹450 Crore WORKS tender with OPEN method — should PASS
	tender := TenderRecord{
		TenderID:            "TDR-MoRTH-2025-000001",
		MinistryCode:        "MoRTH",
		Title:               "NH-44 Highway Expansion (6-lane)",
		Description:         "Construction and widening of National Highway 44",
		EstimatedValuePaise: 450_00_00_000 * 100,
		Category:            CategoryWorks,
		ProcurementMethod:   MethodOpen,
		GFRRuleReference:    "GFR Rule 149",
	}

	result := ValidateGFRCompliance(tender)
	if !result.IsCompliant {
		t.Fatalf("Expected compliant tender, got violations: %v", result.Violations)
	}

	t.Log("✅ ₹450 Crore OPEN tender passed GFR compliance")
}

func TestGFRCompliance_Rule149Violation(t *testing.T) {
	// Test: ₹50 lakh tender with LIMITED method — should FAIL (Rule 149)
	// GFR Rule 149: >₹25 lakh MUST use open tender
	tender := TenderRecord{
		TenderID:            "TDR-MoE-2025-000002",
		MinistryCode:        "MoE",
		Title:               "School furniture procurement",
		Description:         "Procurement of desks and chairs for 50 schools",
		EstimatedValuePaise: 50_00_000 * 100, // ₹50 lakh in paise
		Category:            CategoryGoods,
		ProcurementMethod:   MethodLimited, // VIOLATION: should be OPEN
		GFRRuleReference:    "GFR Rule 151",
	}

	result := ValidateGFRCompliance(tender)
	if result.IsCompliant {
		t.Fatal("Expected GFR Rule 149 violation for >₹25 lakh LIMITED tender")
	}

	foundViolation := false
	for _, v := range result.Violations {
		if len(v) > 0 {
			foundViolation = true
		}
	}
	if !foundViolation {
		t.Fatal("Expected violation message")
	}

	t.Logf("✅ GFR Rule 149 violation correctly detected: %v", result.Violations)
}

func TestGFRCompliance_MissingFields(t *testing.T) {
	// Test: Tender with missing mandatory fields
	tender := TenderRecord{
		TenderID:            "TDR-TEST-2025-000001",
		EstimatedValuePaise: 10_00_000 * 100,
		ProcurementMethod:   MethodOpen,
		// Missing: Title, Description, GFRRuleReference
	}

	result := ValidateGFRCompliance(tender)
	if result.IsCompliant {
		t.Fatal("Expected compliance failure for missing fields")
	}

	t.Logf("✅ Missing fields correctly detected: %d violations", len(result.Violations))
}

// ============================================================================
// Bid Security Tests (GFR Rule 153)
// ============================================================================

func TestBidSecurity_SmallTender(t *testing.T) {
	// Test: ₹5 lakh tender — EMD should be 2%
	valuePaise := int64(5_00_000 * 100) // ₹5 lakh
	security := CalculateBidSecurity(valuePaise)

	if security.MinPercentage != 0.02 {
		t.Fatalf("Expected 2%% EMD for small tender, got %.2f%%", security.MinPercentage*100)
	}

	expectedEMD := int64(10_000 * 100) // ₹10,000
	if security.CalculatedPaise != expectedEMD {
		t.Fatalf("Expected EMD %d paise, got %d", expectedEMD, security.CalculatedPaise)
	}

	t.Logf("✅ ₹5 lakh tender: EMD = %s (2%%)", PaiseToRupeesDisplay(security.CalculatedPaise))
}

func TestBidSecurity_LargeTender(t *testing.T) {
	// Test: ₹100 Crore tender — EMD should be 2-5%
	valuePaise := int64(100_00_00_000 * 100)
	security := CalculateBidSecurity(valuePaise)

	if security.MinPercentage != 0.02 || security.MaxPercentage != 0.05 {
		t.Fatalf("Expected 2-5%% range for large tender")
	}

	t.Logf("✅ ₹100 Crore tender: EMD = %s (2-5%%)", PaiseToRupeesDisplay(security.CalculatedPaise))
}

// ============================================================================
// MSME Preference Tests (GFR Rule 153A)
// ============================================================================

func TestMSMEPreference_Registered(t *testing.T) {
	bid := BidRecord{MSMERegistered: true}
	tender := TenderRecord{Category: CategoryGoods}

	pref := CheckMSMEPreference(bid, tender)
	if pref != 15.0 {
		t.Fatalf("Expected 15%% MSME preference, got %.1f%%", pref)
	}

	t.Log("✅ MSME registered bidder gets 15% preference")
}

func TestMSMEPreference_DPIITStartup(t *testing.T) {
	bid := BidRecord{MSMERegistered: true, DPIITNumber: "DIPP12345"}
	tender := TenderRecord{Category: CategoryGoods}

	pref := CheckMSMEPreference(bid, tender)
	if pref != 20.0 {
		t.Fatalf("Expected 20%% preference for DPIIT startup, got %.1f%%", pref)
	}

	t.Log("✅ DPIIT registered startup gets 20% preference")
}

func TestMSMEPreference_NotRegistered(t *testing.T) {
	bid := BidRecord{MSMERegistered: false}
	tender := TenderRecord{Category: CategoryGoods}

	pref := CheckMSMEPreference(bid, tender)
	if pref != 0.0 {
		t.Fatalf("Expected 0%% for non-MSME, got %.1f%%", pref)
	}

	t.Log("✅ Non-MSME bidder gets 0% preference")
}

// ============================================================================
// Model Serialization Tests
// ============================================================================

func TestTenderRecord_JSONSerialize(t *testing.T) {
	tender := TenderRecord{
		DocType:             "tender",
		TenderID:            "TDR-MoRTH-2025-000001",
		MinistryCode:        "MoRTH",
		Department:          "National Highways Division",
		Title:               "NH-44 Highway Expansion",
		Description:         "Construction of 6-lane highway",
		EstimatedValuePaise: 450_00_00_000 * 100,
		Category:            CategoryWorks,
		ProcurementMethod:   MethodOpen,
		Status:              StatusBiddingOpen,
		GFRRuleReference:    "GFR Rule 149",
		CreatedByDID:        "did:tendershield:ministryorgmsp:officer1",
		CreatedAtIST:        GetCurrentIST(),
	}

	jsonBytes, err := json.Marshal(tender)
	if err != nil {
		t.Fatalf("Marshal failed: %v", err)
	}

	var restored TenderRecord
	err = json.Unmarshal(jsonBytes, &restored)
	if err != nil {
		t.Fatalf("Unmarshal failed: %v", err)
	}

	if restored.TenderID != tender.TenderID {
		t.Fatalf("TenderID mismatch: %s != %s", restored.TenderID, tender.TenderID)
	}
	if restored.EstimatedValuePaise != tender.EstimatedValuePaise {
		t.Fatalf("Value mismatch: %d != %d", restored.EstimatedValuePaise, tender.EstimatedValuePaise)
	}

	t.Logf("✅ TenderRecord JSON round-trip: %s — %s", tender.TenderID, PaiseToRupeesDisplay(tender.EstimatedValuePaise))
}

func TestBidRecord_JSONSerialize(t *testing.T) {
	bid := BidRecord{
		DocType:        "bid",
		BidID:          "BID-TDR-MoRTH-2025-000001-BIDDER001",
		TenderID:       "TDR-MoRTH-2025-000001",
		BidderDID:      "did:tendershield:bidderorgmsp:company1",
		BidderGSTIN:    "22AAAAA0000A1Z5",
		BidderPAN:      "ABCDE1234F",
		MSMERegistered: true,
		CommitmentHash: "abc123",
		ZKPProof:       "RANGE_PROOF_V1:47:abc123def45678:abcdef0123456789abcdef0123456789",
		Status:         BidCommitted,
		SubmittedAtIST: GetCurrentIST(),
	}

	jsonBytes, err := json.Marshal(bid)
	if err != nil {
		t.Fatalf("Marshal failed: %v", err)
	}

	var restored BidRecord
	err = json.Unmarshal(jsonBytes, &restored)
	if err != nil {
		t.Fatalf("Unmarshal failed: %v", err)
	}

	if restored.BidID != bid.BidID {
		t.Fatalf("BidID mismatch")
	}
	if restored.BidderGSTIN != "22AAAAA0000A1Z5" {
		t.Fatalf("GSTIN mismatch")
	}

	t.Log("✅ BidRecord JSON round-trip successful")
}

// ============================================================================
// Helper Function Tests
// ============================================================================

func TestPaiseToRupeesDisplay(t *testing.T) {
	tests := []struct {
		paise    int64
		expected string
	}{
		{100, "₹1.00"},
		{50000, "₹500.00"},
		{100_00_000, "₹1.00 Lakh"},
		{25_00_00_000, "₹2.50 Lakh"},
		{1_00_00_00_000, "₹1.00 Crore"},
		{450_00_00_000 * 100, "₹450.00 Crore"},
	}

	for _, tt := range tests {
		result := PaiseToRupeesDisplay(tt.paise)
		if result != tt.expected {
			t.Errorf("PaiseToRupeesDisplay(%d) = %s, want %s", tt.paise, result, tt.expected)
		}
	}

	t.Log("✅ All paise-to-rupees conversions correct")
}

func TestCompositeKeys(t *testing.T) {
	tenderKey := CreateTenderCompositeKey("MoRTH", "TDR-MoRTH-2025-000001")
	if tenderKey != "TENDER~MoRTH~TDR-MoRTH-2025-000001" {
		t.Fatalf("TenderKey wrong: %s", tenderKey)
	}

	bidKey := CreateBidCompositeKey("TDR-MoRTH-2025-000001", "did:bidder:1", "BID-001")
	if bidKey != "BID~TDR-MoRTH-2025-000001~did:bidder:1~BID-001" {
		t.Fatalf("BidKey wrong: %s", bidKey)
	}

	t.Log("✅ Composite key generation correct")
}

func TestGetCurrentIST(t *testing.T) {
	ist := GetCurrentIST()
	if ist == "" {
		t.Fatal("GetCurrentIST returned empty string")
	}

	// Should end with +05:30 (IST)
	if len(ist) < 6 || ist[len(ist)-6:] != "+05:30" {
		t.Fatalf("Expected IST offset +05:30, got: %s", ist)
	}

	t.Logf("✅ Current IST: %s", ist)
}

func TestEvaluationMethodSelection(t *testing.T) {
	if GetEvaluationMethod(CategoryWorks) != EvalL1 {
		t.Fatal("WORKS should use L1")
	}
	if GetEvaluationMethod(CategoryGoods) != EvalL1 {
		t.Fatal("GOODS should use L1")
	}
	if GetEvaluationMethod(CategoryServices) != EvalLCS {
		t.Fatal("SERVICES should use LCS")
	}
	if GetEvaluationMethod(CategoryConsultancy) != EvalQCBS {
		t.Fatal("CONSULTANCY should use QCBS")
	}

	t.Log("✅ Evaluation method selection correct per GFR 2017")
}

func TestHashFunctions(t *testing.T) {
	hash1 := HashTenderData("TDR-001", "MoRTH", "Highway", 100)
	hash2 := HashTenderData("TDR-001", "MoRTH", "Highway", 100)
	hash3 := HashTenderData("TDR-001", "MoRTH", "Highway", 200) // different amount

	if hash1 != hash2 {
		t.Fatal("Same inputs should produce same hash")
	}
	if hash1 == hash3 {
		t.Fatal("Different inputs should produce different hash")
	}

	t.Log("✅ Hash functions are deterministic and collision-resistant")
}
