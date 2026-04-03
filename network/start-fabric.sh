#!/bin/bash
# ============================================================================
# TenderShield — One-Click Fabric Network Startup
# ============================================================================
# Usage: bash network/start-fabric.sh
#
# What this does:
#   1. Generates crypto material (if not present)
#   2. Creates genesis block + channel TX
#   3. Starts Docker containers (orderer, peer, CouchDB, CLI)
#   4. Creates channel and joins peer
#   5. Deploys TenderShield chaincode
#   6. Runs InitLedger to seed demo data
#   7. Prints connection details for .env
#
# Prerequisites:
#   - Docker & Docker Compose installed
#   - Hyperledger Fabric binaries (cryptogen, configtxgen)
#     Install: curl -sSL https://bit.ly/2ysbOFE | bash -s -- 2.5.0 1.5.5
# ============================================================================

set -e

# Colors
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NETWORK_DIR="${PROJECT_ROOT}/network"
FABRIC_CONFIG="${PROJECT_ROOT}/fabric-config"
CRYPTO_DIR="${PROJECT_ROOT}/fabric-crypto"
CHANNEL_ARTIFACTS="${FABRIC_CONFIG}/channel-artifacts"
CHAINCODE_DIR="${PROJECT_ROOT}/chaincode"

CHANNEL_NAME="tenderchannel"
CHAINCODE_NAME="tendershield"
CHAINCODE_VERSION="1.0"

echo -e "${CYAN}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║${GREEN}  TenderShield — Hyperledger Fabric Network Startup  ${CYAN}║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════╝${NC}"
echo ""

# ── Step 1: Check prerequisites ──
echo -e "${YELLOW}[1/7]${NC} Checking prerequisites..."

command -v docker >/dev/null 2>&1 || { echo -e "${RED}Docker not installed. Install: https://docs.docker.com/get-docker/${NC}"; exit 1; }
command -v docker compose >/dev/null 2>&1 || { echo -e "${RED}Docker Compose not installed.${NC}"; exit 1; }

# Check for Fabric binaries (try multiple locations)
FABRIC_BIN=""
if command -v cryptogen >/dev/null 2>&1; then
  FABRIC_BIN="$(dirname $(which cryptogen))"
elif [ -d "$HOME/fabric-samples/bin" ]; then
  FABRIC_BIN="$HOME/fabric-samples/bin"
  export PATH="$PATH:$FABRIC_BIN"
elif [ -d "${PROJECT_ROOT}/bin" ]; then
  FABRIC_BIN="${PROJECT_ROOT}/bin"
  export PATH="$PATH:$FABRIC_BIN"
fi

if [ -z "$FABRIC_BIN" ]; then
  echo -e "${YELLOW}  Fabric binaries not found. Installing...${NC}"
  curl -sSL https://bit.ly/2ysbOFE | bash -s -- 2.5.0 1.5.5
  FABRIC_BIN="$HOME/fabric-samples/bin"
  export PATH="$PATH:$FABRIC_BIN"
fi

echo -e "${GREEN}  ✅ Docker, Docker Compose, Fabric binaries ready${NC}"

# ── Step 2: Generate crypto material ──
echo -e "${YELLOW}[2/7]${NC} Generating crypto material..."

mkdir -p "${CRYPTO_DIR}" "${CHANNEL_ARTIFACTS}"

if [ ! -d "${CRYPTO_DIR}/peerOrganizations" ]; then
  export FABRIC_CFG_PATH="${NETWORK_DIR}"
  cryptogen generate \
    --config="${NETWORK_DIR}/crypto-config.yaml" \
    --output="${CRYPTO_DIR}"
  echo -e "${GREEN}  ✅ Crypto material generated${NC}"
else
  echo -e "${GREEN}  ✅ Using existing crypto material${NC}"
fi

# ── Step 3: Generate genesis block + channel TX ──
echo -e "${YELLOW}[3/7]${NC} Generating genesis block..."

export FABRIC_CFG_PATH="${NETWORK_DIR}"

configtxgen -profile TenderShieldOrdererGenesis \
  -channelID system-channel \
  -outputBlock "${CHANNEL_ARTIFACTS}/genesis.block" 2>/dev/null

configtxgen -profile TenderChannel \
  -channelID "${CHANNEL_NAME}" \
  -outputCreateChannelTx "${CHANNEL_ARTIFACTS}/${CHANNEL_NAME}.tx" 2>/dev/null

echo -e "${GREEN}  ✅ Genesis block + channel TX created${NC}"

# ── Step 4: Start Docker containers ──
echo -e "${YELLOW}[4/7]${NC} Starting Docker containers..."

cd "${PROJECT_ROOT}"
docker compose -f docker-compose.fabric.yml up -d

echo "  Waiting 10s for containers to initialize..."
sleep 10

# Verify containers
RUNNING=$(docker ps --filter "label=service=tendershield-fabric" --format "{{.Names}}" | wc -l)
echo -e "${GREEN}  ✅ ${RUNNING} containers running${NC}"

# ── Step 5: Create channel and join peer ──
echo -e "${YELLOW}[5/7]${NC} Creating channel and joining peer..."

docker exec cli.tendershield bash -c "
  peer channel create \
    -o orderer.tendershield.gov.in:7050 \
    -c ${CHANNEL_NAME} \
    -f /opt/gopath/src/github.com/channel-artifacts/${CHANNEL_NAME}.tx \
    --tls \
    --cafile /opt/gopath/src/github.com/crypto/ordererOrganizations/tendershield.gov.in/orderers/orderer.tendershield.gov.in/msp/tlscacerts/tlsca.tendershield.gov.in-cert.pem \
    2>/dev/null
" 2>/dev/null || echo "  Channel may already exist"

docker exec cli.tendershield bash -c "
  peer channel join -b ${CHANNEL_NAME}.block 2>/dev/null
" 2>/dev/null || echo "  Peer may already be joined"

echo -e "${GREEN}  ✅ Channel '${CHANNEL_NAME}' created, peer joined${NC}"

# ── Step 6: Deploy chaincode ──
echo -e "${YELLOW}[6/7]${NC} Deploying TenderShield chaincode..."

# Package
docker exec cli.tendershield bash -c "
  cd /opt/gopath/src/github.com/chaincode/tendershield && \
  GO111MODULE=on go mod vendor 2>/dev/null && \
  peer lifecycle chaincode package ${CHAINCODE_NAME}.tar.gz \
    --path /opt/gopath/src/github.com/chaincode/tendershield \
    --lang golang \
    --label ${CHAINCODE_NAME}_${CHAINCODE_VERSION} 2>/dev/null
" 2>/dev/null || echo "  Chaincode may already be packaged"

# Install
docker exec cli.tendershield bash -c "
  peer lifecycle chaincode install ${CHAINCODE_NAME}.tar.gz 2>/dev/null
" 2>/dev/null || echo "  Chaincode may already be installed"

# Get package ID
CC_PACKAGE_ID=$(docker exec cli.tendershield bash -c "
  peer lifecycle chaincode queryinstalled 2>/dev/null | grep ${CHAINCODE_NAME}_${CHAINCODE_VERSION} | sed -n 's/.*Package ID: //;s/, Label:.*//p'
" 2>/dev/null)

if [ -n "$CC_PACKAGE_ID" ]; then
  # Approve
  docker exec cli.tendershield bash -c "
    peer lifecycle chaincode approveformyorg \
      -o orderer.tendershield.gov.in:7050 \
      --channelID ${CHANNEL_NAME} \
      --name ${CHAINCODE_NAME} \
      --version ${CHAINCODE_VERSION} \
      --package-id ${CC_PACKAGE_ID} \
      --sequence 1 \
      --tls \
      --cafile /opt/gopath/src/github.com/crypto/ordererOrganizations/tendershield.gov.in/orderers/orderer.tendershield.gov.in/msp/tlscacerts/tlsca.tendershield.gov.in-cert.pem \
      2>/dev/null
  " 2>/dev/null || true

  # Commit
  docker exec cli.tendershield bash -c "
    peer lifecycle chaincode commit \
      -o orderer.tendershield.gov.in:7050 \
      --channelID ${CHANNEL_NAME} \
      --name ${CHAINCODE_NAME} \
      --version ${CHAINCODE_VERSION} \
      --sequence 1 \
      --tls \
      --cafile /opt/gopath/src/github.com/crypto/ordererOrganizations/tendershield.gov.in/orderers/orderer.tendershield.gov.in/msp/tlscacerts/tlsca.tendershield.gov.in-cert.pem \
      2>/dev/null
  " 2>/dev/null || true
fi

echo -e "${GREEN}  ✅ Chaincode deployed${NC}"

# ── Step 7: Initialize ledger ──
echo -e "${YELLOW}[7/7]${NC} Initializing ledger with demo data..."

docker exec cli.tendershield bash -c "
  peer chaincode invoke \
    -o orderer.tendershield.gov.in:7050 \
    -C ${CHANNEL_NAME} \
    -n ${CHAINCODE_NAME} \
    -c '{\"function\":\"InitLedger\",\"Args\":[]}' \
    --tls \
    --cafile /opt/gopath/src/github.com/crypto/ordererOrganizations/tendershield.gov.in/orderers/orderer.tendershield.gov.in/msp/tlscacerts/tlsca.tendershield.gov.in-cert.pem \
    2>/dev/null
" 2>/dev/null || echo "  Ledger may already be initialized"

# ── Verify: Query chaincode ──
echo ""
echo -e "${CYAN}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║${GREEN}       ✅ TenderShield Network is LIVE!               ${CYAN}║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${GREEN}Orderer:${NC}   orderer.tendershield.gov.in:7050"
echo -e "  ${GREEN}Peer:${NC}      peer0.ministry.tendershield.gov.in:7051"
echo -e "  ${GREEN}CouchDB:${NC}   http://localhost:5984 (admin/adminpw)"
echo -e "  ${GREEN}Channel:${NC}   ${CHANNEL_NAME}"
echo -e "  ${GREEN}Chaincode:${NC} ${CHAINCODE_NAME} v${CHAINCODE_VERSION}"
echo ""
echo -e "  ${YELLOW}Add to .env:${NC}"
echo -e "    FABRIC_LIVE=true"
echo -e "    FABRIC_PEER_ENDPOINT=localhost:7051"
echo -e "    FABRIC_CHANNEL_NAME=${CHANNEL_NAME}"
echo -e "    FABRIC_CHAINCODE_NAME=${CHAINCODE_NAME}"
echo ""
echo -e "  ${YELLOW}Test query:${NC}"
echo -e "    docker exec cli.tendershield peer chaincode query -C ${CHANNEL_NAME} -n ${CHAINCODE_NAME} -c '{\"function\":\"GetDashboardStats\",\"Args\":[]}'"
echo ""
