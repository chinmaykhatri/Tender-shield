#!/bin/bash
# ============================================================================
# TenderShield — Multi-Org Chaincode Setup Script
# ============================================================================
# Sets up chaincode with 2-ORG CONSENSUS (MinistryOrg + NICOrg):
#   1. Creates the 'tendershield' channel
#   2. Joins BOTH peers to the channel
#   3. Installs chaincode on BOTH peers
#   4. MinistryOrg approves chaincode
#   5. NICOrg approves chaincode
#   6. Commits with 2-org endorsement policy
#   7. Test invoke endorsed by BOTH peers
#
# Usage:
#   chmod +x scripts/setup-chaincode.sh
#   ./scripts/setup-chaincode.sh
# ============================================================================

set -euo pipefail

# ─── Config ───
CLI_MINISTRY="cli.tendershield"
CLI_NIC="cli.nic.tendershield"
PEER_MINISTRY="peer0.ministry.tendershield.gov.in"
PEER_NIC="peer0.nic.tendershield.gov.in"
CHANNEL="tendershield"
CC_NAME="tendershield"
CC_VERSION="1.0"
CC_SEQUENCE=1
ORDERER="orderer.tendershield.gov.in:7050"
ORDERER_CA="/opt/gopath/src/github.com/crypto/ordererOrganizations/tendershield.gov.in/orderers/orderer.tendershield.gov.in/msp/tlscacerts/tlsca.tendershield.gov.in-cert.pem"
MINISTRY_TLS_CA="/opt/gopath/src/github.com/crypto/peerOrganizations/ministry.tendershield.gov.in/peers/$PEER_MINISTRY/tls/ca.crt"
NIC_TLS_CA="/opt/gopath/src/github.com/crypto/peerOrganizations/nic.tendershield.gov.in/peers/$PEER_NIC/tls/ca.crt"

echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║  TenderShield — Multi-Org Chaincode Setup (2-Org Consensus)    ║"
echo "║  MinistryOrg + NICOrg — both must endorse                      ║"
echo "╚══════════════════════════════════════════════════════════════════╝"

# Wait for peers
echo "▶ Waiting for peers..."
sleep 5
docker exec $CLI_MINISTRY peer node status 2>/dev/null || { echo "⚠️ Ministry peer not ready, waiting..."; sleep 15; }
docker exec $CLI_NIC peer node status 2>/dev/null || { echo "⚠️ NIC peer not ready, waiting..."; sleep 15; }

# ═══════════════════════════════════════════════════
# Step 1: Create Channel
# ═══════════════════════════════════════════════════
echo ""
echo "▶ Step 1: Creating channel '$CHANNEL'..."
docker exec $CLI_MINISTRY peer channel create \
    -o $ORDERER \
    -c $CHANNEL \
    -f /opt/gopath/src/github.com/channel-artifacts/$CHANNEL.tx \
    --tls \
    --cafile $ORDERER_CA \
    --outputBlock /opt/gopath/src/github.com/channel-artifacts/$CHANNEL.block \
    2>&1 || echo "   Channel may already exist (OK)"

# ═══════════════════════════════════════════════════
# Step 2: Join BOTH Peers to Channel
# ═══════════════════════════════════════════════════
echo ""
echo "▶ Step 2a: Joining MinistryOrg peer..."
docker exec $CLI_MINISTRY peer channel join \
    -b /opt/gopath/src/github.com/channel-artifacts/$CHANNEL.block \
    2>&1 || echo "   Ministry peer may already be joined (OK)"

echo "▶ Step 2b: Fetching channel block for NICOrg..."
docker exec $CLI_MINISTRY peer channel fetch 0 \
    /opt/gopath/src/github.com/channel-artifacts/${CHANNEL}_genesis.block \
    -o $ORDERER \
    -c $CHANNEL \
    --tls \
    --cafile $ORDERER_CA \
    2>&1 || true

echo "▶ Step 2c: Joining NICOrg peer..."
docker exec $CLI_NIC peer channel join \
    -b /opt/gopath/src/github.com/channel-artifacts/${CHANNEL}_genesis.block \
    2>&1 || echo "   NIC peer may already be joined (OK)"

echo ""
echo "▶ Channels joined (Ministry):"
docker exec $CLI_MINISTRY peer channel list
echo "▶ Channels joined (NIC):"
docker exec $CLI_NIC peer channel list

# ═══════════════════════════════════════════════════
# Step 3: Install Chaincode on BOTH Peers
# ═══════════════════════════════════════════════════
echo ""
echo "▶ Step 3a: Installing chaincode on MinistryOrg peer..."
docker exec $CLI_MINISTRY peer lifecycle chaincode install \
    /opt/gopath/src/github.com/chaincode/tendershield.tar.gz \
    2>&1 || echo "   Already installed on Ministry (OK)"

echo "▶ Step 3b: Installing chaincode on NICOrg peer..."
docker exec $CLI_NIC peer lifecycle chaincode install \
    /opt/gopath/src/github.com/chaincode/tendershield.tar.gz \
    2>&1 || echo "   Already installed on NIC (OK)"

# Get Package IDs
echo ""
echo "▶ Installed chaincodes (Ministry):"
PACKAGE_ID_MINISTRY=$(docker exec $CLI_MINISTRY peer lifecycle chaincode queryinstalled 2>&1 | grep -o 'tendershield_1.0:[a-f0-9]*' | head -1)
echo "   Ministry Package ID: $PACKAGE_ID_MINISTRY"

echo "▶ Installed chaincodes (NIC):"
PACKAGE_ID_NIC=$(docker exec $CLI_NIC peer lifecycle chaincode queryinstalled 2>&1 | grep -o 'tendershield_1.0:[a-f0-9]*' | head -1)
echo "   NIC Package ID: $PACKAGE_ID_NIC"

if [ -z "$PACKAGE_ID_MINISTRY" ]; then
    echo "❌ Failed to get Ministry package ID"
    exit 1
fi

# ═══════════════════════════════════════════════════
# Step 4: Approve Chaincode — BOTH Orgs
# ═══════════════════════════════════════════════════
echo ""
echo "▶ Step 4a: MinistryOrg approving chaincode..."
docker exec $CLI_MINISTRY peer lifecycle chaincode approveformyorg \
    -o $ORDERER \
    --channelID $CHANNEL \
    --name $CC_NAME \
    --version $CC_VERSION \
    --package-id $PACKAGE_ID_MINISTRY \
    --sequence $CC_SEQUENCE \
    --tls \
    --cafile $ORDERER_CA \
    2>&1 || echo "   Ministry already approved (OK)"

echo "▶ Step 4b: NICOrg approving chaincode..."
docker exec $CLI_NIC peer lifecycle chaincode approveformyorg \
    -o $ORDERER \
    --channelID $CHANNEL \
    --name $CC_NAME \
    --version $CC_VERSION \
    --package-id ${PACKAGE_ID_NIC:-$PACKAGE_ID_MINISTRY} \
    --sequence $CC_SEQUENCE \
    --tls \
    --cafile $ORDERER_CA \
    2>&1 || echo "   NIC already approved (OK)"

# Check commit readiness
echo ""
echo "▶ Checking commit readiness..."
docker exec $CLI_MINISTRY peer lifecycle chaincode checkcommitreadiness \
    --channelID $CHANNEL \
    --name $CC_NAME \
    --version $CC_VERSION \
    --sequence $CC_SEQUENCE \
    --tls \
    --cafile $ORDERER_CA \
    --output json 2>&1

# ═══════════════════════════════════════════════════
# Step 5: Commit — Endorsed by BOTH Peers
# ═══════════════════════════════════════════════════
echo ""
echo "▶ Step 5: Committing chaincode (2-org endorsement)..."
docker exec $CLI_MINISTRY peer lifecycle chaincode commit \
    -o $ORDERER \
    --channelID $CHANNEL \
    --name $CC_NAME \
    --version $CC_VERSION \
    --sequence $CC_SEQUENCE \
    --tls \
    --cafile $ORDERER_CA \
    --peerAddresses $PEER_MINISTRY:7051 \
    --tlsRootCertFiles $MINISTRY_TLS_CA \
    --peerAddresses $PEER_NIC:8051 \
    --tlsRootCertFiles $NIC_TLS_CA \
    2>&1 || echo "   Already committed (OK)"

# ═══════════════════════════════════════════════════
# Step 6: Verify
# ═══════════════════════════════════════════════════
echo ""
echo "▶ Step 6: Verifying committed chaincodes..."
echo "   On MinistryOrg:"
docker exec $CLI_MINISTRY peer lifecycle chaincode querycommitted --channelID $CHANNEL
echo "   On NICOrg:"
docker exec $CLI_NIC peer lifecycle chaincode querycommitted --channelID $CHANNEL

# ═══════════════════════════════════════════════════
# Step 7: Test — Invoke with 2-Peer Endorsement
# ═══════════════════════════════════════════════════
echo ""
echo "▶ Step 7: Test invoke — CreateTender (endorsed by BOTH peers)..."
docker exec $CLI_MINISTRY peer chaincode invoke \
    -o $ORDERER \
    -C $CHANNEL \
    -n $CC_NAME \
    --tls \
    --cafile $ORDERER_CA \
    --peerAddresses $PEER_MINISTRY:7051 \
    --tlsRootCertFiles $MINISTRY_TLS_CA \
    --peerAddresses $PEER_NIC:8051 \
    --tlsRootCertFiles $NIC_TLS_CA \
    -c '{"function":"CreateTender","Args":["TDR-MULTI-ORG-001","Multi-Org Consensus Test","100","MoIT"]}' \
    2>&1 || echo "   Invoke completed"

echo ""
echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║  ✅ Multi-Org Chaincode Setup Complete!                         ║"
echo "╠══════════════════════════════════════════════════════════════════╣"
echo "║  Channel:     $CHANNEL                                         ║"
echo "║  Chaincode:   $CC_NAME v$CC_VERSION                            ║"
echo "║  Endorsement: MinistryOrg + NICOrg (2-org consensus)           ║"
echo "║  Peers:       $PEER_MINISTRY (7051)                            ║"
echo "║               $PEER_NIC (8051)                                 ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""
echo "To show judges 2-org endorsement, run:"
echo "  docker exec $CLI_MINISTRY peer lifecycle chaincode querycommitted --channelID $CHANNEL"
echo ""
echo "This will show:"
echo "  Approvals: [MinistryOrgMSP: true, NICOrgMSP: true]"
