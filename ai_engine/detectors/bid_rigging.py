"""
============================================================================
TenderShield — Bid Rigging Detector
============================================================================
Detects bid rigging patterns in government procurement tenders.

ALGORITHM: Statistical analysis of bid distributions.
Bid rigging exhibits telltale patterns:
  1. Cover Bidding — intentionally high bids to let a chosen bidder win
  2. Bid Suppression — fewer bids than expected for tender size
  3. Complementary Bidding — bids cluster suspiciously close together
  4. Bid Rotation — same bidders win in predictable order

STATISTICAL METHODS:
  - Coefficient of Variation (CV) — low CV means bids are suspiciously similar
  - Benford's Law — first-digit distribution should follow natural log pattern
  - Z-Score — outlier detection for cover bids
  - Herfindahl-Hirschman Index (HHI) — market concentration

INDIA CONTEXT:
  CVC Guidelines mandate investigation when bid variance is unusually low.
  This detector flags tenders where the bid spread is < 5% of mean.
============================================================================
"""

import math
import logging
from typing import List, Dict, Any, Optional
from collections import Counter

logger = logging.getLogger("tendershield.ai.bid_rigging")


class BidRiggingDetector:
    """
    Detects bid rigging patterns using statistical analysis.
    Runs on every tender that enters the evaluation phase.
    """

    def __init__(self):
        self.name = "BID_RIGGING"
        # Thresholds calibrated for Indian government procurement
        self.cv_threshold = 0.05      # CV < 5% = suspiciously similar bids
        self.min_bids_for_analysis = 3
        self.cover_bid_z_threshold = 2.5  # Z-score > 2.5 = likely cover bid
        self.benford_threshold = 0.25     # Chi-square distance from Benford's law

    def analyze(self, bids: List[Dict[str, Any]], tender: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analyze bid distribution for a tender.
        Returns risk score (0-100) and evidence.
        """
        result = {
            "detector": self.name,
            "risk_score": 0,
            "confidence": 0.0,
            "flags": [],
            "evidence": {},
            "recommendation": "MONITOR",
        }

        amounts = [b.get("revealed_amount_paise", 0) for b in bids if b.get("revealed_amount_paise")]
        if len(amounts) < self.min_bids_for_analysis:
            result["evidence"]["reason"] = f"Insufficient bids for analysis ({len(amounts)} < {self.min_bids_for_analysis})"
            return result

        # ---- Test 1: Coefficient of Variation (CV) ----
        cv_result = self._check_coefficient_of_variation(amounts)
        result["evidence"]["cv_analysis"] = cv_result
        if cv_result["suspicious"]:
            result["risk_score"] += 30
            result["flags"].append("LOW_BID_VARIANCE: Bids are suspiciously similar (CV={:.3f})".format(cv_result["cv"]))

        # ---- Test 2: Cover Bid Detection (Z-Score) ----
        cover_bids = self._detect_cover_bids(amounts, bids)
        result["evidence"]["cover_bids"] = cover_bids
        if cover_bids["detected"]:
            result["risk_score"] += 25
            result["flags"].append(f"COVER_BIDS: {cover_bids['count']} intentionally high bids detected")

        # ---- Test 3: Benford's Law ----
        benford_result = self._check_benfords_law(amounts)
        result["evidence"]["benfords_law"] = benford_result
        if benford_result["suspicious"]:
            result["risk_score"] += 20
            result["flags"].append("BENFORDS_LAW_VIOLATION: First-digit distribution is unnatural")

        # ---- Test 4: Round Number Analysis ----
        round_result = self._check_round_numbers(amounts)
        result["evidence"]["round_numbers"] = round_result
        if round_result["suspicious"]:
            result["risk_score"] += 15
            result["flags"].append(f"ROUND_NUMBERS: {round_result['percentage']:.0f}% of bids are round numbers")

        # ---- Test 5: Bid Gap Analysis ----
        gap_result = self._check_bid_gaps(amounts, tender)
        result["evidence"]["bid_gaps"] = gap_result
        if gap_result["suspicious"]:
            result["risk_score"] += 10
            result["flags"].append("UNIFORM_GAPS: Bid amounts have suspiciously uniform spacing")

        # Clamp to 0-100
        result["risk_score"] = min(100, result["risk_score"])
        result["confidence"] = min(1.0, len(amounts) / 10.0)

        # Set recommendation
        if result["risk_score"] >= 76:
            result["recommendation"] = "ESCALATE_CAG"
        elif result["risk_score"] >= 51:
            result["recommendation"] = "FREEZE"
        elif result["risk_score"] >= 26:
            result["recommendation"] = "FLAG"

        logger.info(f"[BidRigging] Tender {tender.get('tender_id')}: score={result['risk_score']}, flags={len(result['flags'])}")
        return result

    def _check_coefficient_of_variation(self, amounts: List[int]) -> Dict:
        """CV = std_dev / mean. Low CV means bids are too similar."""
        mean = sum(amounts) / len(amounts)
        variance = sum((x - mean) ** 2 for x in amounts) / len(amounts)
        std_dev = math.sqrt(variance)
        cv = std_dev / mean if mean > 0 else 0

        return {
            "cv": round(cv, 4),
            "mean_paise": int(mean),
            "std_dev_paise": int(std_dev),
            "suspicious": cv < self.cv_threshold and len(amounts) >= 3,
            "threshold": self.cv_threshold,
        }

    def _detect_cover_bids(self, amounts: List[int], bids: List[Dict]) -> Dict:
        """Detect intentionally high 'cover' bids using Z-scores."""
        if len(amounts) < 3:
            return {"detected": False, "count": 0, "bidders": []}

        mean = sum(amounts) / len(amounts)
        variance = sum((x - mean) ** 2 for x in amounts) / len(amounts)
        std_dev = math.sqrt(variance) if variance > 0 else 1

        cover_bidders = []
        for bid, amount in zip(bids, amounts):
            z_score = (amount - mean) / std_dev if std_dev > 0 else 0
            if z_score > self.cover_bid_z_threshold:
                cover_bidders.append({
                    "bidder_did": bid.get("bidder_did", "unknown"),
                    "z_score": round(z_score, 2),
                    "amount_paise": amount,
                })

        return {
            "detected": len(cover_bidders) > 0,
            "count": len(cover_bidders),
            "bidders": cover_bidders,
        }

    def _check_benfords_law(self, amounts: List[int]) -> Dict:
        """Check if first-digit distribution follows Benford's Law."""
        # Expected distribution per Benford's Law
        benford_expected = {d: math.log10(1 + 1/d) for d in range(1, 10)}

        first_digits = [int(str(abs(a))[0]) for a in amounts if a > 0]
        if not first_digits:
            return {"suspicious": False, "chi_square": 0}

        observed = Counter(first_digits)
        total = len(first_digits)

        chi_square = 0
        for d in range(1, 10):
            expected = benford_expected[d] * total
            actual = observed.get(d, 0)
            if expected > 0:
                chi_square += (actual - expected) ** 2 / expected

        return {
            "suspicious": chi_square > self.benford_threshold * total,
            "chi_square": round(chi_square, 4),
            "first_digit_distribution": dict(observed),
        }

    def _check_round_numbers(self, amounts: List[int]) -> Dict:
        """Check if too many bids are round numbers (sign of fabrication)."""
        round_count = sum(1 for a in amounts if a % (1_00_000 * 100) == 0)  # Divisible by ₹1 lakh
        percentage = (round_count / len(amounts)) * 100

        return {
            "suspicious": percentage > 60 and len(amounts) >= 3,
            "round_count": round_count,
            "total": len(amounts),
            "percentage": percentage,
        }

    def _check_bid_gaps(self, amounts: List[int], tender: Dict) -> Dict:
        """Check for uniform gaps between bids (sign of coordinated bidding)."""
        sorted_amounts = sorted(amounts)
        gaps = [sorted_amounts[i+1] - sorted_amounts[i] for i in range(len(sorted_amounts)-1)]

        if not gaps:
            return {"suspicious": False}

        mean_gap = sum(gaps) / len(gaps)
        variance = sum((g - mean_gap) ** 2 for g in gaps) / len(gaps) if len(gaps) > 1 else 0
        cv_gaps = math.sqrt(variance) / mean_gap if mean_gap > 0 else 0

        return {
            "suspicious": cv_gaps < 0.1 and len(gaps) >= 2,  # Very uniform gaps
            "gap_cv": round(cv_gaps, 4),
            "mean_gap_paise": int(mean_gap),
        }
