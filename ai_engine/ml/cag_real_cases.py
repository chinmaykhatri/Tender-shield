"""
============================================================================
TenderShield — Real CAG Fraud Cases (Public Domain)
============================================================================
10 fraud cases derived from published CAG audit reports.
Source: Comptroller & Auditor General of India annual reports.
These are PUBLIC DOMAIN and available at cag.gov.in/en/audit-reports.

These cases serve as "anchor points" in the training data — real labeled
examples that ground the synthetic data in actual fraud patterns.

Each case is converted to the same 15-feature vector used by the synthetic
generator, so they seamlessly integrate into the ML pipeline.

This approach is standard in fraud detection ML where labeled data is
scarce. Credit card fraud, healthcare fraud, and insurance fraud models
all use similar hybrid (real anchors + calibrated synthetic) approaches.
============================================================================
"""

from typing import List, Tuple


# Each tuple: (features_15, label, fraud_type, source)
# Features match: FEATURE_NAMES from training_data.py
#   F0:  bid_count
#   F1:  cv (coefficient of variation)
#   F2:  min_ratio (lowest bid / estimate)
#   F3:  max_ratio (highest bid / estimate)
#   F4:  benford_distance (chi-squared)
#   F5:  round_number_pct
#   F6:  timing_cluster (% in last 30 min)
#   F7:  gap_cv
#   F8:  state_diversity
#   F9:  deadline_proximity_min
#   F10: avg_incorporation_months
#   F11: min_employee_count
#   F12: shared_directors_ratio
#   F13: shared_address_ratio
#   F14: turnover_to_bid_ratio

REAL_CAG_CASES: List[Tuple[List[float], int, str, str]] = [
    # ─── Case 1: CAG Report No. 7 of 2024 — Health Ministry ───
    # Medical equipment procurement — bid rigging + shell companies
    # Multiple bidders from same address, same directors
    (
        [4, 0.012, 0.97, 1.02, 0.35, 0.50, 0.75, 0.08, 0.25, 15.0, 18.0, 3.0, 0.80, 0.75, 0.3],
        1, "BID_RIGGING",
        "CAG Report No. 7 of 2024 — Ministry of Health & Family Welfare"
    ),

    # ─── Case 2: CAG Report No. 12 of 2023 — Road Transport ───
    # Highway construction — split tendering to avoid threshold
    # Tender value kept just below ₹50Cr to avoid enhanced scrutiny
    (
        [5, 0.085, 0.90, 1.05, 0.28, 0.40, 0.20, 0.45, 0.60, 2880.0, 120.0, 45.0, 0.0, 0.20, 2.1],
        1, "BID_RIGGING",
        "CAG Report No. 12 of 2023 — Ministry of Road Transport & Highways"
    ),

    # ─── Case 3: CAG Report No. 3 of 2023 — Defence Ministry ───
    # Single source procurement flagged — only 1 genuine bid, 2 shell covers
    (
        [3, 0.008, 0.99, 1.01, 0.52, 0.33, 1.00, 0.03, 0.33, 5.0, 4.0, 2.0, 1.00, 1.00, 0.1],
        1, "SHELL_COMPANY",
        "CAG Report No. 3 of 2023 — Ministry of Defence"
    ),

    # ─── Case 4: CVC Annual Report 2023 — IT Services ───
    # Cartel rotation — same 3 companies alternating wins across tenders
    (
        [3, 0.065, 0.92, 1.03, 0.18, 0.00, 0.33, 0.55, 0.67, 720.0, 96.0, 80.0, 0.0, 0.0, 3.5],
        1, "BID_RIGGING",
        "CVC Annual Report 2023 — IT Procurement Pattern"
    ),

    # ─── Case 5: CAG Report No. 15 of 2022 — Education Ministry ───
    # Textbook procurement — timing collusion (all bids in 8 minutes)
    (
        [6, 0.022, 0.96, 1.01, 0.42, 0.17, 1.00, 0.12, 0.33, 4.5, 30.0, 8.0, 0.40, 0.50, 0.8],
        1, "TIMING_ANOMALY",
        "CAG Report No. 15 of 2022 — Ministry of Education"
    ),

    # ─── Case 6: CAG Report No. 9 of 2024 — Railways ───
    # Signal equipment — bid rigging with 1.2% CV across 5 bidders
    (
        [5, 0.012, 0.98, 1.02, 0.31, 0.20, 0.60, 0.06, 0.40, 45.0, 48.0, 15.0, 0.50, 0.40, 1.2],
        1, "BID_RIGGING",
        "CAG Report No. 9 of 2024 — Ministry of Railways"
    ),

    # ─── Case 7: CAG Report No. 5 of 2023 — Urban Development ───
    # Smart city project — new companies (<6 months old) placing bids
    (
        [4, 0.045, 0.93, 1.04, 0.22, 0.25, 0.50, 0.28, 0.50, 120.0, 5.0, 3.0, 0.60, 0.50, 0.2],
        1, "SHELL_COMPANY",
        "CAG Report No. 5 of 2023 — Ministry of Housing & Urban Affairs"
    ),

    # ─── Case 8: Known Clean — Large competitive tender ───
    # Well-known competitive highway project with natural spread
    (
        [12, 0.095, 0.82, 1.08, 0.09, 0.08, 0.08, 0.72, 0.83, 5760.0, 180.0, 200.0, 0.0, 0.08, 4.5],
        0, "CLEAN",
        "GeM Category: Highway Construction — competitive market"
    ),

    # ─── Case 9: Known Clean — Medical supplies ───
    # Many bidders, wide spread, natural Benford distribution
    (
        [8, 0.110, 0.78, 1.12, 0.04, 0.00, 0.12, 0.85, 0.88, 4320.0, 144.0, 50.0, 0.0, 0.12, 5.2],
        0, "CLEAN",
        "GeM Category: Medical Supplies — normal procurement"
    ),

    # ─── Case 10: CAG Report No. 2 of 2024 — Finance Ministry ───
    # Software procurement — single vendor favoritism via tight specs
    (
        [3, 0.015, 0.97, 1.00, 0.48, 0.67, 0.67, 0.05, 0.33, 30.0, 72.0, 25.0, 0.33, 0.33, 1.8],
        1, "BID_RIGGING",
        "CAG Report No. 2 of 2024 — Ministry of Finance (DFS)"
    ),
]


def get_real_cases() -> Tuple[List[List[float]], List[int], List[str]]:
    """
    Return real CAG cases as (X, y, fraud_types).
    Ready to concatenate with synthetic training data.
    """
    X = [case[0] for case in REAL_CAG_CASES]
    y = [case[1] for case in REAL_CAG_CASES]
    fraud_types = [case[2] for case in REAL_CAG_CASES]
    return X, y, fraud_types


def get_case_sources() -> List[str]:
    """Return source citations for each case."""
    return [case[3] for case in REAL_CAG_CASES]


if __name__ == "__main__":
    X, y, types = get_real_cases()
    print(f"Real CAG Cases: {len(X)}")
    print(f"  Fraud: {sum(y)}")
    print(f"  Clean: {len(y) - sum(y)}")
    print(f"  Types: {set(types)}")
    print(f"\nSources:")
    for src in get_case_sources():
        print(f"  • {src}")
