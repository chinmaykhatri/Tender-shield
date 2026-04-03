#!/bin/bash
# ============================================================================
# TenderShield — Fabric Network Teardown
# ============================================================================
# Usage: bash network/stop-fabric.sh
# ============================================================================

set -e

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo -e "${YELLOW}Stopping TenderShield Fabric Network...${NC}"

cd "${PROJECT_ROOT}"
docker compose -f docker-compose.fabric.yml down -v --remove-orphans 2>/dev/null || true

echo -e "${GREEN}✅ Network stopped and volumes cleaned${NC}"
echo ""
echo -e "  To restart: ${YELLOW}bash network/start-fabric.sh${NC}"
