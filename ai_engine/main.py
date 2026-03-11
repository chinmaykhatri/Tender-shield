"""
============================================================================
TenderShield — AI Fraud Detection Microservice
============================================================================
FastAPI microservice running on port 8001.
Receives events from Kafka, runs 5 fraud detectors, and produces alerts.

Run: uvicorn ai_engine.main:app --host 0.0.0.0 --port 8001 --reload

ENDPOINTS:
  POST /analyze/tender     — Run all detectors on a tender
  POST /analyze/bid        — Analyze a single bid
  GET  /detectors          — List all detectors and their weights
  GET  /thresholds         — Action threshold configuration
  GET  /health             — Health check
  POST /demo/analyze       — Demo analysis with demo data
============================================================================
"""

import logging
import uuid
from typing import List, Optional
from datetime import datetime, timezone, timedelta

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from ai_engine.risk_scorer import CompositeRiskScorer

# ============================================================================
# Logging
# ============================================================================

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
)
logger = logging.getLogger("tendershield.ai")
IST = timezone(timedelta(hours=5, minutes=30))


# ============================================================================
# Request/Response Models
# ============================================================================

class AnalyzeTenderRequest(BaseModel):
    """Request to analyze a tender for fraud."""
    tender: dict
    bids: List[dict] = []
    historical_tenders: Optional[List[dict]] = None
    bidder_profiles: Optional[List[dict]] = None


class AnalyzeBidRequest(BaseModel):
    """Request to analyze a single bid."""
    tender: dict
    bid: dict
    bidder_profile: Optional[dict] = None


class DemoAnalyzeRequest(BaseModel):
    """Demo analysis request — uses built-in demo data."""
    scenario: str = Field(
        default="bid_rigging",
        description="Demo scenario: bid_rigging, shell_company, clean",
    )


# ============================================================================
# FastAPI Application
# ============================================================================

app = FastAPI(
    title="TenderShield AI Engine",
    description=(
        "🤖 AI Fraud Detection Microservice for TenderShield\n\n"
        "Runs 5 fraud detection algorithms in parallel:\n"
        "1. **Bid Rigging** — Statistical analysis (CV, Benford's Law, Z-scores)\n"
        "2. **Collusion Graph** — Network analysis of bidder relationships\n"
        "3. **Shell Company** — Entity verification (GSTIN, directors, address)\n"
        "4. **Cartel Rotation** — Win pattern rotation detection\n"
        "5. **Timing Anomaly** — Submission timing irregularities\n"
    ),
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize the composite risk scorer
risk_scorer = CompositeRiskScorer()


# ============================================================================
# Endpoints
# ============================================================================

@app.post("/analyze/tender")
async def analyze_tender(request: AnalyzeTenderRequest):
    """
    Run all 5 fraud detectors on a tender.
    Returns composite risk score and per-detector breakdowns.
    """
    result = risk_scorer.score_tender(
        tender=request.tender,
        bids=request.bids,
        historical_tenders=request.historical_tenders,
        bidder_profiles=request.bidder_profiles,
    )

    return {
        "success": True,
        "analysis": result,
        "alert_id": f"ALERT-{uuid.uuid4().hex[:8].upper()}",
    }


@app.post("/analyze/bid")
async def analyze_bid(request: AnalyzeBidRequest):
    """Analyze a single bid for shell company indicators."""
    from ai_engine.detectors.shell_company import ShellCompanyDetector
    detector = ShellCompanyDetector()

    profile = request.bidder_profile or request.bid
    result = detector.analyze(profile, request.tender)

    return {
        "success": True,
        "analysis": result,
    }


@app.get("/detectors")
async def list_detectors():
    """List all fraud detectors and their weights."""
    return {
        "success": True,
        "detectors": [
            {
                "name": "BID_RIGGING",
                "weight": 0.30,
                "description": "Statistical analysis: CV, Benford's Law, Z-score cover bids, round numbers",
                "tests": ["coefficient_of_variation", "cover_bid_detection", "benfords_law", "round_numbers", "bid_gap_uniformity"],
            },
            {
                "name": "COLLUSION",
                "weight": 0.25,
                "description": "Graph analysis: bidder co-occurrence networks, community detection",
                "tests": ["co_occurrence_matrix", "cluster_detection", "win_concentration", "entity_overlap"],
            },
            {
                "name": "SHELL_COMPANY",
                "weight": 0.20,
                "description": "Entity verification: GSTIN, directors, address, turnover, incorporation",
                "tests": ["gstin_state_mismatch", "recent_incorporation", "low_turnover", "minimal_employees", "common_directors", "common_address"],
            },
            {
                "name": "CARTEL",
                "weight": 0.15,
                "description": "Historical pattern: win rotation, department lock-in, coordinated pricing",
                "tests": ["sequential_rotation", "win_concentration", "department_lockin", "price_patterns"],
            },
            {
                "name": "TIMING_ANOMALY",
                "weight": 0.10,
                "description": "Timing analysis: burst submissions, off-hours, sequential intervals",
                "tests": ["burst_submission", "last_minute_clustering", "off_hours", "sequential_intervals", "weekend_holiday"],
            },
        ],
        "weights_total": 1.0,
    }


@app.get("/thresholds")
async def get_thresholds():
    """Get action threshold configuration."""
    return {
        "success": True,
        "thresholds": risk_scorer.get_action_thresholds(),
        "convergence_bonus": {
            "2_detectors_high": 5,
            "3_detectors_high": 10,
            "4_detectors_high": 15,
        },
    }


@app.post("/demo/analyze")
async def demo_analyze(request: DemoAnalyzeRequest):
    """
    Run demo analysis with built-in scenarios for competition judges.
    
    Scenarios:
      - bid_rigging: 5 bids with suspiciously low variance
      - shell_company: Recently incorporated company with common directors
      - clean: Normal tender with no anomalies
    """
    scenarios = {
        "bid_rigging": {
            "tender": {
                "tender_id": "TDR-MoH-2025-000001",
                "ministry_code": "MoH",
                "estimated_value_paise": 120_00_00_000 * 100,
                "category": "GOODS",
                "deadline_ist": "2025-03-28T17:00:00+05:30",
            },
            "bids": [
                {"bidder_did": "did:bidder:medtech", "revealed_amount_paise": 118_50_00_000 * 100, "bidder_gstin": "27AABCM1234F1Z5", "submitted_at_ist": "2025-03-27T14:30:15+05:30"},
                {"bidder_did": "did:bidder:biomedicorp", "revealed_amount_paise": 119_00_00_000 * 100, "bidder_gstin": "27AABCB5678G1Z3", "submitted_at_ist": "2025-03-27T14:30:45+05:30"},
                {"bidder_did": "did:bidder:healthsupply", "revealed_amount_paise": 119_50_00_000 * 100, "bidder_gstin": "27AABCH9012H1Z1", "submitted_at_ist": "2025-03-27T14:31:10+05:30"},
                {"bidder_did": "did:bidder:pharmaplus", "revealed_amount_paise": 125_00_00_000 * 100, "bidder_gstin": "07AABCP3456I1Z9", "submitted_at_ist": "2025-03-27T14:31:30+05:30"},
                {"bidder_did": "did:bidder:genuine_co", "revealed_amount_paise": 115_00_00_000 * 100, "bidder_gstin": "33AABCG7890J1Z7", "submitted_at_ist": "2025-03-25T10:15:00+05:30"},
            ],
        },
        "shell_company": {
            "tender": {
                "tender_id": "TDR-MoRTH-2025-000001",
                "ministry_code": "MoRTH",
                "estimated_value_paise": 450_00_00_000 * 100,
                "category": "WORKS",
                "deadline_ist": "2025-04-15T17:00:00+05:30",
            },
            "bids": [
                {"bidder_did": "did:bidder:roadbuilders", "revealed_amount_paise": 440_00_00_000 * 100, "submitted_at_ist": "2025-04-10T11:00:00+05:30"},
                {"bidder_did": "did:bidder:shell_infra", "revealed_amount_paise": 448_00_00_000 * 100, "submitted_at_ist": "2025-04-14T16:55:00+05:30"},
            ],
            "bidder_profiles": [
                {
                    "bidder_did": "did:bidder:shell_infra",
                    "bidder_gstin": "07AABCS1234K1Z5",
                    "registered_state": "MH",
                    "incorporation_months": 6,
                    "annual_turnover_paise": 10_00_00_000 * 100,
                    "employee_count": 3,
                    "director_dids": ["dir:shared1", "dir:shared2"],
                    "flagged_directors": ["dir:shared1"],
                    "address_hash": "hash_common_addr",
                    "flagged_addresses": ["hash_common_addr"],
                },
            ],
        },
        "clean": {
            "tender": {
                "tender_id": "TDR-MoE-2025-000001",
                "ministry_code": "MoE",
                "estimated_value_paise": 85_00_00_000 * 100,
                "category": "GOODS",
                "deadline_ist": "2025-04-05T17:00:00+05:30",
            },
            "bids": [
                {"bidder_did": "did:bidder:edtech1", "revealed_amount_paise": 78_00_00_000 * 100, "submitted_at_ist": "2025-03-28T10:30:00+05:30"},
                {"bidder_did": "did:bidder:edtech2", "revealed_amount_paise": 82_00_00_000 * 100, "submitted_at_ist": "2025-03-30T14:15:00+05:30"},
                {"bidder_did": "did:bidder:edtech3", "revealed_amount_paise": 91_00_00_000 * 100, "submitted_at_ist": "2025-04-01T11:45:00+05:30"},
                {"bidder_did": "did:bidder:edtech4", "revealed_amount_paise": 84_50_00_000 * 100, "submitted_at_ist": "2025-04-02T09:30:00+05:30"},
            ],
        },
    }

    scenario_data = scenarios.get(request.scenario, scenarios["clean"])

    analysis = risk_scorer.score_tender(
        tender=scenario_data["tender"],
        bids=scenario_data["bids"],
        bidder_profiles=scenario_data.get("bidder_profiles"),
    )

    return {
        "success": True,
        "scenario": request.scenario,
        "analysis": analysis,
        "alert_id": f"DEMO-ALERT-{uuid.uuid4().hex[:8].upper()}",
    }


@app.get("/health")
async def health_check():
    """AI Engine health check."""
    return {
        "status": "healthy",
        "service": "TenderShield AI Engine",
        "version": "1.0.0",
        "detectors_loaded": 5,
        "timestamp_ist": datetime.now(IST).strftime("%Y-%m-%dT%H:%M:%S+05:30"),
    }


@app.get("/")
async def root():
    """AI Engine root."""
    return {
        "name": "TenderShield AI Fraud Detection Engine",
        "version": "1.0.0",
        "detectors": 5,
        "documentation": "/docs",
        "demo": "POST /demo/analyze with {\"scenario\": \"bid_rigging\"}",
    }
