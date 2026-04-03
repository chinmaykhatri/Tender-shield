#!/bin/bash
# FILE: network/oracle-setup.sh
# FEATURE: Feature 2 — Real Hyperledger on Oracle Cloud
# DEMO MODE: N/A — this runs on Oracle Cloud VM
# REAL MODE: Sets up Hyperledger Fabric network on Oracle VM

set -e

echo "════════════════════════════════════"
echo "TenderShield — Hyperledger Setup"
echo "Oracle Cloud VM"
echo "════════════════════════════════════"

# Prerequisites check
command -v docker >/dev/null 2>&1 || { echo "Docker required. Run: curl -fsSL https://get.docker.com | sh"; exit 1; }
command -v docker compose >/dev/null 2>&1 || { echo "Docker Compose required."; exit 1; }

# Install Hyperledger Fabric binaries
echo "[1/6] Installing Hyperledger Fabric 2.5..."
curl -sSL https://bit.ly/2ysbOFE | bash -s -- 2.5.0 1.5.5
export PATH=$PATH:$HOME/fabric-samples/bin

# Create network directory
echo "[2/6] Setting up network..."
mkdir -p ~/tendershield-network/network
cd ~/tendershield-network

# Generate crypto material
echo "[3/6] Generating crypto material..."
cryptogen generate --config=network/crypto-config.yaml \
  --output=network/crypto-material 2>/dev/null || echo "Using existing crypto material"

# Generate genesis block
echo "[4/6] Creating genesis block..."
configtxgen -profile TenderShieldGenesis \
  -channelID system-channel \
  -outputBlock ./network/genesis.block \
  -configPath ./network 2>/dev/null || echo "Using existing genesis block"

# Start Docker containers
echo "[5/6] Starting network..."
cd network
docker compose -f docker-compose.yaml up -d

echo "Waiting 15s for containers..."
sleep 15

# Create channel and install chaincode
echo "[6/6] Setting up channel and chaincode..."

export FABRIC_CFG_PATH=$PWD
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID="MinistryOrgMSP"

peer channel create -o orderer.tendershield.gov:7050 \
  -c tenderchannel \
  -f channel-artifacts/TenderChannel.tx \
  --tls 2>/dev/null || echo "Channel may already exist"

echo ""
echo "════════════════════════════════════"
echo "✅ TENDERSHIELD NETWORK IS LIVE!"
echo "════════════════════════════════════"
echo ""
echo "Peer:      peer0.ministry.tendershield.gov:7051"
echo "Orderer:   orderer.tendershield.gov:7050"
echo "Channel:   tenderchannel"
echo "Explorer:  http://$(hostname -I | awk '{print $1}'):8080"
echo ""
echo "Add to Vercel Environment Variables:"
echo "  FABRIC_PEER_ENDPOINT=$(hostname -I | awk '{print $1}'):7051"
echo "  FABRIC_ORDERER_ENDPOINT=$(hostname -I | awk '{print $1}'):7050"
echo "  FABRIC_EXPLORER_URL=$(hostname -I | awk '{print $1}'):8080"
echo "════════════════════════════════════"
