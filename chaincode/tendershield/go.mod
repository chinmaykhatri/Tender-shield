// ============================================================================
// TenderShield Chaincode — Go Module Definition
// ============================================================================
// Hyperledger Fabric 2.5 chaincode using the Fabric Contract API (contractapi).
// This replaces the legacy shim-based approach for cleaner smart contract code.
// ============================================================================

module github.com/tendershield/chaincode/tendershield

go 1.21

require (
	github.com/hyperledger/fabric-contract-api-go v1.2.2
	github.com/hyperledger/fabric-chaincode-go v0.0.0-20230731094759-d626571b23ef
	github.com/hyperledger/fabric-protos-go v0.3.3
	github.com/stretchr/testify v1.8.4
)
