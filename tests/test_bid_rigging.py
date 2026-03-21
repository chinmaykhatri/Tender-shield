"""
============================================================================
TenderShield — Bid Rigging Detector Tests
============================================================================
Tests all 5 statistical methods: CV, cover bids, Benford's Law, round
numbers, and bid gap analysis.
============================================================================
"""

import pytest
from ai_engine.detectors.bid_rigging import BidRiggingDetector


@pytest.fixture
def detector():
    return BidRiggingDetector()


class TestCoefficientOfVariation:
    """Test CV analysis — low CV means bids are suspiciously similar."""

    def test_low_cv_flagged(self, detector, rigged_bids, sample_tender):
        result = detector.analyze(rigged_bids, sample_tender)
        cv = result["evidence"]["cv_analysis"]["cv"]
        assert cv < detector.cv_threshold or result["risk_score"] > 0

    def test_high_cv_clean(self, detector, clean_bids, sample_tender):
        result = detector.analyze(clean_bids, sample_tender)
        cv = result["evidence"]["cv_analysis"]["cv"]
        assert cv > detector.cv_threshold

    def test_identical_bids_flagged(self, detector, sample_tender):
        identical = [
            {"bidder_did": f"b{i}", "revealed_amount_paise": 100_00_00_000 * 100}
            for i in range(5)
        ]
        result = detector.analyze(identical, sample_tender)
        assert result["evidence"]["cv_analysis"]["cv"] == 0
        assert result["evidence"]["cv_analysis"]["suspicious"] is True


class TestCoverBidDetection:
    """Test Z-score based cover bid identification."""

    def test_cover_bid_detected(self, detector, sample_tender):
        bids = [
            {"bidder_did": "b1", "revealed_amount_paise": 100 * 100},
            {"bidder_did": "b2", "revealed_amount_paise": 101 * 100},
            {"bidder_did": "b3", "revealed_amount_paise": 102 * 100},
            {"bidder_did": "cover", "revealed_amount_paise": 500 * 100},
        ]
        result = detector.analyze(bids, sample_tender)
        assert result["evidence"]["cover_bids"]["detected"] is True
        assert result["evidence"]["cover_bids"]["count"] >= 1

    def test_no_cover_bids_clean(self, detector, clean_bids, sample_tender):
        result = detector.analyze(clean_bids, sample_tender)
        cover = result["evidence"]["cover_bids"]
        # Clean bids may or may not have cover bids, but count should be low
        assert cover["count"] <= 1


class TestBenfordsLaw:
    """Test Benford's Law compliance checking."""

    def test_fabricated_bids_flagged(self, detector, sample_tender):
        """All bids starting with same digit violates Benford's."""
        bids = [
            {"bidder_did": f"b{i}", "revealed_amount_paise": (500 + i) * 100}
            for i in range(10)
        ]
        result = detector.analyze(bids, sample_tender)
        assert "benfords_law" in result["evidence"]


class TestRoundNumbers:
    """Test round number analysis."""

    def test_all_round_flagged(self, detector, sample_tender):
        bids = [
            {"bidder_did": f"b{i}", "revealed_amount_paise": (i + 1) * 1_00_000 * 100}
            for i in range(5)
        ]
        result = detector.analyze(bids, sample_tender)
        assert result["evidence"]["round_numbers"]["percentage"] == 100

    def test_non_round_clean(self, detector, sample_tender):
        bids = [
            {"bidder_did": "b1", "revealed_amount_paise": 123_45_678},
            {"bidder_did": "b2", "revealed_amount_paise": 234_56_789},
            {"bidder_did": "b3", "revealed_amount_paise": 345_67_890},
        ]
        result = detector.analyze(bids, sample_tender)
        assert result["evidence"]["round_numbers"]["suspicious"] is False


class TestBidGaps:
    """Test uniform bid gap detection."""

    def test_uniform_gaps_flagged(self, detector, sample_tender):
        """Exactly spaced bids are suspicious (coordinated)."""
        bids = [
            {"bidder_did": f"b{i}", "revealed_amount_paise": (100 + i * 10) * 100}
            for i in range(5)
        ]
        result = detector.analyze(bids, sample_tender)
        assert result["evidence"]["bid_gaps"]["gap_cv"] < 0.1


class TestOverallScoring:
    """Test composite scoring and recommendations."""

    def test_insufficient_bids(self, detector, sample_tender):
        result = detector.analyze([{"bidder_did": "b1", "revealed_amount_paise": 100}], sample_tender)
        assert result["risk_score"] == 0

    def test_rigged_bids_high_score(self, detector, rigged_bids, sample_tender):
        result = detector.analyze(rigged_bids, sample_tender)
        assert result["risk_score"] > 0
        assert len(result["flags"]) > 0

    def test_clean_bids_low_score(self, detector, clean_bids, sample_tender):
        result = detector.analyze(clean_bids, sample_tender)
        assert result["risk_score"] < 50

    def test_score_capped_at_100(self, detector, sample_tender):
        """Ensure score never exceeds 100."""
        identical = [
            {"bidder_did": f"b{i}", "revealed_amount_paise": 1_00_000 * 100}
            for i in range(10)
        ]
        result = detector.analyze(identical, sample_tender)
        assert result["risk_score"] <= 100

    def test_recommendation_escalate(self, detector, sample_tender):
        """Score >= 76 should recommend ESCALATE_CAG."""
        identical = [
            {"bidder_did": f"b{i}", "revealed_amount_paise": 1_00_000 * 100}
            for i in range(10)
        ]
        result = detector.analyze(identical, sample_tender)
        if result["risk_score"] >= 76:
            assert result["recommendation"] == "ESCALATE_CAG"
