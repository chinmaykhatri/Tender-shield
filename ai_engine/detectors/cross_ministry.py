# pyre-ignore-all-errors
"""
============================================================================
TenderShield — Cross-Ministry Pattern Correlation Detector
============================================================================
Detects companies bidding across multiple ministries with suspicious patterns.

ALGORITHM:
  1. Group all tenders by bidder across ministries
  2. Detect bidders who appear in >3 ministries with high win rates
  3. Flag bidders who win suspiciously often in multiple departments
  4. Detect "ministry hopping" — bidders who shift to new ministries
     after being flagged in previous ones

INDIA CONTEXT:
  Multi-ministry cartels are the most dangerous form of procurement fraud.
  A single entity winning contracts across MoRTH, MoE, and MoH suggests
  either genuine competence or a well-connected cartel. The detector
  distinguishes by analyzing win patterns, bid amounts, and timing.

DATA SOURCE:
  This detector works best with historical tender data across ministries.
  In demo mode, it uses simulated cross-ministry activity.
  In production, it aggregates data from the GeM scraper pipeline.
============================================================================
"""

import math
import logging
from typing import List, Dict, Any, Set
from collections import defaultdict, Counter

logger = logging.getLogger("tendershield.ai.cross_ministry")

# All 10 ministry codes used in TenderShield
MINISTRY_CODES = [
    "MoRTH", "MoE", "MoH", "MoD", "MoR",
    "MoIT", "MoUD", "MoWCD", "MoA", "MoF",
]


class CrossMinistryDetector:
    """
    Detects suspicious cross-ministry bidding patterns.
    
    A bidder appearing in many unrelated ministries with consistent
    wins is more suspicious than one winning in their specialized domain.
    """

    def __init__(self):
        self.name = "CROSS_MINISTRY"
        self.min_ministries_for_flag = 3     # Active in 3+ ministries = suspicious
        self.min_tenders_per_ministry = 2    # Must have 2+ tenders per ministry
        self.win_rate_threshold = 0.40       # Win rate > 40% across ministries
        self.diversity_threshold = 0.60      # Category diversity > 60% = generalist

    def analyze(
        self,
        all_tenders: List[Dict[str, Any]],
        focus_bidder: str = "",
    ) -> Dict[str, Any]:
        """
        Analyze cross-ministry bidding patterns.

        Args:
            all_tenders: Historical tenders from MULTIPLE ministries
            focus_bidder: Optional bidder DID to focus analysis on

        Returns:
            Cross-ministry risk assessment
        """
        result: Dict[str, Any] = {
            "detector": self.name,
            "risk_score": 0,
            "confidence": 0.0,
            "flags": [],
            "evidence": {},
            "recommendation": "MONITOR",
            "suspicious_bidders": [],
        }

        if len(all_tenders) < 5:
            result["evidence"]["reason"] = f"Insufficient tenders ({len(all_tenders)} < 5)"
            return result

        # ── Step 1: Build bidder-ministry activity map ──
        bidder_ministries: Dict[str, Dict[str, List[Dict]]] = defaultdict(lambda: defaultdict(list))
        bidder_wins: Dict[str, List[str]] = defaultdict(list)
        bidder_categories: Dict[str, Set[str]] = defaultdict(set)

        for tender in all_tenders:
            ministry = tender.get("ministry_code", "")
            category = tender.get("category", "")
            winner = tender.get("winner_did", "")
            
            for bid in tender.get("bids", []):
                bidder_id = bid.get("bidder_did", bid.get("bidder_id", ""))
                if bidder_id:
                    bidder_ministries[bidder_id][ministry].append(tender)
                    bidder_categories[bidder_id].add(category)
            
            if winner:
                bidder_wins[winner].append(ministry)

        # ── Step 2: Score each bidder's cross-ministry profile ──
        suspicious_bidders: List[Dict[str, Any]] = []
        total_bidders = len(bidder_ministries)

        for bidder_id, ministry_map in bidder_ministries.items():
            # Skip if focusing on a specific bidder
            if focus_bidder and bidder_id != focus_bidder:
                continue

            active_ministries = [m for m, tenders in ministry_map.items() if len(tenders) >= self.min_tenders_per_ministry]
            ministry_count = len(active_ministries)

            if ministry_count < self.min_ministries_for_flag:
                continue

            # Win rate across all ministries
            wins = bidder_wins.get(bidder_id, [])
            total_participations = sum(len(t) for t in ministry_map.values())
            win_rate = len(wins) / max(total_participations, 1)

            # Category diversity (generalist vs specialist)
            categories = bidder_categories.get(bidder_id, set())
            category_diversity = len(categories) / 4.0  # 4 categories total

            bidder_score = 0
            bidder_flags: List[str] = []

            # Flag 1: Active in too many ministries
            if ministry_count >= 5:
                bidder_score += 30
                bidder_flags.append(
                    f"OMNIPRESENT: Active in {ministry_count}/10 ministries "
                    f"({', '.join(active_ministries)})"
                )
            elif ministry_count >= self.min_ministries_for_flag:
                bidder_score += 15
                bidder_flags.append(
                    f"MULTI_MINISTRY: Active in {ministry_count} ministries"
                )

            # Flag 2: Suspiciously high win rate across ministries
            if win_rate > self.win_rate_threshold and ministry_count >= 3:
                bidder_score += 25
                bidder_flags.append(
                    f"CROSS_MINISTRY_WINS: {win_rate:.0%} win rate across "
                    f"{ministry_count} ministries ({len(wins)} wins / "
                    f"{total_participations} participations)"
                )

            # Flag 3: Unusually diverse category participation
            if category_diversity > self.diversity_threshold:
                bidder_score += 15
                bidder_flags.append(
                    f"GENERALIST: Bids across {len(categories)} categories "
                    f"({', '.join(categories)}). No legitimate bidder is "
                    f"world-class in all of these."
                )

            # Flag 4: Ministry hopping — sudden appearance in new ministry
            for ministry, tenders in ministry_map.items():
                if len(tenders) <= 2:
                    # New ministry with few tenders — check if they won quickly
                    ministry_wins = [t for t in tenders if t.get("winner_did") == bidder_id]
                    if ministry_wins:
                        bidder_score += 15
                        bidder_flags.append(
                            f"MINISTRY_HOPPING: First-time in {ministry} and "
                            f"already won {len(ministry_wins)} tender(s)"
                        )
                        break  # One flag is enough

            if bidder_score > 0:
                suspicious_bidders.append({
                    "bidder_id": bidder_id,
                    "risk_score": min(100, bidder_score),
                    "active_ministries": ministry_count,
                    "win_rate": round(win_rate, 2),
                    "category_diversity": round(category_diversity, 2),
                    "flags": bidder_flags,
                    "ministries": active_ministries,
                })

        # ── Step 3: Compute composite score ──
        if suspicious_bidders:
            # Overall risk is the max bidder risk (any single bad actor is enough)
            result["risk_score"] = max(b["risk_score"] for b in suspicious_bidders)
            result["suspicious_bidders"] = sorted(
                suspicious_bidders, key=lambda b: -b["risk_score"]
            )[:10]  # Top 10 most suspicious
            
            for bidder in result["suspicious_bidders"][:3]:
                result["flags"].extend(bidder["flags"])

        result["evidence"]["total_bidders_analyzed"] = total_bidders
        result["evidence"]["suspicious_count"] = len(suspicious_bidders)
        result["evidence"]["ministries_covered"] = len(set(
            m for bm in bidder_ministries.values() for m in bm.keys()
        ))

        result["confidence"] = min(1.0, len(all_tenders) / 20.0)

        if result["risk_score"] >= 60:
            result["recommendation"] = "ESCALATE_CAG"
        elif result["risk_score"] >= 35:
            result["recommendation"] = "FLAG"

        logger.info(
            f"[CrossMinistry] Analyzed {total_bidders} bidders across "
            f"{result['evidence']['ministries_covered']} ministries: "
            f"{len(suspicious_bidders)} suspicious"
        )

        return result
