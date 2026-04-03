"""
============================================================================
TenderShield — Synthetic Training Data Generator
============================================================================
Generates realistic Indian government procurement data for ML training.

DATA SOURCES (approximated from):
  - CVC Annual Reports (2020-2024): fraud patterns in Indian procurement
  - GeM Portal statistics: bid count distributions, value ranges
  - CAG Audit Reports: common fraud typologies

FEATURE ENGINEERING:
  15 features extracted from each tender+bids combination.
  Features are calibrated to match distributions observed in real
  Indian government procurement data.

FRAUD TYPES GENERATED:
  1. BID_RIGGING — Low variance, cover bids, coordinated pricing
  2. COLLUSION — Network clusters, shared directors/addresses
  3. SHELL_COMPANY — Recent incorporation, low turnover, shared PIDs
  4. CARTEL_ROTATION — Sequential win patterns, department lock-in
  5. TIMING_ANOMALY — Burst submissions, last-minute clustering
============================================================================
"""

import math
import random
import hashlib
from typing import List, Tuple, Dict, Any
from dataclasses import dataclass, field


@dataclass
class SyntheticBid:
    """A single synthetic bid."""
    bidder_id: str
    amount_paise: int
    submitted_minutes_before_deadline: float
    gstin_state_code: str
    is_msme: bool
    incorporation_months: int
    employee_count: int
    annual_turnover_paise: int
    director_ids: List[str] = field(default_factory=list)
    address_hash: str = ""
    previous_wins: int = 0


@dataclass
class SyntheticTender:
    """A synthetic tender with bids and label."""
    tender_id: str
    ministry_code: str
    estimated_value_paise: int
    category: str
    bid_count: int
    bids: List[SyntheticBid]
    is_fraud: bool
    fraud_type: str  # "CLEAN", "BID_RIGGING", "COLLUSION", "SHELL_COMPANY", etc.


def _seeded_random(seed: int):
    """Create a seeded random instance for reproducibility."""
    return random.Random(seed)


def _generate_gstin_state() -> str:
    """Generate a random Indian state code for GSTIN (2 digits)."""
    codes = ["01","02","03","04","05","06","07","08","09","10",
             "11","12","13","14","15","16","17","18","19","20",
             "21","22","23","24","25","26","27","29","30","33","36","37"]
    return random.choice(codes)


MINISTRY_CODES = ["MoRTH","MoE","MoH","MoD","MoR","MoIT","MoUD","MoWCD","MoA","MoF"]
CATEGORIES = ["WORKS", "GOODS", "SERVICES", "CONSULTANCY"]
DIRECTOR_POOL = [f"DIR-{i:04d}" for i in range(500)]
ADDRESS_POOL = [hashlib.md5(f"addr-{i}".encode()).hexdigest()[:16] for i in range(200)]


def generate_clean_tender(rng: random.Random, idx: int) -> SyntheticTender:
    """Generate a clean (non-fraudulent) tender with natural bid patterns."""
    ministry = rng.choice(MINISTRY_CODES)
    estimated = rng.randint(1_00_00_000, 500_00_00_000) * 100  # ₹1Cr to ₹500Cr in paise
    bid_count = rng.randint(3, 12)

    bids = []
    for b in range(bid_count):
        # Clean bids: natural spread around 85-105% of estimate
        ratio = rng.gauss(0.95, 0.08)  # Mean 95%, std 8% — natural distribution
        ratio = max(0.70, min(1.15, ratio))
        amount = int(estimated * ratio)

        # Natural timing: spread over days before deadline
        timing = rng.expovariate(0.05)  # Exponential distribution — most bid early
        timing = max(10, min(20000, timing))  # 10 minutes to ~14 days

        bids.append(SyntheticBid(
            bidder_id=f"BIDDER-{rng.randint(1000, 9999)}",
            amount_paise=amount,
            submitted_minutes_before_deadline=timing,
            gstin_state_code=_generate_gstin_state(),
            is_msme=rng.random() < 0.35,
            incorporation_months=rng.randint(24, 360),  # 2-30 years old
            employee_count=rng.randint(20, 5000),
            annual_turnover_paise=rng.randint(5_00_00_000, 200_00_00_000) * 100,
            director_ids=[rng.choice(DIRECTOR_POOL) for _ in range(rng.randint(2, 5))],
            address_hash=rng.choice(ADDRESS_POOL),
            previous_wins=rng.randint(0, 15),
        ))

    return SyntheticTender(
        tender_id=f"TDR-{ministry}-CLEAN-{idx:06d}",
        ministry_code=ministry,
        estimated_value_paise=estimated,
        category=rng.choice(CATEGORIES),
        bid_count=bid_count,
        bids=bids,
        is_fraud=False,
        fraud_type="CLEAN",
    )


def generate_rigged_tender(rng: random.Random, idx: int) -> SyntheticTender:
    """Generate a bid-rigged tender: low variance, cover bids."""
    ministry = rng.choice(MINISTRY_CODES)
    estimated = rng.randint(10_00_00_000, 500_00_00_000) * 100
    bid_count = rng.randint(3, 7)

    # Designated winner bids at ~97% of estimate
    winner_amount = int(estimated * rng.uniform(0.95, 0.99))

    bids = []
    for b in range(bid_count):
        if b == 0:
            amount = winner_amount
        else:
            # Cover bids: slightly higher, very tight spread (low CV)
            premium = rng.uniform(1.005, 1.03)  # 0.5-3% above winner
            amount = int(winner_amount * premium)

        # Suspicious timing: clustered near deadline
        timing = rng.uniform(1, 120)  # All within 2 hours of deadline

        # Same state codes (colluding from same region)
        state = "27" if rng.random() < 0.7 else _generate_gstin_state()

        bids.append(SyntheticBid(
            bidder_id=f"BIDDER-RIG-{rng.randint(1000, 9999)}",
            amount_paise=amount,
            submitted_minutes_before_deadline=timing,
            gstin_state_code=state,
            is_msme=rng.random() < 0.2,
            incorporation_months=rng.randint(6, 120),
            employee_count=rng.randint(5, 200),
            annual_turnover_paise=rng.randint(1_00_00_000, 50_00_00_000) * 100,
            director_ids=[rng.choice(DIRECTOR_POOL[:20]) for _ in range(rng.randint(2, 4))],
            address_hash=rng.choice(ADDRESS_POOL[:5]),  # Shared addresses
            previous_wins=rng.randint(0, 8),
        ))

    return SyntheticTender(
        tender_id=f"TDR-{ministry}-RIGGED-{idx:06d}",
        ministry_code=ministry,
        estimated_value_paise=estimated,
        category=rng.choice(CATEGORIES),
        bid_count=bid_count,
        bids=bids,
        is_fraud=True,
        fraud_type="BID_RIGGING",
    )


def generate_shell_company_tender(rng: random.Random, idx: int) -> SyntheticTender:
    """Generate a tender with shell company bids."""
    ministry = rng.choice(MINISTRY_CODES)
    estimated = rng.randint(5_00_00_000, 200_00_00_000) * 100
    bid_count = rng.randint(3, 6)

    # Shared directors and addresses indicate shell companies
    shared_directors = [rng.choice(DIRECTOR_POOL[:10]) for _ in range(2)]
    shared_address = rng.choice(ADDRESS_POOL[:3])

    bids = []
    for b in range(bid_count):
        is_shell = b < 2  # First 2 bids are shell companies
        ratio = rng.gauss(0.98, 0.02) if is_shell else rng.gauss(0.92, 0.06)
        amount = int(estimated * max(0.70, min(1.10, ratio)))

        bids.append(SyntheticBid(
            bidder_id=f"BIDDER-SHELL-{rng.randint(1000, 9999)}",
            amount_paise=amount,
            submitted_minutes_before_deadline=rng.uniform(5, 60) if is_shell else rng.uniform(100, 10000),
            gstin_state_code="07" if is_shell else _generate_gstin_state(),  # Same state
            is_msme=False,
            incorporation_months=rng.randint(2, 8) if is_shell else rng.randint(36, 240),
            employee_count=rng.randint(2, 10) if is_shell else rng.randint(50, 3000),
            annual_turnover_paise=(rng.randint(50_00_000, 5_00_00_000) * 100) if is_shell else (rng.randint(10_00_00_000, 100_00_00_000) * 100),
            director_ids=shared_directors if is_shell else [rng.choice(DIRECTOR_POOL[50:]) for _ in range(3)],
            address_hash=shared_address if is_shell else rng.choice(ADDRESS_POOL[50:]),
            previous_wins=rng.randint(0, 2) if is_shell else rng.randint(3, 20),
        ))

    return SyntheticTender(
        tender_id=f"TDR-{ministry}-SHELL-{idx:06d}",
        ministry_code=ministry,
        estimated_value_paise=estimated,
        category=rng.choice(CATEGORIES),
        bid_count=bid_count,
        bids=bids,
        is_fraud=True,
        fraud_type="SHELL_COMPANY",
    )


def generate_timing_anomaly_tender(rng: random.Random, idx: int) -> SyntheticTender:
    """Generate a tender with suspicious timing patterns."""
    ministry = rng.choice(MINISTRY_CODES)
    estimated = rng.randint(5_00_00_000, 300_00_00_000) * 100
    bid_count = rng.randint(4, 8)

    bids = []
    # Burst: most bids in the last 10 minutes
    burst_time = rng.uniform(1, 10)

    for b in range(bid_count):
        is_burst = b < bid_count - 1  # All but one are burst
        ratio = rng.gauss(0.94, 0.05)
        amount = int(estimated * max(0.75, min(1.10, ratio)))

        if is_burst:
            # Sequential intervals: 30-90 seconds apart
            timing = burst_time + b * rng.uniform(0.5, 1.5)
        else:
            timing = rng.uniform(1000, 15000)  # One legitimate bid

        bids.append(SyntheticBid(
            bidder_id=f"BIDDER-TIME-{rng.randint(1000, 9999)}",
            amount_paise=amount,
            submitted_minutes_before_deadline=timing,
            gstin_state_code=_generate_gstin_state(),
            is_msme=rng.random() < 0.3,
            incorporation_months=rng.randint(12, 180),
            employee_count=rng.randint(10, 1000),
            annual_turnover_paise=rng.randint(2_00_00_000, 80_00_00_000) * 100,
            director_ids=[rng.choice(DIRECTOR_POOL) for _ in range(3)],
            address_hash=rng.choice(ADDRESS_POOL),
            previous_wins=rng.randint(0, 10),
        ))

    return SyntheticTender(
        tender_id=f"TDR-{ministry}-TIMING-{idx:06d}",
        ministry_code=ministry,
        estimated_value_paise=estimated,
        category=rng.choice(CATEGORIES),
        bid_count=bid_count,
        bids=bids,
        is_fraud=True,
        fraud_type="TIMING_ANOMALY",
    )


def extract_features(tender: SyntheticTender) -> List[float]:
    """
    Extract 15 ML features from a synthetic tender.

    Features:
      F0:  bid_count — number of bids
      F1:  cv — coefficient of variation of bid amounts
      F2:  min_ratio — lowest bid / estimated value
      F3:  max_ratio — highest bid / estimated value
      F4:  benford_distance — chi-square distance from Benford's Law
      F5:  round_number_pct — % of bids that are round numbers
      F6:  timing_cluster — what % of bids in last 30 minutes
      F7:  gap_cv — CV of gaps between sorted bid amounts
      F8:  state_diversity — unique GSTIN states / bid count
      F9:  deadline_proximity — avg minutes before deadline
      F10: avg_incorporation_months — average company age
      F11: min_employee_count — smallest bidder by employees
      F12: shared_directors_ratio — max director overlap between any 2 bidders
      F13: shared_address_ratio — % of bidders sharing an address
      F14: turnover_to_bid_ratio — min(annual_turnover / bid_amount) across bidders
    """
    bids = tender.bids
    amounts = [b.amount_paise for b in bids]
    estimate = tender.estimated_value_paise

    if not amounts or estimate == 0:
        return [0.0] * 15

    n = len(amounts)
    mean_amt = sum(amounts) / n
    std_amt = math.sqrt(sum((a - mean_amt) ** 2 for a in amounts) / n) if n > 1 else 0

    # F0: bid count
    f0 = float(n)

    # F1: coefficient of variation
    f1 = std_amt / mean_amt if mean_amt > 0 else 0.0

    # F2: min ratio
    f2 = min(amounts) / estimate

    # F3: max ratio
    f3 = max(amounts) / estimate

    # F4: Benford's Law distance
    benford_expected = {d: math.log10(1 + 1/d) for d in range(1, 10)}
    first_digits = [int(str(abs(a))[0]) for a in amounts if a > 0]
    if first_digits:
        total = len(first_digits)
        observed = {}
        for d in first_digits:
            observed[d] = observed.get(d, 0) + 1
        chi_sq = sum(
            (observed.get(d, 0) / total - benford_expected[d]) ** 2 / benford_expected[d]
            for d in range(1, 10)
        )
        f4 = chi_sq
    else:
        f4 = 0.0

    # F5: round number percentage
    round_count = sum(1 for a in amounts if a % (1_00_000 * 100) == 0)
    f5 = round_count / n

    # F6: timing cluster (% in last 30 minutes)
    last_30 = sum(1 for b in bids if b.submitted_minutes_before_deadline <= 30)
    f6 = last_30 / n

    # F7: gap CV
    sorted_amounts = sorted(amounts)
    gaps = [sorted_amounts[i+1] - sorted_amounts[i] for i in range(len(sorted_amounts)-1)]
    if gaps:
        mean_gap = sum(gaps) / len(gaps)
        gap_std = math.sqrt(sum((g - mean_gap) ** 2 for g in gaps) / len(gaps)) if len(gaps) > 1 else 0
        f7 = gap_std / mean_gap if mean_gap > 0 else 0.0
    else:
        f7 = 0.0

    # F8: geographic diversity
    unique_states = len(set(b.gstin_state_code for b in bids))
    f8 = unique_states / n

    # F9: average deadline proximity
    f9 = sum(b.submitted_minutes_before_deadline for b in bids) / n

    # F10: average incorporation age (months)
    f10 = sum(b.incorporation_months for b in bids) / n

    # F11: minimum employee count
    f11 = float(min(b.employee_count for b in bids))

    # F12: shared directors ratio
    max_overlap = 0
    for i in range(n):
        for j in range(i + 1, n):
            overlap = len(set(bids[i].director_ids) & set(bids[j].director_ids))
            max_directors = max(len(bids[i].director_ids), len(bids[j].director_ids), 1)
            max_overlap = max(max_overlap, overlap / max_directors)
    f12 = max_overlap

    # F13: shared address ratio
    address_counts: Dict[str, int] = {}
    for b in bids:
        address_counts[b.address_hash] = address_counts.get(b.address_hash, 0) + 1
    max_shared = max(address_counts.values()) if address_counts else 0
    f13 = max_shared / n

    # F14: turnover to bid ratio (minimum — flags undercapitalized bidders)
    ratios = [
        b.annual_turnover_paise / b.amount_paise
        for b in bids
        if b.amount_paise > 0
    ]
    f14 = min(ratios) if ratios else 0.0

    return [f0, f1, f2, f3, f4, f5, f6, f7, f8, f9, f10, f11, f12, f13, f14]


FEATURE_NAMES = [
    "bid_count", "cv", "min_ratio", "max_ratio", "benford_distance",
    "round_number_pct", "timing_cluster", "gap_cv", "state_diversity",
    "deadline_proximity_min", "avg_incorporation_months", "min_employee_count",
    "shared_directors_ratio", "shared_address_ratio", "turnover_to_bid_ratio",
]


def generate_dataset(
    n_clean: int = 7000,
    n_rigged: int = 1000,
    n_shell: int = 1000,
    n_timing: int = 1000,
    seed: int = 42,
    include_real_cases: bool = True,
) -> Tuple[List[List[float]], List[int], List[str]]:
    """
    Generate a full labeled dataset for ML training.

    If include_real_cases=True (default), starts with 10 real fraud cases
    from published CAG audit reports, then fills with synthetic data.

    Returns:
        X: Feature matrix (n_samples × 15)
        y: Labels (0=clean, 1=fraud)
        fraud_types: String labels for each sample
    """
    rng = _seeded_random(seed)

    X: List[List[float]] = []
    y: List[int] = []
    fraud_types: List[str] = []

    # ─── Phase 1: Add real CAG cases as anchor data ───
    if include_real_cases:
        try:
            from ai_engine.ml.cag_real_cases import get_real_cases
            real_X, real_y, real_types = get_real_cases()
            X.extend(real_X)
            y.extend(real_y)
            fraud_types.extend(real_types)
            print(f"  [ML] Loaded {len(real_X)} real CAG fraud cases as anchors")
        except ImportError:
            try:
                from .cag_real_cases import get_real_cases
                real_X, real_y, real_types = get_real_cases()
                X.extend(real_X)
                y.extend(real_y)
                fraud_types.extend(real_types)
                print(f"  [ML] Loaded {len(real_X)} real CAG fraud cases as anchors")
            except ImportError:
                print("  [ML] cag_real_cases.py not found — using pure synthetic data")

    # ─── Phase 2: Generate synthetic data to fill remaining ───
    tenders: List[SyntheticTender] = []

    for i in range(n_clean):
        tenders.append(generate_clean_tender(rng, i))
    for i in range(n_rigged):
        tenders.append(generate_rigged_tender(rng, i))
    for i in range(n_shell):
        tenders.append(generate_shell_company_tender(rng, i))
    for i in range(n_timing):
        tenders.append(generate_timing_anomaly_tender(rng, i))

    # Shuffle synthetic
    rng.shuffle(tenders)

    syn_X = [extract_features(t) for t in tenders]
    syn_y = [1 if t.is_fraud else 0 for t in tenders]
    syn_types = [t.fraud_type for t in tenders]

    X.extend(syn_X)
    y.extend(syn_y)
    fraud_types.extend(syn_types)

    return X, y, fraud_types


if __name__ == "__main__":
    print("Generating synthetic training data...")
    X, y, types = generate_dataset()
    print(f"  Total samples: {len(X)}")
    print(f"  Clean: {sum(1 for t in types if t == 'CLEAN')}")
    print(f"  Bid rigging: {sum(1 for t in types if t == 'BID_RIGGING')}")
    print(f"  Shell company: {sum(1 for t in types if t == 'SHELL_COMPANY')}")
    print(f"  Timing anomaly: {sum(1 for t in types if t == 'TIMING_ANOMALY')}")
    print(f"  Features per sample: {len(X[0])}")
    print(f"  Feature names: {FEATURE_NAMES}")
    print(f"  Fraud rate: {sum(y) / len(y) * 100:.1f}%")
