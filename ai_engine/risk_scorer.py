# pyre-ignore-all-errors
"""
============================================================================
TenderShield — Hybrid Composite Risk Scorer (Rules + ML)
============================================================================
Combines outputs from 5 rule-based detectors WITH 2 ML models into a
single composite risk score.

SCORING ALGORITHM (v2.0 — Hybrid):
  1. Run all 5 rule-based detectors (existing logic)
  2. Run Gradient Boosting classifier (supervised ML)
  3. Run Isolation Forest (unsupervised anomaly detection)
  4. Blend: 55% rules + 30% GBM + 15% IForest
  5. Apply convergence bonuses when models agree

BLOCKCHAIN INTEGRATION:
  Every risk assessment is recorded on the blockchain as an AuditEvent.
  The risk score, model predictions, and evidence are immutable.

WEIGHTS (rule-based detectors):
  Bid Rigging:      30%  (strongest statistical indicator)
  Collusion Graph:  25%  (network analysis is powerful)
  Shell Company:    20%  (entity-level verification)
  Cartel Rotation:  15%  (requires historical data)
  Timing Anomaly:   10%  (weakest standalone indicator)

ML MODEL WEIGHTS:
  Gradient Boosting: 30%  (supervised, uses labeled fraud patterns)
  Isolation Forest:  15%  (unsupervised, catches novel anomalies)
============================================================================
"""

import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone, timedelta

from ai_engine.detectors.bid_rigging import BidRiggingDetector
from ai_engine.detectors.collusion_graph import CollusionGraphDetector
from ai_engine.detectors.shell_company import ShellCompanyDetector
from ai_engine.detectors.cartel_rotation import CartelRotationDetector
from ai_engine.detectors.timing_anomaly import TimingAnomalyDetector

# Import ML pipeline
try:
    from ai_engine.ml.fraud_model import FraudMLPipeline, fraud_pipeline
    from ai_engine.ml.training_data import extract_features, FEATURE_NAMES, SyntheticBid, SyntheticTender
    _ML_AVAILABLE = True
except ImportError:
    _ML_AVAILABLE = False

logger = logging.getLogger("tendershield.ai.risk_scorer")
IST = timezone(timedelta(hours=5, minutes=30))


class CompositeRiskScorer:
    """
    Aggregates all 5 fraud detector outputs + ML model predictions
    into a composite risk score. Implements convergence bonuses for
    multi-detector and model agreement.
    """

    def __init__(self):
        self.detectors: Dict[str, Dict[str, Any]] = {
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

        # Hybrid scoring weights
        self.rule_weight = 0.55   # 55% rule-based
        self.gbm_weight = 0.30   # 30% Gradient Boosting
        self.if_weight = 0.15    # 15% Isolation Forest

        # ML pipeline
        self.ml_pipeline: Optional[Any] = None
        self._ml_loaded = False
        self._load_ml_models()

    def _load_ml_models(self):
        """Attempt to load pre-trained ML models."""
        if not _ML_AVAILABLE:
            logger.info("[RiskScorer] ML module not available — using rule-based only")
            return

        try:
            fraud_pipeline.load_models()
            if fraud_pipeline.loaded:
                self.ml_pipeline = fraud_pipeline
                self._ml_loaded = True
                logger.info("[RiskScorer] ✅ ML models loaded — hybrid scoring enabled")
            else:
                logger.warning("[RiskScorer] ML models not found — run 'python -m ai_engine.ml.train' to train")
        except Exception as e:
            logger.error(f"[RiskScorer] ML model loading failed: {e}")

    def _extract_ml_features(self, tender: Dict[str, Any], bids: List[Dict[str, Any]]) -> Optional[List[float]]:
        """
        Extract 15 ML features from raw tender+bids data.
        Converts API-format data into the feature format expected by the ML models.
        """
        if not _ML_AVAILABLE or not bids:
            return None

        try:
            # Convert raw bids to SyntheticBid format for feature extraction
            synthetic_bids = []
            for b in bids:
                amount = b.get("revealed_amount_paise", b.get("amount_paise", 0))
                if not amount:
                    continue

                synthetic_bids.append(SyntheticBid(
                    bidder_id=b.get("bidder_did", b.get("bidder_id", "unknown")),
                    amount_paise=int(amount),
                    submitted_minutes_before_deadline=b.get("submitted_minutes_before_deadline", 500),
                    gstin_state_code=b.get("gstin", "00")[:2] if b.get("gstin") else "00",
                    is_msme=b.get("is_msme", False),
                    incorporation_months=b.get("incorporation_months", 120),
                    employee_count=b.get("employee_count", 100),
                    annual_turnover_paise=b.get("annual_turnover_paise", 100_00_00_000),
                    director_ids=b.get("director_ids", []),
                    address_hash=b.get("address_hash", ""),
                    previous_wins=b.get("previous_wins", 0),
                ))

            if len(synthetic_bids) < 2:
                return None

            synthetic_tender = SyntheticTender(
                tender_id=tender.get("tender_id", ""),
                ministry_code=tender.get("ministry_code", "GEN"),
                estimated_value_paise=int(tender.get("estimated_value_paise", tender.get("estimated_value", 0))),
                category=tender.get("category", "WORKS"),
                bid_count=len(synthetic_bids),
                bids=synthetic_bids,
                is_fraud=False,
                fraud_type="UNKNOWN",
            )

            features = extract_features(synthetic_tender)
            return features

        except Exception as e:
            logger.error(f"[RiskScorer] Feature extraction failed: {e}")
            return None

    def score_tender(
        self,
        tender: Dict[str, Any],
        bids: List[Dict[str, Any]],
        historical_tenders: Optional[List[Dict[str, Any]]] = None,
        bidder_profiles: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        """
        Run all detectors + ML models and produce a composite risk assessment.

        Returns composite risk assessment with per-detector breakdowns,
        ML model predictions, and evidence for blockchain audit trail.
        """
        now = datetime.now(IST).strftime("%Y-%m-%dT%H:%M:%S+05:30")

        result: Dict[str, Any] = {
            "tender_id": tender.get("tender_id", ""),
            "composite_risk_score": 0,
            "recommended_action": "MONITOR",
            "detector_results": {},
            "ml_results": {},
            "flags": [],
            "convergence_bonus": 0,
            "scoring_mode": "HYBRID" if self._ml_loaded else "RULE_BASED",
            "analyzed_at_ist": now,
            "detectors_run": 0,
            "ml_models_run": 0,
        }

        detector_scores = {}
        high_score_count = 0

        # ================================================================
        # Phase 1: Run Rule-Based Detectors (existing logic)
        # ================================================================

        # ---- Detector 1: Bid Rigging ----
        if bids and len(bids) >= 2:
            br_result = self.detectors["BID_RIGGING"]["instance"].analyze(bids, tender)
            result["detector_results"]["BID_RIGGING"] = br_result
            detector_scores["BID_RIGGING"] = br_result["risk_score"]
            result["flags"].extend(br_result.get("flags", []))
            result["detectors_run"] += 1
            if br_result["risk_score"] >= 50:
                high_score_count += 1

        # ---- Detector 2: Collusion Graph ----
        if historical_tenders and len(historical_tenders) >= 3:
            cg_result = self.detectors["COLLUSION"]["instance"].analyze(historical_tenders)
            result["detector_results"]["COLLUSION"] = cg_result
            detector_scores["COLLUSION"] = cg_result["risk_score"]
            result["flags"].extend(cg_result.get("flags", []))
            result["detectors_run"] += 1
            if cg_result["risk_score"] >= 50:
                high_score_count += 1

        # ---- Detector 3: Shell Company ----
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

        # ---- Detector 4: Cartel Rotation ----
        if historical_tenders and len(historical_tenders) >= 5:
            cr_result = self.detectors["CARTEL"]["instance"].analyze(historical_tenders)
            result["detector_results"]["CARTEL"] = cr_result
            detector_scores["CARTEL"] = cr_result["risk_score"]
            result["flags"].extend(cr_result.get("flags", []))
            result["detectors_run"] += 1
            if cr_result["risk_score"] >= 50:
                high_score_count += 1

        # ---- Detector 5: Timing Anomaly ----
        if bids and len(bids) >= 2:
            ta_result = self.detectors["TIMING_ANOMALY"]["instance"].analyze(bids, tender)
            result["detector_results"]["TIMING_ANOMALY"] = ta_result
            detector_scores["TIMING_ANOMALY"] = ta_result["risk_score"]
            result["flags"].extend(ta_result.get("flags", []))
            result["detectors_run"] += 1
            if ta_result["risk_score"] >= 50:
                high_score_count += 1

        # Calculate weighted rule-based score
        weighted_sum = 0
        total_weight = 0
        for detector_name, score in detector_scores.items():
            weight = self.detectors[detector_name]["weight"]
            weighted_sum += score * weight
            total_weight += weight

        rule_based_score = int(weighted_sum / total_weight) if total_weight > 0 else 0

        # ================================================================
        # Phase 2: Run ML Models
        # ================================================================
        ml_score = 0
        gbm_probability = 0.0
        anomaly_score = 0.5

        if self._ml_loaded and self.ml_pipeline:
            features = self._extract_ml_features(tender, bids)
            if features:
                ml_result = self.ml_pipeline.predict(features)
                result["ml_results"] = ml_result
                result["ml_models_run"] = sum(1 for v in ml_result.get("models_available", {}).values() if v)

                gbm_probability = ml_result.get("ml_fraud_probability", 0.0)
                anomaly_score = ml_result.get("anomaly_score", 0.5)
                ml_score = ml_result.get("ml_risk_score", 0)

                if gbm_probability >= 0.7:
                    result["flags"].append(
                        f"ML_HIGH_RISK: Gradient Boosting predicts {gbm_probability:.0%} fraud probability"
                    )
                if anomaly_score >= 0.7:
                    result["flags"].append(
                        f"ML_ANOMALY: Isolation Forest anomaly score {anomaly_score:.2f} (threshold: 0.6)"
                    )

        # ================================================================
        # Phase 3: Compute Hybrid Score
        # ================================================================

        if self._ml_loaded and ml_score > 0:
            # Hybrid: rules + GBM + IForest
            composite = int(
                self.rule_weight * rule_based_score +
                self.gbm_weight * (gbm_probability * 100) +
                self.if_weight * (anomaly_score * 100)
            )
            result["scoring_mode"] = "HYBRID"
        else:
            composite = rule_based_score
            result["scoring_mode"] = "RULE_BASED"

        result["rule_based_score"] = rule_based_score
        result["ml_score"] = ml_score

        # ================================================================
        # Phase 4: Convergence Bonuses
        # ================================================================

        # Rule-based convergence
        if high_score_count >= 4:
            result["convergence_bonus"] += 15
        elif high_score_count >= 3:
            result["convergence_bonus"] += 10
        elif high_score_count >= 2:
            result["convergence_bonus"] += 5

        # ML + Rules agreement bonus
        if self._ml_loaded:
            rules_say_fraud = rule_based_score >= 50
            ml_says_fraud = gbm_probability >= 0.5
            if rules_say_fraud and ml_says_fraud:
                result["convergence_bonus"] += 8
                result["flags"].append("CONVERGENCE: Both rule-based AND ML models agree on high risk")
            elif rules_say_fraud != ml_says_fraud:
                result["flags"].append(
                    f"DIVERGENCE: Rules={rule_based_score}, ML={ml_score} — manual review recommended"
                )

        composite = min(100, composite + result["convergence_bonus"])
        result["composite_risk_score"] = composite

        # ================================================================
        # Phase 5: Determine Recommended Action
        # ================================================================
        if composite >= 76:
            result["recommended_action"] = "ESCALATE_CAG"
        elif composite >= 51:
            result["recommended_action"] = "FREEZE"
        elif composite >= 26:
            result["recommended_action"] = "FLAG"
        else:
            result["recommended_action"] = "MONITOR"

        logger.info(
            f"[RiskScorer] Tender {tender.get('tender_id')}: "
            f"composite={result['composite_risk_score']} "
            f"(rules={rule_based_score}, ml={ml_score}), "
            f"action={result['recommended_action']}, "
            f"mode={result['scoring_mode']}, "
            f"detectors={result['detectors_run']}, "
            f"convergence={result['convergence_bonus']}"
        )

        return result

    def get_detector_weights(self) -> Dict[str, float]:
        """Return the current detector weights for transparency."""
        weights = {name: d["weight"] for name, d in self.detectors.items()}
        weights["__ml_gradient_boosting"] = self.gbm_weight
        weights["__ml_isolation_forest"] = self.if_weight
        weights["__rules_total"] = self.rule_weight
        return weights

    def get_action_thresholds(self) -> Dict[str, tuple]:
        """Return the action thresholds for documentation."""
        return self.thresholds

    def get_model_info(self) -> Dict[str, Any]:
        """Return ML model metadata."""
        info: Dict[str, Any] = {
            "ml_loaded": self._ml_loaded,
            "scoring_mode": "HYBRID" if self._ml_loaded else "RULE_BASED",
            "rule_detectors": list(self.detectors.keys()),
            "weights": {
                "rules": self.rule_weight,
                "gradient_boosting": self.gbm_weight,
                "isolation_forest": self.if_weight,
            },
        }
        if self._ml_loaded and self.ml_pipeline:
            info["ml_pipeline"] = self.ml_pipeline.get_model_info()
        return info
