"""
============================================================================
TenderShield — Test Fixtures & Configuration
============================================================================
Shared fixtures for all test modules.
============================================================================
"""

import pytest
from datetime import datetime, timezone, timedelta

IST = timezone(timedelta(hours=5, minutes=30))


# ============================================================================
# Tender Fixtures
# ============================================================================

@pytest.fixture
def sample_tender():
    """A standard MoH tender for testing."""
    return {
        "tender_id": "TDR-MoH-2025-000001",
        "ministry_code": "MoH",
        "estimated_value_paise": 120_00_00_000 * 100,
        "category": "GOODS",
        "deadline_ist": "2025-03-28T17:00:00+05:30",
    }


@pytest.fixture
def high_value_tender():
    """A ₹450 Cr MoRTH tender."""
    return {
        "tender_id": "TDR-MoRTH-2025-000001",
        "ministry_code": "MoRTH",
        "estimated_value_paise": 450_00_00_000 * 100,
        "category": "WORKS",
        "deadline_ist": "2025-04-15T17:00:00+05:30",
    }


# ============================================================================
# Bid Fixtures
# ============================================================================

@pytest.fixture
def rigged_bids():
    """Bids with suspiciously low variance (CV < 5%)."""
    return [
        {"bidder_did": "did:bidder:a", "revealed_amount_paise": 118_50_00_000 * 100, "bidder_gstin": "27AABCM1234F1Z5", "submitted_at_ist": "2025-03-27T14:30:15+05:30"},
        {"bidder_did": "did:bidder:b", "revealed_amount_paise": 119_00_00_000 * 100, "bidder_gstin": "27AABCB5678G1Z3", "submitted_at_ist": "2025-03-27T14:30:45+05:30"},
        {"bidder_did": "did:bidder:c", "revealed_amount_paise": 119_50_00_000 * 100, "bidder_gstin": "27AABCH9012H1Z1", "submitted_at_ist": "2025-03-27T14:31:10+05:30"},
        {"bidder_did": "did:bidder:d", "revealed_amount_paise": 125_00_00_000 * 100, "bidder_gstin": "07AABCP3456I1Z9", "submitted_at_ist": "2025-03-27T14:31:30+05:30"},
        {"bidder_did": "did:bidder:e", "revealed_amount_paise": 115_00_00_000 * 100, "bidder_gstin": "33AABCG7890J1Z7", "submitted_at_ist": "2025-03-25T10:15:00+05:30"},
    ]


@pytest.fixture
def clean_bids():
    """Normal bids with healthy variance."""
    return [
        {"bidder_did": "did:bidder:ed1", "revealed_amount_paise": 78_00_00_000 * 100, "submitted_at_ist": "2025-03-28T10:30:00+05:30"},
        {"bidder_did": "did:bidder:ed2", "revealed_amount_paise": 82_00_00_000 * 100, "submitted_at_ist": "2025-03-30T14:15:00+05:30"},
        {"bidder_did": "did:bidder:ed3", "revealed_amount_paise": 91_00_00_000 * 100, "submitted_at_ist": "2025-04-01T11:45:00+05:30"},
        {"bidder_did": "did:bidder:ed4", "revealed_amount_paise": 84_50_00_000 * 100, "submitted_at_ist": "2025-04-02T09:30:00+05:30"},
    ]


@pytest.fixture
def burst_bids():
    """Bids submitted within seconds of each other (timing anomaly)."""
    return [
        {"bidder_did": "did:bidder:a", "revealed_amount_paise": 100_00_00_000 * 100, "submitted_at_ist": "2025-03-27T14:30:10+05:30"},
        {"bidder_did": "did:bidder:b", "revealed_amount_paise": 102_00_00_000 * 100, "submitted_at_ist": "2025-03-27T14:30:20+05:30"},
        {"bidder_did": "did:bidder:c", "revealed_amount_paise": 104_00_00_000 * 100, "submitted_at_ist": "2025-03-27T14:30:30+05:30"},
        {"bidder_did": "did:bidder:d", "revealed_amount_paise": 106_00_00_000 * 100, "submitted_at_ist": "2025-03-27T14:30:40+05:30"},
    ]


# ============================================================================
# Bidder Profile Fixtures
# ============================================================================

@pytest.fixture
def shell_company_profile():
    """A bidder profile with multiple shell company indicators."""
    return {
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
    }


@pytest.fixture
def legitimate_company_profile():
    """A clean bidder profile."""
    return {
        "bidder_did": "did:bidder:legit_co",
        "bidder_gstin": "27AABCL1234M1Z5",
        "registered_state": "MH",
        "incorporation_months": 60,
        "annual_turnover_paise": 500_00_00_000 * 100,
        "employee_count": 250,
        "director_dids": ["dir:unique1", "dir:unique2"],
        "flagged_directors": [],
        "address_hash": "hash_unique_addr",
        "flagged_addresses": [],
    }


# ============================================================================
# Historical Tender Fixtures
# ============================================================================

@pytest.fixture
def historical_tenders_with_rotation():
    """Historical tenders showing cartel rotation pattern."""
    tenders = []
    bidders = ["did:bidder:x", "did:bidder:y", "did:bidder:z"]
    for i in range(6):
        winner = bidders[i % 3]
        tenders.append({
            "tender_id": f"TDR-MoH-2024-{i:06d}",
            "ministry_code": "MoH",
            "category": "GOODS",
            "estimated_value_paise": 50_00_00_000 * 100,
            "awarded_to": winner,
            "bids": [
                {"bidder_did": b, "revealed_amount_paise": (50 + j * 5) * 1_00_00_000 * 100}
                for j, b in enumerate(bidders)
            ],
        })
    return tenders
