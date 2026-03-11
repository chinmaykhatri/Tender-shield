"""
============================================================================
TenderShield — Composite Risk Scorer
============================================================================
Combines outputs from all 5 fraud detectors into a single risk score.

SCORING ALGORITHM:
  Each detector produces a score (0-100). The composite score is a
  weighted average, with additional bonuses for multiple detectors
  flagging the same tender (convergence bonus).

WEIGHTS:
  Bid Rigging:      30%  (strongest statistical indicator)
  Collusion Graph:  25%  (network analysis is powerful)
  Shell Company:    20%  (entity-level verification)
  Cartel Rotation:  15%  (requires historical data)
  Timing Anomaly:   10%  (weakest standalone indicator)

CONVERGENCE BONUS:
  +5 if 2 detectors flag HIGH
  +10 if 3+ detectors flag HIGH
  +15 if 4+ detectors flag HIGH (almost certainly fraud)

ACTION THRESHOLDS:
  0-25:   MONITOR    — Log and continue
  26-50:  FLAG       — Notify auditor
  51-75:  FREEZE     — Auto-freeze tender
  76-100: ESCALATE   — Escalate to CAG
============================================================================
"""

import logging
from typing import List, Dict, Any
from datetime import datetime, timezone, timedelta

from ai_engine.detectors.bid_rigging import BidRiggingDetector
from ai_engine.detectors.collusion_graph import CollusionGraphDetector
from ai_engine.detectors.shell_company import ShellCompanyDetector
from ai_engine.detectors.cartel_rotation import CartelRotationDetector
from ai_engine.detectors.timing_anomaly import TimingAnomalyDetector

logger = logging.getLogger("tendershield.ai.risk_scorer")
IST = timezone(timedelta(hours=5, minutes=30))


class CompositeRiskScorer:
    """
    Aggregates all 5 fraud detector outputs into a composite risk score.
    Implements convergence bonus for multi-detector agreement.
    """

    def __init__(self):
        self.detectors = {
            "BID_RIGGING": {"instance": BidRiggingDetector(), "weight": 0.30},
            "COLLUSION": {"instance": CollusionGraphDetector(), "weight": 0.25},
            "SHELL_COMPANY": {"instance": ShellCompanyDetector(), "weight": 0.20},
            "CARTEL": {"instance": CartelRotationDetector(), "weight": 0.15},
            "TIMING_ANOMALY": {"instance": TimingAnomalyDetector(), "weight": 0.10},
        }

        # Action thresholds
        self.thresholds = {
            "MONITOR": (0, 25),
            "FLAG": (26, 50),
            "FREEZE": (51, 75),
            "ESCALATE_CAG": (76, 100),
        }

    def score_tender(
        self,
        tender: Dict[str, Any],
        bids: List[Dict[str, Any]],
        historical_tenders: List[Dict[str, Any]] = None,
        bidder_profiles: List[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Run all 5 detectors and produce a composite risk assessment.

        Args:
            tender: Current tender data
            bids: All bids for this tender
            historical_tenders: Past tenders for pattern analysis
            bidder_profiles: Bidder entity data for shell company checks

        Returns:
            Composite risk assessment with per-detector breakdowns
        """
        now = datetime.now(IST).strftime("%Y-%m-%dT%H:%M:%S+05:30")

        result = {
            "tender_id": tender.get("tender_id", ""),
            "composite_risk_score": 0,
            "recommended_action": "MONITOR",
            "detector_results": {},
            "flags": [],
            "convergence_bonus": 0,
            "analyzed_at_ist": now,
            "detectors_run": 0,
        }

        detector_scores = {}
        high_score_count = 0

        # ---- Run Detector 1: Bid Rigging ----
        if bids and len(bids) >= 2:
            br_result = self.detectors["BID_RIGGING"]["instance"].analyze(bids, tender)
            result["detector_results"]["BID_RIGGING"] = br_result
            detector_scores["BID_RIGGING"] = br_result["risk_score"]
            result["flags"].extend(br_result.get("flags", []))
            result["detectors_run"] += 1
            if br_result["risk_score"] >= 50:
                high_score_count += 1

        # ---- Run Detector 2: Collusion Graph ----
        if historical_tenders and len(historical_tenders) >= 3:
            cg_result = self.detectors["COLLUSION"]["instance"].analyze(historical_tenders)
            result["detector_results"]["COLLUSION"] = cg_result
            detector_scores["COLLUSION"] = cg_result["risk_score"]
            result["flags"].extend(cg_result.get("flags", []))
            result["detectors_run"] += 1
            if cg_result["risk_score"] >= 50:
                high_score_count += 1

        # ---- Run Detector 3: Shell Company ----
        if bidder_profiles:
            shell_scores = []
            for profile in bidder_profiles:
                sc_result = self.detectors["SHELL_COMPANY"]["instance"].analyze(profile, tender)
                shell_scores.append(sc_result["risk_score"])
                result["flags"].extend(sc_result.get("flags", []))

            if shell_scores:
                max_shell_score = max(shell_scores)
                result["detector_results"]["SHELL_COMPANY"] = {
                    "risk_score": max_shell_score,
                    "bidders_analyzed": len(bidder_profiles),
                    "max_score": max_shell_score,
                }
                detector_scores["SHELL_COMPANY"] = max_shell_score
                result["detectors_run"] += 1
                if max_shell_score >= 50:
                    high_score_count += 1

        # ---- Run Detector 4: Cartel Rotation ----
        if historical_tenders and len(historical_tenders) >= 5:
            cr_result = self.detectors["CARTEL"]["instance"].analyze(historical_tenders)
            result["detector_results"]["CARTEL"] = cr_result
            detector_scores["CARTEL"] = cr_result["risk_score"]
            result["flags"].extend(cr_result.get("flags", []))
            result["detectors_run"] += 1
            if cr_result["risk_score"] >= 50:
                high_score_count += 1

        # ---- Run Detector 5: Timing Anomaly ----
        if bids and len(bids) >= 2:
            ta_result = self.detectors["TIMING_ANOMALY"]["instance"].analyze(bids, tender)
            result["detector_results"]["TIMING_ANOMALY"] = ta_result
            detector_scores["TIMING_ANOMALY"] = ta_result["risk_score"]
            result["flags"].extend(ta_result.get("flags", []))
            result["detectors_run"] += 1
            if ta_result["risk_score"] >= 50:
                high_score_count += 1

        # ---- Calculate Weighted Composite Score ----
        weighted_sum = 0
        total_weight = 0

        for detector_name, score in detector_scores.items():
            weight = self.detectors[detector_name]["weight"]
            weighted_sum += score * weight
            total_weight += weight

        if total_weight > 0:
            result["composite_risk_score"] = int(weighted_sum / total_weight)

        # ---- Apply Convergence Bonus ----
        if high_score_count >= 4:
            result["convergence_bonus"] = 15
        elif high_score_count >= 3:
            result["convergence_bonus"] = 10
        elif high_score_count >= 2:
            result["convergence_bonus"] = 5

        result["composite_risk_score"] = min(100, result["composite_risk_score"] + result["convergence_bonus"])

        # ---- Determine Action ----
        score = result["composite_risk_score"]
        if score >= 76:
            result["recommended_action"] = "ESCALATE_CAG"
        elif score >= 51:
            result["recommended_action"] = "FREEZE"
        elif score >= 26:
            result["recommended_action"] = "FLAG"
        else:
            result["recommended_action"] = "MONITOR"

        logger.info(
            f"[RiskScorer] Tender {tender.get('tender_id')}: "
            f"score={result['composite_risk_score']}, action={result['recommended_action']}, "
            f"detectors={result['detectors_run']}, convergence={result['convergence_bonus']}"
        )

        return result

    def get_detector_weights(self) -> Dict[str, float]:
        """Return the current detector weights for transparency."""
        return {name: d["weight"] for name, d in self.detectors.items()}

    def get_action_thresholds(self) -> Dict[str, tuple]:
        """Return the action thresholds for documentation."""
        return self.thresholds
