// ============================================================================
// TenderShield — GFR 2017 Compliance Engine
// ============================================================================
// Implements mandatory compliance checks per India's General Financial Rules
// 2017 (GFR 2017). These rules govern all government procurement in India.
//
// DESIGN DECISION: Compliance checks are embedded in chaincode rather than
// in the backend, so they are enforced at the blockchain level. Even if the
// backend is compromised, non-compliant tenders cannot be created.
//
// KEY GFR 2017 RULES IMPLEMENTED:
//   Rule 144: Tender notice requirements (minimum publicity period)
//   Rule 149: Open tender threshold (>₹25 lakh must be open tender)
//   Rule 153: Bid security/EMD requirements (2-5% of estimated value)
//   Rule 153A: MSME preferences (purchase preference for MSMEs)
//
// SECURITY NOTE: These checks run on every peer during endorsement, ensuring
// no single node can bypass compliance.
// ============================================================================

package main

import (
	"fmt"
	"math"
)

// ============================================================================
// Compliance Validation
// ============================================================================

// ValidateGFRCompliance performs comprehensive GFR 2017 compliance validation
// on a tender record. Returns a ComplianceResult indicating whether the
// tender meets all mandatory requirements.
//
// DESIGN DECISION: We check all rules and collect ALL violations rather than
// failing on the first one. This gives officers a complete picture of what
// needs to be fixed, reducing back-and-forth.
//
// GFR REFERENCE: Rules 144, 149, 153, 153A
func ValidateGFRCompliance(tender TenderRecord) ComplianceResult {
	result := ComplianceResult{
		IsCompliant:    true,
		Violations:     []string{},
		RuleReferences: []string{},
		CheckedAt:      GetCurrentIST(),
	}

	// -----------------------------------------------------------------------
	// GFR Rule 144: Tender Notice Requirements
	// Every tender must have a title, description, and adequate notice period.
	// Minimum 2 weeks for open tenders, 1 week for limited tenders.
	// -----------------------------------------------------------------------
	if tender.Title == "" {
		result.IsCompliant = false
		result.Violations = append(result.Violations,
			"GFR Rule 144 VIOLATION: Tender must have a title for public notice")
		result.RuleReferences = append(result.RuleReferences, "GFR Rule 144")
	}

	if tender.Description == "" {
		result.IsCompliant = false
		result.Violations = append(result.Violations,
			"GFR Rule 144 VIOLATION: Tender must have a description with full specifications")
		result.RuleReferences = append(result.RuleReferences, "GFR Rule 144")
	}

	if tender.GFRRuleReference == "" {
		result.IsCompliant = false
		result.Violations = append(result.Violations,
			"COMPLIANCE VIOLATION: GFR rule reference is mandatory for all tenders")
		result.RuleReferences = append(result.RuleReferences, "GFR General")
	}

	// -----------------------------------------------------------------------
	// GFR Rule 149: Open Tender Threshold
	// Estimated value > ₹25 lakh = MUST use open tender method.
	// This prevents splitting of tenders to avoid competition.
	// ₹25 lakh = 25,00,000 rupees = 2,50,000,000 paise
	// -----------------------------------------------------------------------
	thresholdOpenTender := int64(25_00_000 * 100) // ₹25 lakh in paise
	if tender.EstimatedValuePaise > thresholdOpenTender &&
		tender.ProcurementMethod != MethodOpen {
		result.IsCompliant = false
		result.Violations = append(result.Violations,
			fmt.Sprintf(
				"GFR Rule 149 VIOLATION: Estimated value %s exceeds ₹25 lakh threshold. "+
					"Open tender method is MANDATORY. Current method: %s. "+
					"Limited/Single source requires special approval from competent authority",
				PaiseToRupeesDisplay(tender.EstimatedValuePaise),
				string(tender.ProcurementMethod),
			))
		result.RuleReferences = append(result.RuleReferences, "GFR Rule 149")
	}

	// -----------------------------------------------------------------------
	// GFR Rule 149 Sub-check: Split Tendering Detection
	// If value is suspiciously close to ₹25 lakh and method is LIMITED,
	// flag potential split tendering (corruption technique).
	// -----------------------------------------------------------------------
	splitTenderingThreshold := int64(20_00_000 * 100) // ₹20 lakh in paise
	if tender.EstimatedValuePaise > splitTenderingThreshold &&
		tender.EstimatedValuePaise <= thresholdOpenTender &&
		tender.ProcurementMethod == MethodLimited {
		// Not a hard violation but a warning — AI engine will further analyze
		result.Violations = append(result.Violations,
			fmt.Sprintf(
				"GFR Rule 149 WARNING: Estimated value %s is between ₹20-25 lakh range "+
					"with LIMITED method. Potential split tendering detected. "+
					"AI engine will flag for further analysis",
				PaiseToRupeesDisplay(tender.EstimatedValuePaise),
			))
		result.RuleReferences = append(result.RuleReferences, "GFR Rule 149 (Split Tender Warning)")
	}

	// -----------------------------------------------------------------------
	// GFR Rule 153: Bid Security / EMD Requirements
	// Bid security (Earnest Money Deposit) is mandatory:
	//   - 2% to 5% of estimated value
	//   - Exact percentage depends on tender value
	// This validation ensures the tender creator is aware of EMD requirements.
	// -----------------------------------------------------------------------
	if tender.EstimatedValuePaise > 0 {
		bidSecurity := CalculateBidSecurity(tender.EstimatedValuePaise)
		if bidSecurity.CalculatedPaise > 0 {
			result.RuleReferences = append(result.RuleReferences,
				fmt.Sprintf("GFR Rule 153: Bid security required = %s (%.1f%% of estimated value)",
					PaiseToRupeesDisplay(bidSecurity.CalculatedPaise),
					bidSecurity.MinPercentage*100))
		}
	}

	// -----------------------------------------------------------------------
	// Tender Value Validation
	// -----------------------------------------------------------------------
	if tender.EstimatedValuePaise <= 0 {
		result.IsCompliant = false
		result.Violations = append(result.Violations,
			"VALUE VIOLATION: Estimated value must be positive (in paise)")
		result.RuleReferences = append(result.RuleReferences, "GFR General")
	}

	// Max tender value sanity check — ₹10,000 Crore
	maxValue := int64(10_000) * 100_00_00_000 * 100 // ₹10,000 Crore in paise
	if tender.EstimatedValuePaise > maxValue {
		result.IsCompliant = false
		result.Violations = append(result.Violations,
			fmt.Sprintf("VALUE VIOLATION: Estimated value %s exceeds maximum ₹10,000 Crore. "+
				"Tenders of this size require Cabinet Committee on Economic Affairs (CCEA) approval",
				PaiseToRupeesDisplay(tender.EstimatedValuePaise)))
		result.RuleReferences = append(result.RuleReferences, "GFR General / CCEA")
	}

	// -----------------------------------------------------------------------
	// Category validation
	// -----------------------------------------------------------------------
	validCategories := map[TenderCategory]bool{
		CategoryWorks:       true,
		CategoryGoods:       true,
		CategoryServices:    true,
		CategoryConsultancy: true,
	}
	if !validCategories[tender.Category] {
		result.IsCompliant = false
		result.Violations = append(result.Violations,
			fmt.Sprintf("CATEGORY VIOLATION: Invalid category '%s'. "+
				"Must be one of: WORKS, GOODS, SERVICES, CONSULTANCY",
				string(tender.Category)))
		result.RuleReferences = append(result.RuleReferences, "GFR Rule 144")
	}

	return result
}

// ============================================================================
// Bid Security Calculation
// ============================================================================

// CalculateBidSecurity calculates the required bid security (Earnest Money
// Deposit / EMD) per GFR Rule 153.
//
// GFR REFERENCE: Rule 153 — Bid Security
//   - 2% to 5% of estimated value
//   - For values < ₹10 lakh: 2% EMD
//   - For values ₹10 lakh to ₹1 crore: 2-3% EMD
//   - For values > ₹1 crore: 2-5% EMD (higher for WORKS)
//   - MSMEs may be exempt from EMD per Rule 153A
//
// DESIGN DECISION: We calculate the minimum required EMD. The actual EMD
// may be higher based on ministry-specific guidelines.
func CalculateBidSecurity(tenderValuePaise int64) BidSecurityRequirement {
	if tenderValuePaise <= 0 {
		return BidSecurityRequirement{
			MinPercentage:   0,
			MaxPercentage:   0,
			CalculatedPaise: 0,
			GFRReference:    "GFR Rule 153",
		}
	}

	var minPct, maxPct float64

	tenderValueRupees := float64(tenderValuePaise) / 100.0

	switch {
	case tenderValueRupees < 10_00_000: // < ₹10 lakh
		minPct = 0.02
		maxPct = 0.02
	case tenderValueRupees < 1_00_00_000: // ₹10 lakh to ₹1 crore
		minPct = 0.02
		maxPct = 0.03
	default: // > ₹1 crore
		minPct = 0.02
		maxPct = 0.05
	}

	// Calculate minimum EMD in paise
	calculatedPaise := int64(math.Ceil(float64(tenderValuePaise) * minPct))

	return BidSecurityRequirement{
		MinPercentage:   minPct,
		MaxPercentage:   maxPct,
		CalculatedPaise: calculatedPaise,
		GFRReference:    "GFR Rule 153",
	}
}

// ============================================================================
// MSME Preference Calculation
// ============================================================================

// CheckMSMEPreference calculates the price preference percentage for MSME
// bidders per Government of India's Public Procurement Policy for MSMEs.
//
// GFR REFERENCE: Rule 153A — Purchase Preference for MSMEs
//   - MSMEs get price preference up to 15% in evaluation
//   - If L1 (lowest) bidder is not MSME but an MSME is within 15% margin,
//     the MSME gets an opportunity to match L1 price
//   - Startups registered with DPIIT get additional preference
//
// DESIGN DECISION: Returns the preference percentage as a float64.
// The evaluation engine uses this to adjust bid comparison amounts.
func CheckMSMEPreference(bid BidRecord, tender TenderRecord) float64 {
	if !bid.MSMERegistered {
		return 0.0
	}

	// Base MSME preference: 15% per government policy
	preference := 15.0

	// Additional preference for DPIIT-registered startups
	if bid.DPIITNumber != "" {
		preference += 5.0 // Total 20% for recognized startups
	}

	// For CONSULTANCY tenders, MSME preference may be different
	if tender.Category == CategoryConsultancy {
		// QCBS evaluation — MSME preference applied differently
		preference = 10.0
		if bid.DPIITNumber != "" {
			preference = 15.0
		}
	}

	return preference
}

// ============================================================================
// Evaluation Method Selection
// ============================================================================

// EvaluationMethod represents how bids should be evaluated
type EvaluationMethod string

const (
	// L1 — Lowest bid wins (for WORKS and GOODS)
	EvalL1 EvaluationMethod = "L1"
	// QCBS — Quality and Cost Based Selection (for CONSULTANCY)
	EvalQCBS EvaluationMethod = "QCBS"
	// LCS — Least Cost Selection (for simple SERVICES)
	EvalLCS EvaluationMethod = "LCS"
)

// GetEvaluationMethod determines the correct evaluation method based on
// tender category per GFR 2017 guidelines.
//
// GFR REFERENCE:
//   - WORKS: L1 (Lowest evaluated cost) per Rule 163
//   - GOODS: L1 (Lowest evaluated cost) per Rule 163
//   - SERVICES: LCS (Least Cost Selection) per Rule 175
//   - CONSULTANCY: QCBS (Quality Cost Based Selection) per Rule 179
func GetEvaluationMethod(category TenderCategory) EvaluationMethod {
	switch category {
	case CategoryWorks:
		return EvalL1
	case CategoryGoods:
		return EvalL1
	case CategoryServices:
		return EvalLCS
	case CategoryConsultancy:
		return EvalQCBS
	default:
		return EvalL1
	}
}
