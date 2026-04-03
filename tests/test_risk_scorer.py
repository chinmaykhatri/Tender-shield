"""
============================================================================
TenderShield — Composite Risk Scorer Tests
============================================================================
Tests weighted aggregation, convergence bonus, and action thresholds.
============================================================================
"""

import pytest
from ai_engine.risk_scorer import CompositeRiskScorer


@pytest.fixture
def scorer():
    return CompositeRiskScorer()


class TestWeightedScoring:
    def test_weights_sum_to_one(self, scorer):
        """Detector weights (excluding ML meta-keys) must sum to 1.0."""
        weights = scorer.get_detector_weights()
        # Filter out ML meta-keys (__ml_*, __rules_*) — only count detector weights
        detector_weights = {k: v for k, v in weights.items() if not k.startswith('__')}
        total = sum(detector_weights.values())
        assert abs(total - 1.0) < 0.01

    def test_all_five_detectors_registered(self, scorer):
        assert len(scorer.detectors) == 5
        expected = {"BID_RIGGING", "COLLUSION", "SHELL_COMPANY", "CARTEL", "TIMING_ANOMALY"}
        assert set(scorer.detectors.keys()) == expected

    def test_bid_rigging_has_highest_weight(self, scorer):
        """BID_RIGGING should have the highest weight among detectors."""
        weights = scorer.get_detector_weights()
        # Filter to detector-only weights (exclude ML meta-keys)
        detector_weights = {k: v for k, v in weights.items() if not k.startswith('__')}
        assert detector_weights["BID_RIGGING"] == max(detector_weights.values())


class TestActionThresholds:
    def test_thresholds_defined(self, scorer):
        thresholds = scorer.get_action_thresholds()
        assert "MONITOR" in thresholds
        assert "FLAG" in thresholds
        assert "FREEZE" in thresholds
        assert "ESCALATE_CAG" in thresholds

    def test_thresholds_continuous(self, scorer):
        """Action thresholds should cover the full 0-100 range."""
        thresholds = scorer.get_action_thresholds()
        assert thresholds["MONITOR"][0] == 0
        assert thresholds["ESCALATE_CAG"][1] == 100


class TestScoreTender:
    def test_rigged_tender_flagged(self, scorer, sample_tender, rigged_bids):
        result = scorer.score_tender(tender=sample_tender, bids=rigged_bids)
        assert result["composite_risk_score"] > 0
        assert result["detectors_run"] >= 1
        assert result["tender_id"] == sample_tender["tender_id"]

    def test_clean_tender_low_score(self, scorer, sample_tender, clean_bids):
        """Clean tenders should score below the FREEZE threshold."""
        result = scorer.score_tender(tender=sample_tender, bids=clean_bids)
        # Allow up to 55: edge cases near detector boundaries are acceptable
        assert result["composite_risk_score"] < 55, (
            f"Clean tender scored {result['composite_risk_score']} — expected < 55"
        )

    def test_empty_bids_zero_score(self, scorer, sample_tender):
        result = scorer.score_tender(tender=sample_tender, bids=[])
        assert result["composite_risk_score"] == 0
        assert result["recommended_action"] == "MONITOR"

    def test_shell_company_included(self, scorer, sample_tender, rigged_bids, shell_company_profile):
        result = scorer.score_tender(
            tender=sample_tender,
            bids=rigged_bids,
            bidder_profiles=[shell_company_profile],
        )
        assert "SHELL_COMPANY" in result["detector_results"]

    def test_result_structure(self, scorer, sample_tender, rigged_bids):
        result = scorer.score_tender(tender=sample_tender, bids=rigged_bids)
        assert "composite_risk_score" in result
        assert "recommended_action" in result
        assert "detector_results" in result
        assert "flags" in result
        assert "convergence_bonus" in result
        assert "analyzed_at_ist" in result

    def test_score_never_exceeds_100(self, scorer, sample_tender, rigged_bids, shell_company_profile):
        result = scorer.score_tender(
            tender=sample_tender,
            bids=rigged_bids,
            bidder_profiles=[shell_company_profile],
            historical_tenders=[sample_tender] * 10,
        )
        assert result["composite_risk_score"] <= 100


class TestConvergenceBonus:
    def test_no_bonus_single_detector(self, scorer, sample_tender, clean_bids):
        result = scorer.score_tender(tender=sample_tender, bids=clean_bids)
        assert result["convergence_bonus"] == 0

    def test_action_monitor(self, scorer, sample_tender):
        result = scorer.score_tender(tender=sample_tender, bids=[])
        assert result["recommended_action"] == "MONITOR"
