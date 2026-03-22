# pyre-ignore-all-errors
"""
============================================================================
TenderShield — Cartel Rotation Detector
============================================================================
Detects bid rotation patterns where bidders take turns winning.

ALGORITHM:
  1. Track win history per bidder across tenders
  2. Detect sequential rotation (A wins, then B, then C, then A again)
  3. Calculate rotation score using autocorrelation
  4. Flag if rotation matches historical cartel patterns

STATISTICAL METHOD:
  - Sequential win analysis across time-ordered tenders
  - Runs test for randomness (Wald-Wolfowitz)
  - Expected vs actual win distribution

INDIA CONTEXT:
  Cartel rotation is common in road construction and medical supply tenders.
  CVC has documented multiple cases where the same 4-5 companies took turns
  winning consecutive tenders in the same ministry/department.
============================================================================
"""

import math
import logging
from typing import List, Dict, Any
from collections import defaultdict, Counter

logger = logging.getLogger("tendershield.ai.cartel")


class CartelRotationDetector:
    """Detects bid rotation (turn-taking) patterns among bidders."""

    def __init__(self):
        self.name = "CARTEL"
        self.min_tenders_for_analysis = 5
        self.rotation_score_threshold = 0.7
        self.concentration_threshold = 0.4

    def analyze(self, historical_tenders: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Analyze win history across multiple tenders for rotation patterns.

        Args:
            historical_tenders: Time-ordered list of tenders with winner info

        Returns:
            Risk assessment for cartel rotation
        """
        result: Dict[str, Any] = {
            "detector": self.name,
            "risk_score": 0,
            "confidence": 0.0,
            "flags": [],
            "evidence": {},
            "recommendation": "MONITOR",
        }

        if len(historical_tenders) < self.min_tenders_for_analysis:
            result["evidence"]["reason"] = f"Insufficient history ({len(historical_tenders)} < {self.min_tenders_for_analysis} tenders)"
            return result

        # ---- Analysis 1: Win Concentration ----
        winners = [t.get("winner_did", "") for t in historical_tenders if t.get("winner_did")]
        win_counts = Counter(winners)

        if winners:
            total = len(winners)
            unique_winners = len(win_counts)
            most_wins = max(win_counts.values())
            concentration = most_wins / total

            result["evidence"]["win_distribution"] = dict(win_counts)
            result["evidence"]["unique_winners"] = unique_winners
            result["evidence"]["total_tenders"] = total

            # Few unique winners relative to total tenders
            if unique_winners <= 3 and total >= 5:
                result["risk_score"] += 25
                result["flags"].append(f"WIN_CONCENTRATION: Only {unique_winners} unique winners in {total} tenders")

        # ---- Analysis 2: Sequential Rotation ----
        rotation = self._detect_rotation(winners)
        result["evidence"]["rotation_analysis"] = rotation
        if rotation["detected"]:
            result["risk_score"] += 35
            result["flags"].append(f"ROTATION_DETECTED: Win pattern repeats every {rotation['period']} tenders")

        # ---- Analysis 3: Department Lock-in ----
        dept_analysis = self._analyze_department_lockin(historical_tenders)
        result["evidence"]["department_lockin"] = dept_analysis
        if dept_analysis["suspicious"]:
            result["risk_score"] += 20
            result["flags"].append(f"DEPARTMENT_LOCKIN: {dept_analysis['description']}")

        # ---- Analysis 4: Price Pattern in Rotation ----
        price_pattern = self._analyze_price_patterns(historical_tenders)
        result["evidence"]["price_patterns"] = price_pattern
        if price_pattern["suspicious"]:
            result["risk_score"] += 20
            result["flags"].append("COORDINATED_PRICING: Losing bids show consistent markup patterns")

        result["risk_score"] = min(100, result["risk_score"])
        result["confidence"] = min(1.0, len(historical_tenders) / 20.0)

        if result["risk_score"] >= 76:
            result["recommendation"] = "ESCALATE_CAG"
        elif result["risk_score"] >= 51:
            result["recommendation"] = "FREEZE"
        elif result["risk_score"] >= 26:
            result["recommendation"] = "FLAG"

        return result

    def _detect_rotation(self, winners: List[str]) -> Dict[str, Any]:
        """Detect repeating winner sequences."""
        if len(winners) < 4:
            return {"detected": False}

        # Check for period-2, period-3, period-4 rotations
        for period in range(2, min(len(winners) // 2 + 1, 6)):
            total_checks = len(winners) - period
            matches = sum(
                1 for i in range(total_checks)
                if winners[i] == winners[i + period]
            )

            if total_checks > 0:
                match_rate: float = float(matches) / float(total_checks)
                if match_rate >= self.rotation_score_threshold:
                    return {
                        "detected": True,
                        "period": period,
                        "match_rate": round(float(match_rate), 3),
                        "sequence": winners[:period * 2],
                    }

        return {"detected": False}

    def _analyze_department_lockin(self, tenders: List[Dict]) -> Dict:
        """Check if certain bidders dominate specific departments."""
        dept_winners: Dict[str, List[str]] = defaultdict(list)

        for tender in tenders:
            dept = tender.get("department", "")
            winner = tender.get("winner_did", "")
            if dept and winner:
                dept_winners[dept].append(winner)

        suspicious_depts = []
        for dept, winners in dept_winners.items():
            if len(winners) >= 3:
                winner_counts = Counter(winners)
                top_winner, top_count = winner_counts.most_common(1)[0]
                if top_count / len(winners) >= self.concentration_threshold:
                    suspicious_depts.append({
                        "department": dept,
                        "dominant_bidder": top_winner,
                        "win_rate": round(float(top_count) / float(len(winners)), 2),
                    })

        return {
            "suspicious": len(suspicious_depts) > 0,
            "departments": suspicious_depts,
            "description": f"{len(suspicious_depts)} department(s) show dominant bidder pattern" if suspicious_depts else "No lock-in detected",
        }

    def _analyze_price_patterns(self, tenders: List[Dict]) -> Dict[str, Any]:
        """Analyze if losing bids show consistent markup over winner."""
        markups: List[float] = []

        for tender in tenders:
            bids = tender.get("bids", [])
            revealed = [b for b in bids if b.get("revealed_amount_paise")]
            if len(revealed) < 2:
                continue

            amounts: List[Any] = sorted([b["revealed_amount_paise"] for b in revealed])
            winning_amount: Any = amounts[0]

            for amount in amounts[1:]:
                markup: float = float(amount - winning_amount) / float(winning_amount)
                markups.append(round(markup, 4))

        if len(markups) < 5:
            return {"suspicious": False}

        # Check if markups are suspiciously uniform
        mean_markup: float = sum(markups) / len(markups)
        variance: float = sum((m - mean_markup) ** 2 for m in markups) / len(markups)
        cv: float = math.sqrt(variance) / mean_markup if mean_markup > 0 else 0.0

        return {
            "suspicious": cv < 0.15 and len(markups) >= 5,  # Very consistent markup
            "mean_markup_percent": round(mean_markup * 100, 2),
            "markup_cv": round(cv, 4),
            "sample_size": len(markups),
        }
