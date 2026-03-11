#!/bin/bash
# ============================================================================
# TenderShield — Network Setup Script
# ============================================================================
# This script sets up the complete Hyperledger Fabric network for TenderShield.
# It generates crypto material, creates channels, joins peers, installs
# chaincode, and runs a smoke test to verify everything works.
#
# Usage: ./setup-network.sh [up|down|restart|generate|test]
#
# Requirements:
#   - Docker & Docker Compose installed
#   - Hyperledger Fabric binaries (cryptogen, configtxgen, peer) in PATH
#   - Go 1.21+ installed (for chaincode compilation)
# ============================================================================

set -e

# ---------------------------------------------------------------------------
# Color codes for status messages
# ---------------------------------------------------------------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
COMPOSE_FILE="../docker-compose.yaml"
CRYPTO_CONFIG="../crypto-config.yaml"
CONFIGTX="../configtx.yaml"
CHANNEL_NAME_TENDER="tenderchannel"
CHANNEL_NAME_AUDIT="auditchannel"
CHAINCODE_NAME="tendershield"
CHAINCODE_PATH="github.com/chaincode/tendershield"
CHAINCODE_VERSION="1.0"
CHAINCODE_SEQUENCE="1"
ORDERER_ADDRESS="orderer0.orderer.tendershield.gov.in:7050"
ORDERER_CA="/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/orderer.tendershield.gov.in/orderers/orderer0.orderer.tendershield.gov.in/msp/tlscacerts/tlsca.orderer.tendershield.gov.in-cert.pem"

# Peer connection details for each org
MINISTRY_PEER="peer0.ministry.tendershield.gov.in:7051"
MINISTRY_CA="/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/ministry.tendershield.gov.in/peers/peer0.ministry.tendershield.gov.in/tls/ca.crt"
MINISTRY_MSP="/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/ministry.tendershield.gov.in/users/Admin@ministry.tendershield.gov.in/msp"

BIDDER_PEER="peer0.bidder.tendershield.gov.in:8051"
BIDDER_CA="/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/bidder.tendershield.gov.in/peers/peer0.bidder.tendershield.gov.in/tls/ca.crt"
BIDDER_MSP="/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/bidder.tendershield.gov.in/users/Admin@bidder.tendershield.gov.in/msp"

AUDITOR_PEER="peer0.auditor.tendershield.gov.in:9051"
AUDITOR_CA="/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/auditor.tendershield.gov.in/peers/peer0.auditor.tendershield.gov.in/tls/ca.crt"
AUDITOR_MSP="/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/auditor.tendershield.gov.in/users/Admin@auditor.tendershield.gov.in/msp"

NIC_PEER="peer0.nic.tendershield.gov.in:10051"
NIC_CA="/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/nic.tendershield.gov.in/peers/peer0.nic.tendershield.gov.in/tls/ca.crt"
NIC_MSP="/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/nic.tendershield.gov.in/users/Admin@nic.tendershield.gov.in/msp"

# ---------------------------------------------------------------------------
# Helper functions
# ---------------------------------------------------------------------------
print_banner() {
    echo ""
    echo -e "${CYAN}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║${WHITE}${BOLD}   🏛️  TenderShield — Hyperledger Fabric Network Setup  🏛️   ${NC}${CYAN}║${NC}"
    echo -e "${CYAN}║${WHITE}   AI-Secured Government Procurement on Blockchain          ${CYAN}║${NC}"
    echo -e "${CYAN}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

print_step() {
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${MAGENTA}  STEP: ${WHITE}${BOLD}$1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

print_success() {
    echo -e "${GREEN}  ✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}  ⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}  ❌ $1${NC}"
}

print_info() {
    echo -e "${CYAN}  ℹ️  $1${NC}"
}

# ---------------------------------------------------------------------------
# Check prerequisites
# ---------------------------------------------------------------------------
check_prerequisites() {
    print_step "Checking Prerequisites"

    # Check Docker
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    print_success "Docker found: $(docker --version)"

    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        print_error "Docker Compose is not installed."
        exit 1
    fi
    print_success "Docker Compose found"

    # Check cryptogen
    if ! command -v cryptogen &> /dev/null; then
        print_warning "cryptogen not in PATH. Will use Docker-based generation."
    else
        print_success "cryptogen found: $(cryptogen version 2>/dev/null || echo 'available')"
    fi

    # Check configtxgen
    if ! command -v configtxgen &> /dev/null; then
        print_warning "configtxgen not in PATH. Will use Docker-based generation."
    else
        print_success "configtxgen found"
    fi

    print_success "All prerequisites verified!"
}

# ---------------------------------------------------------------------------
# Generate crypto material
# ---------------------------------------------------------------------------
generate_crypto() {
    print_step "Generating Cryptographic Material (TLS + MSP)"

    if [ -d "../crypto-config" ]; then
        print_warning "Crypto material already exists. Removing old material..."
        rm -rf ../crypto-config
    fi

    print_info "Generating certificates for MinistryOrg, BidderOrg, AuditorOrg, NICOrg..."

    cd ..
    cryptogen generate --config=crypto-config.yaml --output=crypto-config

    if [ $? -eq 0 ]; then
        print_success "Crypto material generated for all 4 organizations"
        print_info "  - MinistryOrg: 2 peers, CA, TLS certificates"
        print_info "  - BidderOrg:   2 peers, CA, TLS certificates"
        print_info "  - AuditorOrg:  2 peers, CA, TLS certificates (CAG)"
        print_info "  - NICOrg:      2 peers, CA, TLS certificates"
    else
        print_error "Failed to generate crypto material!"
        exit 1
    fi
    cd scripts
}

# ---------------------------------------------------------------------------
# Generate channel artifacts
# ---------------------------------------------------------------------------
generate_channel_artifacts() {
    print_step "Generating Channel Artifacts (Genesis Block + Channel TX)"

    if [ -d "../channel-artifacts" ]; then
        rm -rf ../channel-artifacts
    fi
    mkdir -p ../channel-artifacts

    cd ..
    export FABRIC_CFG_PATH=$PWD

    # Generate genesis block for orderer system channel
    print_info "Creating orderer genesis block..."
    configtxgen -profile TenderShieldOrdererGenesis \
        -channelID system-channel \
        -outputBlock ./channel-artifacts/genesis.block

    if [ $? -eq 0 ]; then
        print_success "Genesis block created"
    else
        print_error "Failed to create genesis block!"
        exit 1
    fi

    # Generate TenderChannel transaction
    print_info "Creating TenderChannel transaction (all 4 orgs)..."
    configtxgen -profile TenderChannel \
        -outputCreateChannelTx ./channel-artifacts/${CHANNEL_NAME_TENDER}.tx \
        -channelID ${CHANNEL_NAME_TENDER}

    if [ $? -eq 0 ]; then
        print_success "TenderChannel TX created (MinistryOrg + BidderOrg + AuditorOrg + NICOrg)"
    else
        print_error "Failed to create TenderChannel TX!"
        exit 1
    fi

    # Generate AuditChannel transaction
    print_info "Creating AuditChannel transaction (MinistryOrg + AuditorOrg only)..."
    configtxgen -profile AuditChannel \
        -outputCreateChannelTx ./channel-artifacts/${CHANNEL_NAME_AUDIT}.tx \
        -channelID ${CHANNEL_NAME_AUDIT}

    if [ $? -eq 0 ]; then
        print_success "AuditChannel TX created (MinistryOrg + AuditorOrg — confidential CAG channel)"
    else
        print_error "Failed to create AuditChannel TX!"
        exit 1
    fi

    # Generate anchor peer updates for TenderChannel
    print_info "Generating anchor peer updates for TenderChannel..."

    for ORG in MinistryOrg BidderOrg AuditorOrg NICOrg; do
        configtxgen -profile TenderChannel \
            -outputAnchorPeersUpdate ./channel-artifacts/${ORG}MSPanchors_${CHANNEL_NAME_TENDER}.tx \
            -channelID ${CHANNEL_NAME_TENDER} \
            -asOrg ${ORG}MSP
        print_success "  Anchor peer update for ${ORG}"
    done

    # Generate anchor peer updates for AuditChannel
    print_info "Generating anchor peer updates for AuditChannel..."

    for ORG in MinistryOrg AuditorOrg; do
        configtxgen -profile AuditChannel \
            -outputAnchorPeersUpdate ./channel-artifacts/${ORG}MSPanchors_${CHANNEL_NAME_AUDIT}.tx \
            -channelID ${CHANNEL_NAME_AUDIT} \
            -asOrg ${ORG}MSP
        print_success "  Anchor peer update for ${ORG}"
    done

    cd scripts
    print_success "All channel artifacts generated!"
}

# ---------------------------------------------------------------------------
# Start the Docker network
# ---------------------------------------------------------------------------
start_network() {
    print_step "Starting Docker Network (Peers, Orderers, CAs, CouchDB, Monitoring)"

    cd ..
    docker-compose -f docker-compose.yaml up -d

    if [ $? -eq 0 ]; then
        print_success "All containers started!"
        print_info "Waiting 15 seconds for containers to stabilize..."
        sleep 15

        # Check container health
        RUNNING=$(docker ps --filter "name=tendershield" --format "{{.Names}}" | wc -l)
        print_success "${RUNNING} containers running"
    else
        print_error "Failed to start network!"
        exit 1
    fi
    cd scripts
}

# ---------------------------------------------------------------------------
# Create and join channels
# ---------------------------------------------------------------------------
create_channels() {
    print_step "Creating Channels & Joining Peers"

    # Helper function to set peer environment
    set_peer_env() {
        local org=$1
        local peer_addr=$2
        local msp_id=$3
        local msp_path=$4
        local tls_ca=$5

        export CORE_PEER_ADDRESS=$peer_addr
        export CORE_PEER_LOCALMSPID=$msp_id
        export CORE_PEER_MSPCONFIGPATH=$msp_path
        export CORE_PEER_TLS_ROOTCERT_FILE=$tls_ca
        export CORE_PEER_TLS_ENABLED=true
    }

    # Create TenderChannel
    print_info "Creating TenderChannel..."
    docker exec cli.tendershield bash -c "
        peer channel create \
            -o ${ORDERER_ADDRESS} \
            -c ${CHANNEL_NAME_TENDER} \
            -f ./channel-artifacts/${CHANNEL_NAME_TENDER}.tx \
            --outputBlock ./channel-artifacts/${CHANNEL_NAME_TENDER}.block \
            --tls --cafile ${ORDERER_CA}
    "
    print_success "TenderChannel created"

    # Join all 4 org peers to TenderChannel
    print_info "Joining peers to TenderChannel..."

    # MinistryOrg peer0
    docker exec -e CORE_PEER_ADDRESS=${MINISTRY_PEER} \
        -e CORE_PEER_LOCALMSPID=MinistryOrgMSP \
        -e CORE_PEER_MSPCONFIGPATH=${MINISTRY_MSP} \
        -e CORE_PEER_TLS_ROOTCERT_FILE=${MINISTRY_CA} \
        cli.tendershield peer channel join -b ./channel-artifacts/${CHANNEL_NAME_TENDER}.block
    print_success "  MinistryOrg peer0 joined TenderChannel"

    # BidderOrg peer0
    docker exec -e CORE_PEER_ADDRESS=${BIDDER_PEER} \
        -e CORE_PEER_LOCALMSPID=BidderOrgMSP \
        -e CORE_PEER_MSPCONFIGPATH=${BIDDER_MSP} \
        -e CORE_PEER_TLS_ROOTCERT_FILE=${BIDDER_CA} \
        cli.tendershield peer channel join -b ./channel-artifacts/${CHANNEL_NAME_TENDER}.block
    print_success "  BidderOrg peer0 joined TenderChannel"

    # AuditorOrg peer0
    docker exec -e CORE_PEER_ADDRESS=${AUDITOR_PEER} \
        -e CORE_PEER_LOCALMSPID=AuditorOrgMSP \
        -e CORE_PEER_MSPCONFIGPATH=${AUDITOR_MSP} \
        -e CORE_PEER_TLS_ROOTCERT_FILE=${AUDITOR_CA} \
        cli.tendershield peer channel join -b ./channel-artifacts/${CHANNEL_NAME_TENDER}.block
    print_success "  AuditorOrg peer0 joined TenderChannel (CAG)"

    # NICOrg peer0
    docker exec -e CORE_PEER_ADDRESS=${NIC_PEER} \
        -e CORE_PEER_LOCALMSPID=NICOrgMSP \
        -e CORE_PEER_MSPCONFIGPATH=${NIC_MSP} \
        -e CORE_PEER_TLS_ROOTCERT_FILE=${NIC_CA} \
        cli.tendershield peer channel join -b ./channel-artifacts/${CHANNEL_NAME_TENDER}.block
    print_success "  NICOrg peer0 joined TenderChannel"

    # Create AuditChannel
    print_info "Creating AuditChannel (confidential — MinistryOrg + AuditorOrg only)..."
    docker exec -e CORE_PEER_LOCALMSPID=MinistryOrgMSP \
        -e CORE_PEER_MSPCONFIGPATH=${MINISTRY_MSP} \
        cli.tendershield bash -c "
        peer channel create \
            -o ${ORDERER_ADDRESS} \
            -c ${CHANNEL_NAME_AUDIT} \
            -f ./channel-artifacts/${CHANNEL_NAME_AUDIT}.tx \
            --outputBlock ./channel-artifacts/${CHANNEL_NAME_AUDIT}.block \
            --tls --cafile ${ORDERER_CA}
    "
    print_success "AuditChannel created"

    # Join MinistryOrg to AuditChannel
    docker exec -e CORE_PEER_ADDRESS=${MINISTRY_PEER} \
        -e CORE_PEER_LOCALMSPID=MinistryOrgMSP \
        -e CORE_PEER_MSPCONFIGPATH=${MINISTRY_MSP} \
        -e CORE_PEER_TLS_ROOTCERT_FILE=${MINISTRY_CA} \
        cli.tendershield peer channel join -b ./channel-artifacts/${CHANNEL_NAME_AUDIT}.block
    print_success "  MinistryOrg peer0 joined AuditChannel"

    # Join AuditorOrg to AuditChannel
    docker exec -e CORE_PEER_ADDRESS=${AUDITOR_PEER} \
        -e CORE_PEER_LOCALMSPID=AuditorOrgMSP \
        -e CORE_PEER_MSPCONFIGPATH=${AUDITOR_MSP} \
        -e CORE_PEER_TLS_ROOTCERT_FILE=${AUDITOR_CA} \
        cli.tendershield peer channel join -b ./channel-artifacts/${CHANNEL_NAME_AUDIT}.block
    print_success "  AuditorOrg peer0 joined AuditChannel (CAG)"

    print_success "All channels created and peers joined!"
}

# ---------------------------------------------------------------------------
# Install and approve chaincode (Fabric 2.x lifecycle)
# ---------------------------------------------------------------------------
install_chaincode() {
    print_step "Installing & Approving Chaincode (Fabric 2.x Lifecycle)"

    # Package chaincode
    print_info "Packaging TenderShield chaincode..."
    docker exec cli.tendershield bash -c "
        peer lifecycle chaincode package ${CHAINCODE_NAME}.tar.gz \
            --path ${CHAINCODE_PATH} \
            --lang golang \
            --label ${CHAINCODE_NAME}_${CHAINCODE_VERSION}
    "
    print_success "Chaincode packaged: ${CHAINCODE_NAME}_${CHAINCODE_VERSION}"

    # Install on all 4 org peers
    print_info "Installing chaincode on all organization peers..."

    for ORG_INFO in "MinistryOrgMSP:${MINISTRY_PEER}:${MINISTRY_MSP}:${MINISTRY_CA}" \
                     "BidderOrgMSP:${BIDDER_PEER}:${BIDDER_MSP}:${BIDDER_CA}" \
                     "AuditorOrgMSP:${AUDITOR_PEER}:${AUDITOR_MSP}:${AUDITOR_CA}" \
                     "NICOrgMSP:${NIC_PEER}:${NIC_MSP}:${NIC_CA}"; do

        IFS=':' read -r MSP PEER MSP_PATH TLS_CA <<< "$ORG_INFO"

        docker exec -e CORE_PEER_ADDRESS=${PEER} \
            -e CORE_PEER_LOCALMSPID=${MSP} \
            -e CORE_PEER_MSPCONFIGPATH=${MSP_PATH} \
            -e CORE_PEER_TLS_ROOTCERT_FILE=${TLS_CA} \
            cli.tendershield peer lifecycle chaincode install ${CHAINCODE_NAME}.tar.gz

        print_success "  Installed on ${MSP}"
    done

    # Get package ID
    print_info "Querying installed chaincode package ID..."
    PACKAGE_ID=$(docker exec -e CORE_PEER_ADDRESS=${MINISTRY_PEER} \
        -e CORE_PEER_LOCALMSPID=MinistryOrgMSP \
        -e CORE_PEER_MSPCONFIGPATH=${MINISTRY_MSP} \
        -e CORE_PEER_TLS_ROOTCERT_FILE=${MINISTRY_CA} \
        cli.tendershield peer lifecycle chaincode queryinstalled 2>&1 | \
        grep "${CHAINCODE_NAME}_${CHAINCODE_VERSION}" | \
        sed -n 's/.*Package ID: \(.*\), Label:.*/\1/p')

    print_success "Package ID: ${PACKAGE_ID}"

    # Approve chaincode for each org
    print_info "Approving chaincode for all organizations..."

    for ORG_INFO in "MinistryOrgMSP:${MINISTRY_PEER}:${MINISTRY_MSP}:${MINISTRY_CA}" \
                     "BidderOrgMSP:${BIDDER_PEER}:${BIDDER_MSP}:${BIDDER_CA}" \
                     "AuditorOrgMSP:${AUDITOR_PEER}:${AUDITOR_MSP}:${AUDITOR_CA}" \
                     "NICOrgMSP:${NIC_PEER}:${NIC_MSP}:${NIC_CA}"; do

        IFS=':' read -r MSP PEER MSP_PATH TLS_CA <<< "$ORG_INFO"

        docker exec -e CORE_PEER_ADDRESS=${PEER} \
            -e CORE_PEER_LOCALMSPID=${MSP} \
            -e CORE_PEER_MSPCONFIGPATH=${MSP_PATH} \
            -e CORE_PEER_TLS_ROOTCERT_FILE=${TLS_CA} \
            cli.tendershield peer lifecycle chaincode approveformyorg \
                -o ${ORDERER_ADDRESS} \
                --channelID ${CHANNEL_NAME_TENDER} \
                --name ${CHAINCODE_NAME} \
                --version ${CHAINCODE_VERSION} \
                --package-id ${PACKAGE_ID} \
                --sequence ${CHAINCODE_SEQUENCE} \
                --tls --cafile ${ORDERER_CA} \
                --signature-policy "AND('MinistryOrgMSP.peer','NICOrgMSP.peer')"

        print_success "  Approved by ${MSP}"
    done

    # Commit chaincode
    print_info "Committing chaincode definition to TenderChannel..."
    docker exec cli.tendershield peer lifecycle chaincode commit \
        -o ${ORDERER_ADDRESS} \
        --channelID ${CHANNEL_NAME_TENDER} \
        --name ${CHAINCODE_NAME} \
        --version ${CHAINCODE_VERSION} \
        --sequence ${CHAINCODE_SEQUENCE} \
        --tls --cafile ${ORDERER_CA} \
        --peerAddresses ${MINISTRY_PEER} --tlsRootCertFiles ${MINISTRY_CA} \
        --peerAddresses ${BIDDER_PEER} --tlsRootCertFiles ${BIDDER_CA} \
        --peerAddresses ${AUDITOR_PEER} --tlsRootCertFiles ${AUDITOR_CA} \
        --peerAddresses ${NIC_PEER} --tlsRootCertFiles ${NIC_CA} \
        --signature-policy "AND('MinistryOrgMSP.peer','NICOrgMSP.peer')"

    print_success "Chaincode committed to ledger!"
}

# ---------------------------------------------------------------------------
# Run smoke test
# ---------------------------------------------------------------------------
smoke_test() {
    print_step "Running Smoke Test (InitLedger + Query)"

    print_info "Invoking InitLedger — seeding demo tenders (MoRTH, MoE, MoH)..."
    docker exec -e CORE_PEER_ADDRESS=${MINISTRY_PEER} \
        -e CORE_PEER_LOCALMSPID=MinistryOrgMSP \
        -e CORE_PEER_MSPCONFIGPATH=${MINISTRY_MSP} \
        -e CORE_PEER_TLS_ROOTCERT_FILE=${MINISTRY_CA} \
        cli.tendershield peer chaincode invoke \
            -o ${ORDERER_ADDRESS} \
            --tls --cafile ${ORDERER_CA} \
            -C ${CHANNEL_NAME_TENDER} \
            -n ${CHAINCODE_NAME} \
            --peerAddresses ${MINISTRY_PEER} --tlsRootCertFiles ${MINISTRY_CA} \
            --peerAddresses ${NIC_PEER} --tlsRootCertFiles ${NIC_CA} \
            -c '{"function":"InitLedger","Args":[]}'

    sleep 3
    print_success "InitLedger invoked — 3 demo tenders seeded"

    print_info "Querying dashboard stats..."
    docker exec -e CORE_PEER_ADDRESS=${MINISTRY_PEER} \
        -e CORE_PEER_LOCALMSPID=MinistryOrgMSP \
        -e CORE_PEER_MSPCONFIGPATH=${MINISTRY_MSP} \
        -e CORE_PEER_TLS_ROOTCERT_FILE=${MINISTRY_CA} \
        cli.tendershield peer chaincode query \
            -C ${CHANNEL_NAME_TENDER} \
            -n ${CHAINCODE_NAME} \
            -c '{"function":"GetDashboardStats","Args":[]}'

    print_success "Dashboard stats query returned successfully"

    print_info "Querying tender by status (BIDDING_OPEN)..."
    docker exec -e CORE_PEER_ADDRESS=${MINISTRY_PEER} \
        -e CORE_PEER_LOCALMSPID=MinistryOrgMSP \
        -e CORE_PEER_MSPCONFIGPATH=${MINISTRY_MSP} \
        -e CORE_PEER_TLS_ROOTCERT_FILE=${MINISTRY_CA} \
        cli.tendershield peer chaincode query \
            -C ${CHANNEL_NAME_TENDER} \
            -n ${CHAINCODE_NAME} \
            -c '{"function":"QueryTendersByStatus","Args":["BIDDING_OPEN"]}'

    print_success "Smoke test completed — all queries returned valid data!"
}

# ---------------------------------------------------------------------------
# Stop and clean the network
# ---------------------------------------------------------------------------
stop_network() {
    print_step "Stopping TenderShield Network"

    cd ..
    docker-compose -f docker-compose.yaml down --volumes --remove-orphans
    cd scripts

    # Remove generated artifacts
    rm -rf ../crypto-config
    rm -rf ../channel-artifacts

    print_success "Network stopped and cleaned!"
}

# ---------------------------------------------------------------------------
# Print final status
# ---------------------------------------------------------------------------
print_final_status() {
    echo ""
    echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║${WHITE}${BOLD}   🎉 TenderShield Network Setup Complete! 🎉               ${NC}${GREEN}║${NC}"
    echo -e "${GREEN}╠══════════════════════════════════════════════════════════════╣${NC}"
    echo -e "${GREEN}║${NC}                                                              ${GREEN}║${NC}"
    echo -e "${GREEN}║${NC}  ${CYAN}Blockchain Network:${NC}                                        ${GREEN}║${NC}"
    echo -e "${GREEN}║${NC}    Orderers: 3 (Raft consensus — fault tolerant)             ${GREEN}║${NC}"
    echo -e "${GREEN}║${NC}    Peers:    8 (2 per org × 4 orgs)                          ${GREEN}║${NC}"
    echo -e "${GREEN}║${NC}    CAs:      4 (one per organization)                        ${GREEN}║${NC}"
    echo -e "${GREEN}║${NC}    CouchDB:  4 (one per org — rich queries enabled)           ${GREEN}║${NC}"
    echo -e "${GREEN}║${NC}                                                              ${GREEN}║${NC}"
    echo -e "${GREEN}║${NC}  ${CYAN}Channels:${NC}                                                  ${GREEN}║${NC}"
    echo -e "${GREEN}║${NC}    TenderChannel: All 4 orgs (tender/bid operations)         ${GREEN}║${NC}"
    echo -e "${GREEN}║${NC}    AuditChannel:  MinistryOrg + AuditorOrg (CAG)             ${GREEN}║${NC}"
    echo -e "${GREEN}║${NC}                                                              ${GREEN}║${NC}"
    echo -e "${GREEN}║${NC}  ${CYAN}Chaincode:${NC}                                                 ${GREEN}║${NC}"
    echo -e "${GREEN}║${NC}    Name:     tendershield v${CHAINCODE_VERSION}                              ${GREEN}║${NC}"
    echo -e "${GREEN}║${NC}    Language: Go (Fabric Contract API)                        ${GREEN}║${NC}"
    echo -e "${GREEN}║${NC}    Policy:   MinistryOrg AND NICOrg (dual endorsement)       ${GREEN}║${NC}"
    echo -e "${GREEN}║${NC}                                                              ${GREEN}║${NC}"
    echo -e "${GREEN}║${NC}  ${CYAN}Demo Data Seeded:${NC}                                          ${GREEN}║${NC}"
    echo -e "${GREEN}║${NC}    🏗️  MoRTH — NH-44 Highway Expansion — ₹450 Cr             ${GREEN}║${NC}"
    echo -e "${GREEN}║${NC}    🏫 MoE — PM SHRI Schools Digital — ₹85 Cr                ${GREEN}║${NC}"
    echo -e "${GREEN}║${NC}    🏥 MoH — AIIMS Medical Equipment — ₹120 Cr (FROZEN)      ${GREEN}║${NC}"
    echo -e "${GREEN}║${NC}                                                              ${GREEN}║${NC}"
    echo -e "${GREEN}║${NC}  ${CYAN}Monitoring:${NC}                                                ${GREEN}║${NC}"
    echo -e "${GREEN}║${NC}    Prometheus: http://localhost:9090                         ${GREEN}║${NC}"
    echo -e "${GREEN}║${NC}    Grafana:    http://localhost:3001 (admin/tendershield_grafana_2025)${GREEN}║${NC}"
    echo -e "${GREEN}║${NC}                                                              ${GREEN}║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

# ---------------------------------------------------------------------------
# Main execution
# ---------------------------------------------------------------------------
print_banner

case "${1}" in
    up)
        check_prerequisites
        generate_crypto
        generate_channel_artifacts
        start_network
        create_channels
        install_chaincode
        smoke_test
        print_final_status
        ;;
    down)
        stop_network
        ;;
    restart)
        stop_network
        check_prerequisites
        generate_crypto
        generate_channel_artifacts
        start_network
        create_channels
        install_chaincode
        smoke_test
        print_final_status
        ;;
    generate)
        check_prerequisites
        generate_crypto
        generate_channel_artifacts
        ;;
    test)
        smoke_test
        ;;
    *)
        echo ""
        echo -e "${YELLOW}Usage: $0 {up|down|restart|generate|test}${NC}"
        echo ""
        echo "  up       — Generate crypto, start network, create channels, install chaincode, smoke test"
        echo "  down     — Stop network and clean all generated artifacts"
        echo "  restart  — Stop, clean, and re-create everything from scratch"
        echo "  generate — Generate crypto material and channel artifacts only"
        echo "  test     — Run smoke test on running network"
        echo ""
        exit 1
        ;;
esac
