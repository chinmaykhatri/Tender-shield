"""
============================================================================
TenderShield — Timing Anomaly Detector Tests
============================================================================
Tests burst submission, last-minute clustering, off-hours, sequential
intervals, and weekend/holiday detection.
============================================================================
"""

import pytest
from ai_engine.detectors.timing_anomaly import TimingAnomalyDetector


@pytest.fixture
def detector():
    return TimingAnomalyDetector()


class TestBurstSubmission:
    def test_burst_detected(self, detector, burst_bids, sample_tender):
        result = detector.analyze(burst_bids, sample_tender)
        assert result["evidence"]["burst_analysis"]["detected"] is True
        assert result["evidence"]["burst_analysis"]["count"] >= 3

    def test_no_burst_clean(self, detector, clean_bids, sample_tender):
        result = detector.analyze(clean_bids, sample_tender)
        burst = result["evidence"]["burst_analysis"]
        assert burst["detected"] is False


class TestLastMinuteClustering:
    def test_last_minute_flagged(self, detector, sample_tender):
        bids = [
            {"bidder_did": f"b{i}", "revealed_amount_paise": 100 * 100,
             "submitted_at_ist": f"2025-03-28T16:{50+i}:00+05:30"}
            for i in range(5)
        ]
        result = detector.analyze(bids, sample_tender)
        lm = result["evidence"].get("last_minute", {})
        if lm:
            assert lm.get("percentage", 0) > 70

    def test_spread_submissions_clean(self, detector, clean_bids, sample_tender):
        result = detector.analyze(clean_bids, sample_tender)
        lm = result["evidence"].get("last_minute", {})
        assert not lm.get("detected", False)


class TestOffHours:
    def test_night_submissions_flagged(self, detector, sample_tender):
        bids = [
            {"bidder_did": "b1", "revealed_amount_paise": 100 * 100, "submitted_at_ist": "2025-03-27T02:30:00+05:30"},
            {"bidder_did": "b2", "revealed_amount_paise": 105 * 100, "submitted_at_ist": "2025-03-27T03:15:00+05:30"},
            {"bidder_did": "b3", "revealed_amount_paise": 110 * 100, "submitted_at_ist": "2025-03-27T04:00:00+05:30"},
        ]
        result = detector.analyze(bids, sample_tender)
        assert result["evidence"]["off_hours"]["detected"] is True

    def test_business_hours_clean(self, detector, clean_bids, sample_tender):
        result = detector.analyze(clean_bids, sample_tender)
        assert result["evidence"]["off_hours"]["detected"] is False


class TestSequentialIntervals:
    def test_exact_intervals_flagged(self, detector, sample_tender):
        bids = [
            {"bidder_did": f"b{i}", "revealed_amount_paise": 100 * 100,
             "submitted_at_ist": f"2025-03-27T10:{10 + i * 2}:00+05:30"}
            for i in range(5)
        ]
        result = detector.analyze(bids, sample_tender)
        seq = result["evidence"]["sequential"]
        # With exact 2-min intervals and CV ~0, should detect
        assert seq["cv"] < 0.2


class TestWeekendHoliday:
    def test_weekend_submissions(self, detector, sample_tender):
        # 2025-03-22 is Saturday, 2025-03-23 is Sunday
        bids = [
            {"bidder_did": "b1", "revealed_amount_paise": 100 * 100, "submitted_at_ist": "2025-03-22T10:00:00+05:30"},
            {"bidder_did": "b2", "revealed_amount_paise": 105 * 100, "submitted_at_ist": "2025-03-23T11:00:00+05:30"},
        ]
        result = detector.analyze(bids, sample_tender)
        assert result["evidence"]["weekend_holiday"]["detected"] is True

    def test_republic_day_flagged(self, detector, sample_tender):
        bids = [
            {"bidder_did": "b1", "revealed_amount_paise": 100 * 100, "submitted_at_ist": "2025-01-26T10:00:00+05:30"},
            {"bidder_did": "b2", "revealed_amount_paise": 200 * 100, "submitted_at_ist": "2025-01-26T11:00:00+05:30"},
        ]
        result = detector.analyze(bids, sample_tender)
        assert result["evidence"]["weekend_holiday"]["count"] >= 2


class TestOverallTimingScoring:
    def test_insufficient_timestamps(self, detector, sample_tender):
        result = detector.analyze([{"bidder_did": "b1"}], sample_tender)
        assert result["risk_score"] == 0

    def test_score_capped(self, detector, sample_tender):
        bids = [
            {"bidder_did": f"b{i}", "revealed_amount_paise": 100 * 100,
             "submitted_at_ist": f"2025-03-22T03:{10+i}:00+05:30"}
            for i in range(5)
        ]
        result = detector.analyze(bids, sample_tender)
        assert result["risk_score"] <= 100
