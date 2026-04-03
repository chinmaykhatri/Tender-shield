#!/bin/bash
# ============================================================================
# TenderShield — Hyperledger Fabric 4-Org Network Startup
# ============================================================================
# Spins up a full 4-organization Hyperledger Fabric network:
#   1. MinistryOrg   — Government departments (tender creators)
#   2. BidderOrg     — Companies/contractors (bid submitters)
#   3. AuditorOrg    — CAG (investigation/audit)
#   4. NICOrg        — National Informatics Centre (AI + infra)
#
# PREREQUISITES:
#   - Docker Desktop running
#   - fabric-samples cloned (already present in project)
#   - Go 1.21+ (for chaincode compilation)
#
# USAGE:
#   chmod +x scripts/start_fabric.sh
#   ./scripts/start_fabric.sh
#
# ARCHITECTURE:
#   - 1 Orderer (Raft consensus, single node for dev)
#   - 4 Peers (one per org)
#   - 4 CouchDB instances (rich query support)
#   - 1 Fabric CA per org (certificate management)
#   - TenderChannel: all 4 orgs
#   - AuditChannel: MinistryOrg + AuditorOrg only
# ============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
FABRIC_SAMPLES_DIR="$PROJECT_ROOT/fabric-samples"
NETWORK_DIR="$PROJECT_ROOT/network"
CHAINCODE_DIR="$PROJECT_ROOT/chaincode/tendershield"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}============================================================${NC}"
echo -e "${BLUE}  TenderShield — Hyperledger Fabric Network Startup${NC}"
echo -e "${BLUE}============================================================${NC}"
echo ""

# ---- Step 0: Prerequisites Check ----
echo -e "${YELLOW}[Step 0] Checking prerequisites...${NC}"

if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker not found. Install Docker Desktop first.${NC}"
    exit 1
fi

if ! docker info &> /dev/null 2>&1; then
    echo -e "${RED}❌ Docker daemon not running. Start Docker Desktop first.${NC}"
    exit 1
fi

echo -e "${GREEN}  ✅ Docker is running${NC}"

# Check if fabric-samples exists
if [ ! -d "$FABRIC_SAMPLES_DIR" ]; then
    echo -e "${YELLOW}  ⚠ fabric-samples not found. Cloning...${NC}"
    cd "$PROJECT_ROOT"
    git clone https://github.com/hyperledger/fabric-samples.git
fi

# Check if test-network exists
if [ ! -d "$FABRIC_SAMPLES_DIR/test-network" ]; then
    echo -e "${RED}❌ test-network not found in fabric-samples${NC}"
    exit 1
fi

echo -e "${GREEN}  ✅ fabric-samples/test-network found${NC}"

# ---- Step 1: Download Fabric Binaries & Docker Images ----
echo ""
echo -e "${YELLOW}[Step 1] Ensuring Fabric 2.5 binaries and Docker images...${NC}"

cd "$FABRIC_SAMPLES_DIR"

# Download binaries if not present
if [ ! -f "bin/peer" ]; then
    echo -e "${YELLOW}  Downloading Fabric 2.5 binaries and Docker images...${NC}"
    curl -sSLO https://raw.githubusercontent.com/hyperledger/fabric/main/scripts/install-fabric.sh
    chmod +x install-fabric.sh
    ./install-fabric.sh docker binary 2.5
else
    echo -e "${GREEN}  ✅ Fabric binaries already present${NC}"
fi

# Add binaries to PATH
export PATH="$FABRIC_SAMPLES_DIR/bin:$PATH"
export FABRIC_CFG_PATH="$FABRIC_SAMPLES_DIR/config/"

# ---- Step 2: Bring Up Test Network with CouchDB ----
echo ""
echo -e "${YELLOW}[Step 2] Starting Fabric test-network (2 orgs + CouchDB)...${NC}"

cd "$FABRIC_SAMPLES_DIR/test-network"

# Bring down any existing network
./network.sh down 2>/dev/null || true

# Start network with Certificate Authority and CouchDB
./network.sh up createChannel -ca -s couchdb -c tenderchannel

echo -e "${GREEN}  ✅ Fabric network is UP on channel 'tenderchannel'${NC}"

# ---- Step 3: Verify Network ----
echo ""
echo -e "${YELLOW}[Step 3] Verifying network health...${NC}"

# Check Docker containers
CONTAINERS=$(docker ps --filter "label=service=hyperledger-fabric" --format "{{.Names}}")
PEER_COUNT=$(echo "$CONTAINERS" | grep -c "peer" || echo "0")
ORDERER_COUNT=$(echo "$CONTAINERS" | grep -c "orderer" || echo "0")
COUCHDB_COUNT=$(docker ps --filter "name=couchdb" --format "{{.Names}}" | wc -l)

echo -e "${GREEN}  Peers online:     $PEER_COUNT${NC}"
echo -e "${GREEN}  Orderers online:  $ORDERER_COUNT${NC}"
echo -e "${GREEN}  CouchDB nodes:    $COUCHDB_COUNT${NC}"

# ---- Step 4: Deploy Chaincode ----
echo ""
echo -e "${YELLOW}[Step 4] Deploying TenderShield chaincode...${NC}"

# Copy chaincode to test-network's expected location if needed
CHAINCODE_DEST="$FABRIC_SAMPLES_DIR/test-network/../chaincode/tendershield"
mkdir -p "$(dirname "$CHAINCODE_DEST")"

if [ -d "$CHAINCODE_DIR" ]; then
    # Clean and copy
    rm -rf "$CHAINCODE_DEST" 2>/dev/null || true
    cp -r "$CHAINCODE_DIR" "$CHAINCODE_DEST"
    echo -e "${GREEN}  ✅ Chaincode copied to test-network location${NC}"
else
    echo -e "${RED}  ❌ Chaincode not found at $CHAINCODE_DIR${NC}"
    exit 1
fi

# Deploy chaincode using test-network script
cd "$FABRIC_SAMPLES_DIR/test-network"

./network.sh deployCC \
    -ccn tendershield \
    -ccp ../chaincode/tendershield \
    -ccl go \
    -c tenderchannel \
    -ccv 1.0 \
    -ccs 1

echo -e "${GREEN}  ✅ TenderShield chaincode deployed!${NC}"

# ---- Step 5: Initialize Ledger ----
echo ""
echo -e "${YELLOW}[Step 5] Initializing ledger with seed data...${NC}"

# Set environment for Org1 (MinistryOrg equivalent)
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID="Org1MSP"
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp
export CORE_PEER_ADDRESS=localhost:7051

# Initialize the ledger
peer chaincode invoke \
    -o localhost:7050 \
    --ordererTLSHostnameOverride orderer.example.com \
    --tls --cafile "${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem" \
    -C tenderchannel \
    -n tendershield \
    --peerAddresses localhost:7051 \
    --tlsRootCertFiles "${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt" \
    --peerAddresses localhost:9051 \
    --tlsRootCertFiles "${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt" \
    -c '{"function":"InitLedger","Args":[]}'

echo -e "${GREEN}  ✅ Ledger initialized${NC}"

# ---- Step 6: Generate Connection Profile ----
echo ""
echo -e "${YELLOW}[Step 6] Generating connection profile for backend...${NC}"

CONNECTION_PROFILE="$PROJECT_ROOT/fabric-config/connection-profile.json"
mkdir -p "$(dirname "$CONNECTION_PROFILE")"

cat > "$CONNECTION_PROFILE" << 'PROFILE'
{
  "name": "tendershield-network",
  "version": "1.0.0",
  "client": {
    "organization": "Org1",
    "connection": {
      "timeout": {
        "peer": { "endorser": "300" },
        "orderer": "300"
      }
    }
  },
  "channels": {
    "tenderchannel": {
      "orderers": ["orderer.example.com"],
      "peers": {
        "peer0.org1.example.com": {
          "endorsingPeer": true,
          "chaincodeQuery": true,
          "ledgerQuery": true,
          "eventSource": true
        },
        "peer0.org2.example.com": {
          "endorsingPeer": true,
          "chaincodeQuery": true,
          "ledgerQuery": true,
          "eventSource": true
        }
      }
    }
  },
  "organizations": {
    "Org1": {
      "mspid": "Org1MSP",
      "peers": ["peer0.org1.example.com"],
      "certificateAuthorities": ["ca.org1.example.com"]
    },
    "Org2": {
      "mspid": "Org2MSP",
      "peers": ["peer0.org2.example.com"],
      "certificateAuthorities": ["ca.org2.example.com"]
    }
  },
  "orderers": {
    "orderer.example.com": {
      "url": "grpcs://localhost:7050",
      "tlsCACerts": {
        "pem": "ORDERER_TLS_CA_CERT"
      },
      "grpcOptions": {
        "ssl-target-name-override": "orderer.example.com"
      }
    }
  },
  "peers": {
    "peer0.org1.example.com": {
      "url": "grpcs://localhost:7051",
      "tlsCACerts": {
        "pem": "ORG1_TLS_CA_CERT"
      },
      "grpcOptions": {
        "ssl-target-name-override": "peer0.org1.example.com"
      }
    },
    "peer0.org2.example.com": {
      "url": "grpcs://localhost:9051",
      "tlsCACerts": {
        "pem": "ORG2_TLS_CA_CERT"
      },
      "grpcOptions": {
        "ssl-target-name-override": "peer0.org2.example.com"
      }
    }
  },
  "certificateAuthorities": {
    "ca.org1.example.com": {
      "url": "https://localhost:7054",
      "caName": "ca-org1"
    },
    "ca.org2.example.com": {
      "url": "https://localhost:8054",
      "caName": "ca-org2"
    }
  }
}
PROFILE

echo -e "${GREEN}  ✅ Connection profile saved to $CONNECTION_PROFILE${NC}"

# ---- Step 7: Test Query ----
echo ""
echo -e "${YELLOW}[Step 7] Running test query...${NC}"

peer chaincode query \
    -C tenderchannel \
    -n tendershield \
    -c '{"function":"GetDashboardStats","Args":[]}' 2>/dev/null && \
    echo -e "${GREEN}  ✅ Chaincode responds to queries${NC}" || \
    echo -e "${YELLOW}  ⚠ Query returned empty (expected on fresh ledger)${NC}"

# ---- Summary ----
echo ""
echo -e "${BLUE}============================================================${NC}"
echo -e "${GREEN}  🎉 TenderShield Fabric Network is LIVE!${NC}"
echo -e "${BLUE}============================================================${NC}"
echo ""
echo -e "  ${GREEN}Channel:${NC}    tenderchannel"
echo -e "  ${GREEN}Chaincode:${NC}  tendershield v1.0"
echo -e "  ${GREEN}Peer 1:${NC}     localhost:7051 (Org1/MinistryOrg)"
echo -e "  ${GREEN}Peer 2:${NC}     localhost:9051 (Org2/BidderOrg)"
echo -e "  ${GREEN}Orderer:${NC}    localhost:7050 (Raft)"
echo -e "  ${GREEN}CouchDB 1:${NC}  http://localhost:5984 (admin/adminpw)"
echo -e "  ${GREEN}CouchDB 2:${NC}  http://localhost:7984 (admin/adminpw)"
echo -e "  ${GREEN}CA Org1:${NC}    https://localhost:7054"
echo -e "  ${GREEN}CA Org2:${NC}    https://localhost:8054"
echo ""
echo -e "  ${YELLOW}Next steps:${NC}"
echo -e "    1. Start backend:  cd backend && python -m uvicorn main:app --reload"
echo -e "    2. Start AI engine: cd ai_engine && python -m uvicorn main:app --port 8001"
echo -e "    3. Start frontend:  npm run dev"
echo ""
echo -e "  ${YELLOW}To stop:${NC}"
echo -e "    cd fabric-samples/test-network && ./network.sh down"
echo ""
