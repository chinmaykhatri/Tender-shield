"""
============================================================================
TenderShield — Shell Company Detector Tests
============================================================================
Tests all 6 shell company indicators: GSTIN mismatch, recent incorporation,
low turnover, minimal employees, common directors, common addresses.
============================================================================
"""

import pytest
from ai_engine.detectors.shell_company import ShellCompanyDetector


@pytest.fixture
def detector():
    return ShellCompanyDetector()


class TestGSTINStateMismatch:
    def test_mismatch_flagged(self, detector, high_value_tender):
        profile = {
            "bidder_did": "did:bidder:test",
            "bidder_gstin": "07AABCS1234K1Z5",  # Delhi (07)
            "registered_state": "MH",              # Maharashtra
        }
        result = detector.analyze(profile, high_value_tender)
        assert any("GSTIN_STATE_MISMATCH" in f for f in result["flags"])

    def test_matching_state_clean(self, detector, high_value_tender):
        profile = {
            "bidder_did": "did:bidder:test",
            "bidder_gstin": "27AABCS1234K1Z5",  # MH (27)
            "registered_state": "MH",
        }
        result = detector.analyze(profile, high_value_tender)
        assert not any("GSTIN_STATE_MISMATCH" in f for f in result["flags"])


class TestRecentIncorporation:
    def test_new_company_flagged(self, detector, high_value_tender):
        profile = {"bidder_did": "test", "incorporation_months": 3}
        result = detector.analyze(profile, high_value_tender)
        assert any("RECENTLY_INCORPORATED" in f for f in result["flags"])

    def test_established_company_clean(self, detector, high_value_tender):
        profile = {"bidder_did": "test", "incorporation_months": 60}
        result = detector.analyze(profile, high_value_tender)
        assert not any("RECENTLY_INCORPORATED" in f for f in result["flags"])


class TestLowTurnover:
    def test_turnover_ratio_flagged(self, detector, high_value_tender):
        profile = {
            "bidder_did": "test",
            "annual_turnover_paise": 1_00_00_000 * 100,  # ₹1 Cr
        }
        result = detector.analyze(profile, high_value_tender)
        assert any("LOW_TURNOVER" in f for f in result["flags"])

    def test_adequate_turnover_clean(self, detector, sample_tender):
        profile = {
            "bidder_did": "test",
            "annual_turnover_paise": 500_00_00_000 * 100,  # ₹500 Cr
        }
        result = detector.analyze(profile, sample_tender)
        assert not any("LOW_TURNOVER" in f for f in result["flags"])


class TestMinimalEmployees:
    def test_few_employees_flagged(self, detector, high_value_tender):
        profile = {"bidder_did": "test", "employee_count": 2}
        result = detector.analyze(profile, high_value_tender)
        assert any("MINIMAL_EMPLOYEES" in f for f in result["flags"])

    def test_adequate_employees_clean(self, detector, high_value_tender):
        profile = {"bidder_did": "test", "employee_count": 100}
        result = detector.analyze(profile, high_value_tender)
        assert not any("MINIMAL_EMPLOYEES" in f for f in result["flags"])


class TestCommonDirectors:
    def test_flagged_directors_caught(self, detector, shell_company_profile, high_value_tender):
        result = detector.analyze(shell_company_profile, high_value_tender)
        assert any("COMMON_DIRECTORS" in f for f in result["flags"])
        assert "dir:shared1" in result["evidence"].get("common_directors", [])

    def test_unique_directors_clean(self, detector, legitimate_company_profile, high_value_tender):
        result = detector.analyze(legitimate_company_profile, high_value_tender)
        assert not any("COMMON_DIRECTORS" in f for f in result["flags"])


class TestCommonAddress:
    def test_flagged_address_caught(self, detector, shell_company_profile, high_value_tender):
        result = detector.analyze(shell_company_profile, high_value_tender)
        assert any("COMMON_ADDRESS" in f for f in result["flags"])

    def test_unique_address_clean(self, detector, legitimate_company_profile, high_value_tender):
        result = detector.analyze(legitimate_company_profile, high_value_tender)
        assert not any("COMMON_ADDRESS" in f for f in result["flags"])


class TestOverallShellScoring:
    def test_shell_company_high_score(self, detector, shell_company_profile, high_value_tender):
        result = detector.analyze(shell_company_profile, high_value_tender)
        assert result["risk_score"] >= 50
        assert result["recommendation"] in ("FREEZE", "ESCALATE_CAG")

    def test_legit_company_low_score(self, detector, legitimate_company_profile, high_value_tender):
        result = detector.analyze(legitimate_company_profile, high_value_tender)
        assert result["risk_score"] < 26
        assert result["recommendation"] == "MONITOR"

    def test_score_capped_at_100(self, detector, shell_company_profile, high_value_tender):
        result = detector.analyze(shell_company_profile, high_value_tender)
        assert result["risk_score"] <= 100

    def test_confidence_calculation(self, detector, shell_company_profile, high_value_tender):
        result = detector.analyze(shell_company_profile, high_value_tender)
        assert 0 <= result["confidence"] <= 1.0
