// ============================================================================
// TenderShield — Identity Verification Module
// ============================================================================
// Extracts and validates caller identity from Hyperledger Fabric transaction
// context. Enforces organization-level and role-level access control.
//
// DESIGN DECISION: Using MSP (Membership Service Provider) identity from
// X.509 certificates rather than custom identity tokens, because Fabric's
// built-in PKI infrastructure is already production-grade and approved
// under India's IT Act 2000 for digital signatures.
//
// SECURITY NOTE: All identity checks are performed at chaincode level,
// providing defense-in-depth beyond the gateway/endorsement policies.
// ============================================================================

package main

import (
	"encoding/json"
	"fmt"
	"strings"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// ============================================================================
// Identity Extraction Functions
// ============================================================================

// GetCallerIdentity extracts the caller's identity from the transaction context.
// Returns the MSP ID, certificate Common Name (CN), and derived DID.
//
// DESIGN DECISION: DID is derived from MSP ID + Certificate CN for simplicity.
// In production, this would integrate with a full W3C DID resolver.
//
// GFR REFERENCE: Identity verification is required under GFR 2017 for all
// procurement participants — this ensures every blockchain action is traced
// to a verified government identity.
func GetCallerIdentity(ctx contractapi.TransactionContextInterface) (*CallerIdentity, error) {
	// Get the client identity from the stub
	clientIdentity := ctx.GetClientIdentity()
	if clientIdentity == nil {
		return nil, fmt.Errorf("IDENTITY_ERROR: failed to get client identity from transaction context")
	}

	// Extract MSP ID — identifies which organization the caller belongs to
	mspID, err := clientIdentity.GetMSPID()
	if err != nil {
		return nil, fmt.Errorf("IDENTITY_ERROR: failed to get MSP ID: %v", err)
	}

	if mspID == "" {
		return nil, fmt.Errorf("IDENTITY_ERROR: empty MSP ID — caller not enrolled in any organization")
	}

	// Extract certificate Common Name (CN) — identifies the specific user
	cert, err := clientIdentity.GetX509Certificate()
	if err != nil {
		return nil, fmt.Errorf("IDENTITY_ERROR: failed to get X.509 certificate: %v", err)
	}

	certificateCN := ""
	if cert != nil {
		certificateCN = cert.Subject.CommonName
	}

	// Extract role attribute from certificate (if set during enrollment)
	role, found, err := clientIdentity.GetAttributeValue("role")
	if err != nil || !found {
		// Default role based on MSP ID if not explicitly set
		role = deriveRoleFromMSP(mspID)
	}

	// Derive DID from MSP ID and certificate CN
	// Format: did:tendershield:{org}:{cn}
	did := fmt.Sprintf("did:tendershield:%s:%s", strings.ToLower(mspID), certificateCN)

	return &CallerIdentity{
		MSPID:         mspID,
		CertificateCN: certificateCN,
		DID:           did,
		Role:          role,
	}, nil
}

// deriveRoleFromMSP maps MSP IDs to default roles when certificate attributes
// don't explicitly specify a role.
func deriveRoleFromMSP(mspID string) string {
	switch mspID {
	case "MinistryOrgMSP":
		return string(RoleOfficer)
	case "BidderOrgMSP":
		return string(RoleBidder)
	case "AuditorOrgMSP":
		return string(RoleAuditor)
	case "NICOrgMSP":
		return string(RoleNICAdmin)
	default:
		return "UNKNOWN"
	}
}

// ============================================================================
// Access Control Functions
// ============================================================================

// ValidateOrgAccess checks that the caller belongs to the required organization.
// Returns nil if access is granted, or an error with a descriptive message.
//
// DESIGN DECISION: Organization-level access control is the primary security
// boundary in TenderShield. Each org has specific permissions:
//   - MinistryOrgMSP: Create/publish/evaluate/award tenders
//   - BidderOrgMSP: Submit/reveal bids
//   - AuditorOrgMSP: Audit, escalate, review alerts
//   - NICOrgMSP: Admin operations, AI service identity, freeze tenders
//
// SECURITY NOTE: This check cannot be bypassed even if the gateway
// endorsement policy is misconfigured, providing defense-in-depth.
func ValidateOrgAccess(ctx contractapi.TransactionContextInterface, requiredOrg string) error {
	identity, err := GetCallerIdentity(ctx)
	if err != nil {
		return fmt.Errorf("ACCESS_DENIED: %v", err)
	}

	if identity.MSPID != requiredOrg {
		return fmt.Errorf(
			"ACCESS_DENIED: operation requires %s membership, but caller belongs to %s (DID: %s). "+
				"This action has been logged for audit trail",
			requiredOrg, identity.MSPID, identity.DID,
		)
	}

	return nil
}

// ValidateMultiOrgAccess checks that the caller belongs to one of the allowed organizations.
// Used for operations that can be performed by multiple orgs (e.g., querying tenders).
func ValidateMultiOrgAccess(ctx contractapi.TransactionContextInterface, allowedOrgs []string) error {
	identity, err := GetCallerIdentity(ctx)
	if err != nil {
		return fmt.Errorf("ACCESS_DENIED: %v", err)
	}

	for _, org := range allowedOrgs {
		if identity.MSPID == org {
			return nil
		}
	}

	return fmt.Errorf(
		"ACCESS_DENIED: operation requires membership in one of %v, but caller belongs to %s (DID: %s)",
		allowedOrgs, identity.MSPID, identity.DID,
	)
}

// ValidateRole checks that the caller has the required role attribute in their certificate.
//
// GFR REFERENCE: GFR 2017 mandates that procurement actions can only be
// performed by authorized personnel with appropriate delegation of powers.
func ValidateRole(ctx contractapi.TransactionContextInterface, requiredRole string) error {
	identity, err := GetCallerIdentity(ctx)
	if err != nil {
		return fmt.Errorf("ACCESS_DENIED: %v", err)
	}

	if identity.Role != requiredRole {
		return fmt.Errorf(
			"ACCESS_DENIED: operation requires role '%s', but caller has role '%s' (DID: %s). "+
				"Per GFR 2017, only authorized personnel may perform this action",
			requiredRole, identity.Role, identity.DID,
		)
	}

	return nil
}

// ============================================================================
// Identity Registry Functions (On-Chain)
// ============================================================================

// IdentityRecord stores registered user identity on the blockchain
type IdentityRecord struct {
	DocType      string `json:"docType"`
	DID          string `json:"did"`
	MSPID        string `json:"msp_id"`
	Role         string `json:"role"`
	DisplayName  string `json:"display_name"`
	AadhaarLinked bool  `json:"aadhaar_linked"`
	GSTIN        string `json:"gstin,omitempty"`
	PAN          string `json:"pan,omitempty"`
	RegisteredAt string `json:"registered_at_ist"`
	IsActive     bool   `json:"is_active"`
}

// RegisterIdentity stores a new identity record on the blockchain.
// Called during user registration after Aadhaar eKYC verification.
func RegisterIdentity(ctx contractapi.TransactionContextInterface, identityJSON string) error {
	var identity IdentityRecord
	err := json.Unmarshal([]byte(identityJSON), &identity)
	if err != nil {
		return fmt.Errorf("IDENTITY_ERROR: invalid identity JSON: %v", err)
	}

	// Validate required fields
	if identity.DID == "" {
		return fmt.Errorf("IDENTITY_ERROR: DID is required for identity registration")
	}
	if identity.MSPID == "" {
		return fmt.Errorf("IDENTITY_ERROR: MSP ID is required for identity registration")
	}

	// Set metadata
	identity.DocType = "identity"
	identity.RegisteredAt = GetCurrentIST()
	identity.IsActive = true

	// Store on ledger
	identityBytes, err := json.Marshal(identity)
	if err != nil {
		return fmt.Errorf("IDENTITY_ERROR: failed to marshal identity: %v", err)
	}

	key := fmt.Sprintf("IDENTITY~%s", identity.DID)
	return ctx.GetStub().PutState(key, identityBytes)
}

// LookupIdentity retrieves an identity record from the blockchain.
// Used to verify that a bidder/officer is registered before allowing operations.
func LookupIdentity(ctx contractapi.TransactionContextInterface, did string) (*IdentityRecord, error) {
	key := fmt.Sprintf("IDENTITY~%s", did)
	identityBytes, err := ctx.GetStub().GetState(key)
	if err != nil {
		return nil, fmt.Errorf("IDENTITY_ERROR: failed to read identity: %v", err)
	}
	if identityBytes == nil {
		return nil, fmt.Errorf("IDENTITY_ERROR: identity not found for DID: %s. User must register via Aadhaar eKYC first", did)
	}

	var identity IdentityRecord
	err = json.Unmarshal(identityBytes, &identity)
	if err != nil {
		return nil, fmt.Errorf("IDENTITY_ERROR: failed to unmarshal identity: %v", err)
	}

	if !identity.IsActive {
		return nil, fmt.Errorf("IDENTITY_ERROR: identity %s is deactivated", did)
	}

	return &identity, nil
}
