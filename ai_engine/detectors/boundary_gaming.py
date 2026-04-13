# pyre-ignore-all-errors
"""
============================================================================
TenderShield — Boundary Gaming Detector (Anti-Gaming Checksum)
============================================================================
Detects bids that cluster suspiciously close to detection thresholds.

INSIGHT: A cartel that knows the CV threshold is ~5% will submit bids
with 5-8% CV — "safe" enough to avoid detection, but unnaturally precise.
This detector treats "suspiciously safe" distributions as a POSITIVE signal.

ALGORITHM:
  1. Compute the bid distribution's CV
  2. Measure distance from the current dynamic threshold
  3. If CV falls in the "gaming zone" (5-15% above threshold) → flag
  4. Check if bid gaps are too uniform (sign of calculated spacing)
  5. Apply meta-scoring: clustering AT the boundary IS the signal

META-PRINCIPLE:
  When cartels reverse-engineer detection thresholds and engineer bids
  to "just-barely-pass", the act of avoidance creates a NEW signal.
  This turns threshold-gaming into a trap — the harder they try to
  dodge detection, the more detectable they become.

INDIA CONTEXT:
  CVC documented cases where cartels hired consultants to reverse-engineer
  bid-rigging detection. This detector is the counter-countermeasure.
============================================================================
"""

import math
import logging
from typing import List, Dict, Any

logger = logging.getLogger("tendershield.ai.boundary_gaming")


class BoundaryGamingDetector:
    """
    Detects anti-gaming patterns: bids engineered to just-barely-pass detection.

    This is a *meta-detector* — it doesn't look at the bids themselves,
    but at the relationship between bid distributions and detection boundaries.
    """

    def __init__(self):
        self.name = "BOUNDARY_GAMING"
        # Gaming zone: bids 5-20% above the threshold are suspect
        self.gaming_zone_min_ratio = 0.05   # 5% above threshold
        self.gaming_zone_max_ratio = 0.20   # 20% above threshold
        # Gap uniformity: natural bids have messy gaps; engineered bids are uniform
        self.gap_uniformity_threshold = 0.15  # CV of gaps < 0.15 = suspiciously uniform
        # Amount precision: real bids tend to be round; engineered bids avoid this
        self.min_bids_for_round_check = 5

    def analyze(
        self,
        bids: List[Dict[str, Any]],
        tender: Dict[str, Any],
        cv_threshold: float = 0.05,
    ) -> Dict[str, Any]:
        """
        Analyze bid distribution for boundary gaming patterns.

        Args:
            bids: List of bid dicts with revealed_amount_paise
            tender: Tender metadata
            cv_threshold: The current dynamic CV threshold for this tender

        Returns:
            Risk assessment for boundary gaming
        """
        result: Dict[str, Any] = {
            "detector": self.name,
            "risk_score": 0,
            "confidence": 0.0,
            "flags": [],
            "evidence": {},
            "recommendation": "MONITOR",
        }

        amounts = [
            b.get("revealed_amount_paise", 0)
            for b in bids
            if b.get("revealed_amount_paise")
        ]
        if len(amounts) < 3:
            result["evidence"]["reason"] = f"Insufficient bids ({len(amounts)} < 3)"
            return result

        # ── Test 1: CV proximity to detection threshold ──
        mean_amt = sum(amounts) / len(amounts)
        variance = sum((x - mean_amt) ** 2 for x in amounts) / len(amounts)
        std_dev = math.sqrt(variance)
        cv = std_dev / mean_amt if mean_amt > 0 else 0

        distance_ratio = (cv - cv_threshold) / cv_threshold if cv_threshold > 0 else 0

        result["evidence"]["cv"] = round(cv, 4)
        result["evidence"]["cv_threshold_used"] = round(cv_threshold, 4)
        result["evidence"]["distance_from_threshold"] = round(distance_ratio, 4)

        # Gaming zone: CV is 5-20% above the detection threshold
        in_gaming_zone = (
            self.gaming_zone_min_ratio < distance_ratio < self.gaming_zone_max_ratio
        )
        result["evidence"]["gaming_zone"] = in_gaming_zone

        if in_gaming_zone:
            result["risk_score"] += 30
            result["flags"].append(
                f"THRESHOLD_GAMING: Bid CV={cv:.4f} is {distance_ratio * 100:.1f}% "
                f"above detection boundary ({cv_threshold:.4f}). "
                f"This precision is unlikely by chance."
            )

        # ── Test 2: Unnaturally uniform bid spacing ──
        sorted_amounts = sorted(amounts)
        gaps = [
            sorted_amounts[i + 1] - sorted_amounts[i]
            for i in range(len(sorted_amounts) - 1)
        ]

        if gaps:
            mean_gap = sum(gaps) / len(gaps)
            gap_variance = (
                sum((g - mean_gap) ** 2 for g in gaps) / len(gaps) if len(gaps) > 1 else 0
            )
            gap_cv = math.sqrt(gap_variance) / mean_gap if mean_gap > 0 else 0

            result["evidence"]["gap_cv"] = round(gap_cv, 4)
            result["evidence"]["gap_uniformity"] = (
                "ENGINEERED" if gap_cv < self.gap_uniformity_threshold else "NATURAL"
            )
            result["evidence"]["mean_gap_cr"] = round(mean_gap / 1_00_00_00_000, 2)

            if gap_cv < self.gap_uniformity_threshold and len(gaps) >= 2:
                result["risk_score"] += 25
                result["flags"].append(
                    f"CALCULATED_SPACING: Bid gaps have CV={gap_cv:.4f} — "
                    f"unnaturally uniform. Natural bids show messy, random spacing."
                )

        # ── Test 3: Round-number avoidance ──
        # Natural bids tend to be round numbers (~20-30%). If a large set
        # has 0% round numbers, someone may be deliberately avoiding them.
        round_count = sum(1 for a in amounts if a % (1_00_000 * 100) == 0)
        round_pct = round_count / len(amounts)
        result["evidence"]["round_number_pct"] = round(round_pct * 100, 1)

        if len(amounts) >= self.min_bids_for_round_check and round_pct == 0:
            result["risk_score"] += 15
            result["flags"].append(
                f"ROUND_AVOIDANCE: Zero round numbers in {len(amounts)} bids. "
                f"Natural procurement bids are ~20-30% round. "
                f"This absence suggests deliberate concealment."
            )

        # ── Test 4: Submission timing regularity ──
        # If bids arrive at perfectly regular intervals, it's coordination
        timings = [
            b.get("submitted_minutes_before_deadline", 0)
            for b in bids
            if b.get("submitted_minutes_before_deadline")
        ]
        if len(timings) >= 3:
            sorted_timings = sorted(timings)
            timing_diffs = [
                sorted_timings[i + 1] - sorted_timings[i]
                for i in range(len(sorted_timings) - 1)
            ]
            if timing_diffs:
                mean_diff = sum(timing_diffs) / len(timing_diffs)
                timing_variance = (
                    sum((d - mean_diff) ** 2 for d in timing_diffs) / len(timing_diffs)
                )
                timing_cv = (
                    math.sqrt(timing_variance) / mean_diff if mean_diff > 0 else 0
                )

                result["evidence"]["timing_interval_cv"] = round(timing_cv, 4)
                result["evidence"]["mean_interval_minutes"] = round(mean_diff, 1)

                # Regular intervals (CV < 0.2) with short gaps (< 5 min each)
                if timing_cv < 0.2 and mean_diff < 5:
                    result["risk_score"] += 15
                    result["flags"].append(
                        f"TIMED_SUBMISSION: Bids arrive at regular "
                        f"{mean_diff:.1f}-minute intervals (CV={timing_cv:.3f}). "
                        f"This suggests coordinated, scripted submission."
                    )

        # ── Test 5: Convergence check (gaming zone + uniform gaps) ──
        # When BOTH gaming-zone AND gap-uniformity fire, confidence soars
        if in_gaming_zone and result["evidence"].get("gap_uniformity") == "ENGINEERED":
            result["risk_score"] += 15
            result["flags"].append(
                "GAMING_CONVERGENCE: Both threshold proximity AND bid gap uniformity "
                "are suspicious. This combination is extremely rare in legitimate tenders."
            )

        result["risk_score"] = min(100, result["risk_score"])
        result["confidence"] = min(1.0, len(amounts) / 8.0)

        if result["risk_score"] >= 60:
            result["recommendation"] = "ESCALATE_CAG"
        elif result["risk_score"] >= 35:
            result["recommendation"] = "FLAG"

        logger.info(
            f"[BoundaryGaming] Tender {tender.get('tender_id')}: "
            f"score={result['risk_score']}, "
            f"gaming_zone={in_gaming_zone}, "
            f"gap_uniformity={result['evidence'].get('gap_uniformity', 'N/A')}"
        )

        return result
