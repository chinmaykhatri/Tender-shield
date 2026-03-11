"""
============================================================================
TenderShield — Hyperledger Fabric Gateway Service
============================================================================
Provides async interface to the Hyperledger Fabric blockchain network.
Wraps chaincode invocations and queries through the Fabric Gateway SDK.

DESIGN DECISION: Uses a mock/simulation layer for competition demo
since the full Fabric Gateway SDK requires a running Fabric network.
In production, this would use fabric-sdk-py or grpc-based gateway.

All blockchain operations are logged for the audit trail.
============================================================================
"""

import json
import uuid
import logging
from typing import Optional, Dict, List, Any
from datetime import datetime, timezone, timedelta

from backend.config import settings

logger = logging.getLogger("tendershield.fabric")

# IST timezone
IST = timezone(timedelta(hours=5, minutes=30))


class FabricService:
    """
    Service layer for interacting with Hyperledger Fabric network.

    In demo mode, simulates blockchain operations using in-memory state.
    In production, connects via Fabric Gateway peer (gRPC).
    """

    def __init__(self):
        self.connected = False
        self.channel = settings.FABRIC_CHANNEL_NAME
        self.chaincode = settings.FABRIC_CHAINCODE_NAME
        # In-memory state store for demo (simulates CouchDB state)
        self._state: Dict[str, Any] = {}
        self._history: Dict[str, List[Dict]] = {}
        self._init_demo_data()
        logger.info("[FabricService] Initialized in demo mode")

    def _init_demo_data(self):
        """Seed demo tender data (mirrors InitLedger from chaincode)."""
        now = datetime.now(IST).strftime("%Y-%m-%dT%H:%M:%S+05:30")

        demo_tenders = [
            {
                "docType": "tender",
                "tender_id": "TDR-MoRTH-2025-000001",
                "ministry_code": "MoRTH",
                "department": "National Highways Division",
                "title": "Construction and widening of NH-44 Delhi-Agra Highway (6-lane)",
                "description": "Construction and widening of National Highway 44, Section KM 12.500 to KM 145.000, from existing 4-lane to 6-lane divided carriageway with paved shoulders, including grade-separated junctions, service roads, underpasses, flyovers, and drainage structures per IRC Standards.",
                "estimated_value_paise": 450_00_00_000 * 100,
                "category": "WORKS",
                "procurement_method": "OPEN",
                "gem_category_id": "SRV-INFRA-HIGHWAY",
                "deadline_ist": "2025-04-15T17:00:00+05:30",
                "gfr_rule_reference": "GFR Rule 149",
                "status": "BIDDING_OPEN",
                "created_by_did": "did:tendershield:ministryorgmsp:officer.morth",
                "created_at_ist": now,
                "blockchain_tx_id": f"tx_{uuid.uuid4().hex[:16]}",
            },
            {
                "docType": "tender",
                "tender_id": "TDR-MoE-2025-000001",
                "ministry_code": "MoE",
                "department": "School Education Department",
                "title": "PM SHRI Schools — Digital Infrastructure Upgrade (Phase II)",
                "description": "Supply, installation, testing and commissioning of ICT infrastructure for 500 PM SHRI Schools across 10 states, including smart boards, tablets, campus WiFi, solar panels, and LMS with vernacular language support.",
                "estimated_value_paise": 85_00_00_000 * 100,
                "category": "GOODS",
                "procurement_method": "OPEN",
                "gem_category_id": "GDS-ICT-EDTECH",
                "deadline_ist": "2025-04-05T17:00:00+05:30",
                "gfr_rule_reference": "GFR Rule 149",
                "status": "BIDDING_OPEN",
                "created_by_did": "did:tendershield:ministryorgmsp:officer.moe",
                "created_at_ist": now,
                "blockchain_tx_id": f"tx_{uuid.uuid4().hex[:16]}",
            },
            {
                "docType": "tender",
                "tender_id": "TDR-MoH-2025-000001",
                "ministry_code": "MoH",
                "department": "AIIMS Medical Equipment Division",
                "title": "AIIMS New Delhi — Advanced Medical Imaging Equipment Procurement",
                "description": "Procurement of advanced medical imaging equipment for AIIMS New Delhi, including 3T MRI, 128-slice CT Scanner, PET-CT Scanner, Digital Mammography, and Ultrasound Systems with FDA/CE certification.",
                "estimated_value_paise": 120_00_00_000 * 100,
                "category": "GOODS",
                "procurement_method": "OPEN",
                "gem_category_id": "GDS-MEDICAL-IMAGING",
                "deadline_ist": "2025-03-28T17:00:00+05:30",
                "gfr_rule_reference": "GFR Rule 149",
                "status": "FROZEN_BY_AI",
                "created_by_did": "did:tendershield:ministryorgmsp:officer.moh",
                "created_at_ist": now,
                "blockchain_tx_id": f"tx_{uuid.uuid4().hex[:16]}",
            },
        ]

        for tender in demo_tenders:
            key = f"TENDER~{tender['ministry_code']}~{tender['tender_id']}"
            self._state[key] = tender
            self._history[key] = [{
                "tx_id": tender["blockchain_tx_id"],
                "timestamp_ist": now,
                "value": tender,
                "is_deleted": False,
            }]

        self.connected = True
        logger.info(f"[FabricService] Seeded {len(demo_tenders)} demo tenders")

    # ========================================================================
    # Tender Operations
    # ========================================================================

    async def create_tender(self, tender_data: dict, caller_did: str) -> dict:
        """Create a new tender on the blockchain."""
        tender_id = tender_data.get("tender_id", f"TDR-{tender_data.get('ministry_code', 'UNKNOWN')}-2025-{uuid.uuid4().hex[:6].upper()}")
        tender_data["tender_id"] = tender_id
        tender_data["docType"] = "tender"
        tender_data["status"] = "DRAFT"
        tender_data["created_by_did"] = caller_did
        tender_data["created_at_ist"] = datetime.now(IST).strftime("%Y-%m-%dT%H:%M:%S+05:30")
        tender_data["blockchain_tx_id"] = f"tx_{uuid.uuid4().hex[:16]}"

        key = f"TENDER~{tender_data.get('ministry_code', '')}~{tender_id}"
        self._state[key] = tender_data
        self._history.setdefault(key, []).append({
            "tx_id": tender_data["blockchain_tx_id"],
            "timestamp_ist": tender_data["created_at_ist"],
            "value": tender_data,
            "is_deleted": False,
        })

        logger.info(f"[FabricService] Tender created: {tender_id}")
        return tender_data

    async def query_tender_by_id(self, ministry_code: str, tender_id: str) -> Optional[dict]:
        """Query a single tender by composite key."""
        key = f"TENDER~{ministry_code}~{tender_id}"
        return self._state.get(key)

    async def query_tenders_by_status(self, status: str) -> List[dict]:
        """Query tenders by lifecycle status (CouchDB rich query simulation)."""
        results = []
        for key, value in self._state.items():
            if key.startswith("TENDER~") and value.get("status") == status:
                results.append(value)
        return sorted(results, key=lambda x: x.get("created_at_ist", ""), reverse=True)

    async def query_all_tenders(self) -> List[dict]:
        """Query all tenders."""
        return [v for k, v in self._state.items() if k.startswith("TENDER~")]

    async def publish_tender(self, ministry_code: str, tender_id: str) -> dict:
        """Change tender status to BIDDING_OPEN."""
        key = f"TENDER~{ministry_code}~{tender_id}"
        tender = self._state.get(key)
        if not tender:
            raise ValueError(f"Tender {tender_id} not found")
        tender["status"] = "BIDDING_OPEN"
        tender["blockchain_tx_id"] = f"tx_{uuid.uuid4().hex[:16]}"
        self._state[key] = tender
        return tender

    async def freeze_tender(self, ministry_code: str, tender_id: str, reason: str) -> dict:
        """Freeze a tender (AI or NIC admin action)."""
        key = f"TENDER~{ministry_code}~{tender_id}"
        tender = self._state.get(key)
        if not tender:
            raise ValueError(f"Tender {tender_id} not found")
        tender["status"] = "FROZEN_BY_AI"
        tender["blockchain_tx_id"] = f"tx_{uuid.uuid4().hex[:16]}"
        self._state[key] = tender
        logger.warning(f"[FabricService] 🚨 TENDER FROZEN: {tender_id} — {reason}")
        return tender

    async def award_tender(self, ministry_code: str, tender_id: str, winning_bid_id: str) -> dict:
        """Award tender to winning bidder."""
        key = f"TENDER~{ministry_code}~{tender_id}"
        tender = self._state.get(key)
        if not tender:
            raise ValueError(f"Tender {tender_id} not found")
        tender["status"] = "AWARDED"
        tender["blockchain_tx_id"] = f"tx_{uuid.uuid4().hex[:16]}"
        self._state[key] = tender
        return tender

    # ========================================================================
    # Bid Operations
    # ========================================================================

    async def submit_bid(self, bid_data: dict, caller_did: str) -> dict:
        """Submit a ZKP-committed bid (Phase 1)."""
        bid_id = bid_data.get("bid_id", f"BID-{uuid.uuid4().hex[:12].upper()}")
        bid_data["bid_id"] = bid_id
        bid_data["docType"] = "bid"
        bid_data["bidder_did"] = caller_did
        bid_data["status"] = "COMMITTED"
        bid_data["submitted_at_ist"] = datetime.now(IST).strftime("%Y-%m-%dT%H:%M:%S+05:30")
        bid_data["blockchain_tx_id"] = f"tx_{uuid.uuid4().hex[:16]}"

        key = f"BID~{bid_data.get('tender_id', '')}~{caller_did}~{bid_id}"
        self._state[key] = bid_data

        logger.info(f"[FabricService] Bid committed (ZKP Phase 1): {bid_id}")
        return bid_data

    async def reveal_bid(self, tender_id: str, bid_id: str, bidder_did: str,
                         revealed_amount_paise: int) -> dict:
        """Reveal a bid amount (ZKP Phase 2)."""
        key = f"BID~{tender_id}~{bidder_did}~{bid_id}"
        bid = self._state.get(key)
        if not bid:
            raise ValueError(f"Bid {bid_id} not found")

        bid["revealed_amount_paise"] = revealed_amount_paise
        bid["status"] = "REVEALED"
        bid["reveal_at_ist"] = datetime.now(IST).strftime("%Y-%m-%dT%H:%M:%S+05:30")
        bid["blockchain_tx_id"] = f"tx_{uuid.uuid4().hex[:16]}"
        self._state[key] = bid
        return bid

    async def query_bids_by_tender(self, tender_id: str) -> List[dict]:
        """Query all bids for a specific tender."""
        results = []
        for key, value in self._state.items():
            if key.startswith(f"BID~{tender_id}~"):
                results.append(value)
        return results

    # ========================================================================
    # Dashboard & History
    # ========================================================================

    async def get_dashboard_stats(self) -> dict:
        """Get aggregated dashboard statistics."""
        stats = {
            "total_tenders": 0,
            "active_tenders": 0,
            "total_bids": 0,
            "flagged_tenders": 0,
            "total_value_crores": 0.0,
            "fraud_prevented_value_crores": 0.0,
        }

        for key, value in self._state.items():
            if key.startswith("TENDER~"):
                stats["total_tenders"] += 1
                value_crores = value.get("estimated_value_paise", 0) / (100 * 100_00_00_000)
                stats["total_value_crores"] += value_crores

                status = value.get("status", "")
                if status in ("BIDDING_OPEN", "PUBLISHED", "UNDER_EVALUATION"):
                    stats["active_tenders"] += 1
                elif status == "FROZEN_BY_AI":
                    stats["flagged_tenders"] += 1
                    stats["fraud_prevented_value_crores"] += value_crores

            elif key.startswith("BID~"):
                stats["total_bids"] += 1

        return stats

    async def get_tender_history(self, ministry_code: str, tender_id: str) -> List[dict]:
        """Get blockchain history for a tender."""
        key = f"TENDER~{ministry_code}~{tender_id}"
        return self._history.get(key, [])

    async def health_check(self) -> dict:
        """Check Fabric connection status."""
        return {
            "fabric_connected": self.connected,
            "channel": self.channel,
            "chaincode": self.chaincode,
            "demo_mode": True,
        }


# Singleton instance
fabric_service = FabricService()
