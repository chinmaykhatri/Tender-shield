# pyre-ignore-all-errors
"""
============================================================================
TenderShield — GFR 2017 Compliance Engine
============================================================================
Implements General Financial Rules (GFR) 2017 as executable code.

This is NOT a whitepaper. This is a rule engine that reads a tender and
returns a compliance verdict. Each rule references a specific GFR section.

RULES IMPLEMENTED:
  Rule 149: Security deposit for works > ₹1 Crore
  Rule 155: Two-packet evaluation for consultancy > ₹25 Lakh
  Rule 160: Minimum 3 bidders for single-source procurement justification
  Rule 166: Minimum tender notice period = 14 days
  Rule 173: MSME purchase preference (25% reservation)
  Rule 175: EMD (Earnest Money Deposit) between 2-5% of estimated cost
  Rule 177: Performance security of 5-10% of contract value

INDIA CONTEXT:
  GFR 2017 is the bible of Indian government procurement.
  Any AI tool that claims to improve procurement MUST enforce these rules.
  Currently, compliance is manually checked. This engine automates it.
============================================================================
"""

import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone, timedelta

logger = logging.getLogger("tendershield.ai.gfr_compliance")
IST = timezone(timedelta(hours=5, minutes=30))


class GFRComplianceEngine:
    """
    Checks tenders against General Financial Rules (GFR) 2017.
    Returns pass/fail for each applicable rule with evidence.
    """

    def __init__(self):
        self.name = "GFR_2017"
        self.version = "1.0.0"
        # Thresholds from GFR 2017 (in paise)
        self.security_deposit_threshold = 1_00_00_000 * 100  # ₹1 Crore
        self.two_packet_threshold = 25_00_000 * 100           # ₹25 Lakh
        self.emd_min_pct = 0.02  # 2%
        self.emd_max_pct = 0.05  # 5%
        self.min_tender_notice_days = 14
        self.min_bidders_single_source = 3
        self.msme_reservation_pct = 0.25  # 25%
        self.performance_security_min = 0.05  # 5%
        self.performance_security_max = 0.10  # 10%

    def check_compliance(
        self,
        tender: Dict[str, Any],
        bids: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        """
        Run GFR 2017 compliance checks on a tender.

        Args:
            tender: Tender metadata with budget, dates, and procurement method
            bids: Optional list of bids for bid-level checks

        Returns:
            Compliance report with pass/fail per rule and overall verdict
        """
        rules_checked: List[Dict[str, Any]] = []

        # ──── Rule 149: Security Deposit ────
        rules_checked.append(self._check_security_deposit(tender))

        # ──── Rule 155: Two-Packet Evaluation ────
        rules_checked.append(self._check_two_packet(tender))

        # ──── Rule 160: Minimum Bidders ────
        if bids is not None:
            rules_checked.append(self._check_minimum_bidders(tender, bids))

        # ──── Rule 166: Minimum Notice Period ────
        rules_checked.append(self._check_notice_period(tender))

        # ──── Rule 173: MSME Preference ────
        if bids is not None:
            rules_checked.append(self._check_msme_preference(tender, bids))

        # ──── Rule 175: EMD Check ────
        if bids is not None:
            rules_checked.append(self._check_emd(tender, bids))

        # ──── Rule 177: Performance Security ────
        rules_checked.append(self._check_performance_security(tender))

        # Compute overall compliance
        passed = sum(1 for r in rules_checked if r["status"] == "PASS")
        failed = sum(1 for r in rules_checked if r["status"] == "FAIL")
        warnings = sum(1 for r in rules_checked if r["status"] == "WARNING")
        not_applicable = sum(1 for r in rules_checked if r["status"] == "N/A")

        compliance_score = round(
            passed / max(passed + failed + warnings, 1) * 100
        )

        overall = "COMPLIANT" if failed == 0 else "NON_COMPLIANT"
        if warnings > 0 and failed == 0:
            overall = "COMPLIANT_WITH_WARNINGS"

        return {
            "engine": self.name,
            "version": self.version,
            "tender_id": tender.get("tender_id", ""),
            "overall_status": overall,
            "compliance_score": compliance_score,
            "rules_checked": len(rules_checked),
            "passed": passed,
            "failed": failed,
            "warnings": warnings,
            "not_applicable": not_applicable,
            "rules": rules_checked,
            "checked_at_ist": datetime.now(IST).strftime("%Y-%m-%dT%H:%M:%S+05:30"),
        }

    def _check_security_deposit(self, tender: Dict[str, Any]) -> Dict[str, Any]:
        """GFR Rule 149: Works contracts above ₹1 Crore require security deposit."""
        estimated = tender.get("estimated_value_paise", 0)
        category = tender.get("category", "")

        if category != "WORKS":
            return {
                "rule": "GFR-149",
                "title": "Security Deposit for Works",
                "status": "N/A",
                "reason": f"Only applies to WORKS category (this is {category})",
            }

        if estimated < self.security_deposit_threshold:
            return {
                "rule": "GFR-149",
                "title": "Security Deposit for Works",
                "status": "N/A",
                "reason": f"Below ₹1 Crore threshold (₹{estimated / 1_00_00_000_00:.1f} Cr)",
            }

        security_deposit = tender.get("security_deposit_paise", 0)
        required = int(estimated * 0.025)  # 2.5% as per GFR

        if security_deposit >= required:
            return {
                "rule": "GFR-149",
                "title": "Security Deposit for Works",
                "status": "PASS",
                "reason": f"Security deposit ₹{security_deposit / 1_00_00_000_00:.2f} Cr meets minimum ₹{required / 1_00_00_000_00:.2f} Cr",
                "evidence": {"required_paise": required, "provided_paise": security_deposit},
            }

        return {
            "rule": "GFR-149",
            "title": "Security Deposit for Works",
            "status": "FAIL" if security_deposit == 0 else "WARNING",
            "reason": (
                f"Works contract of ₹{estimated / 1_00_00_000_00:.1f} Cr requires "
                f"security deposit of ₹{required / 1_00_00_000_00:.2f} Cr. "
                f"{'None provided.' if security_deposit == 0 else f'Only ₹{security_deposit / 1_00_00_000_00:.2f} Cr provided.'}"
            ),
            "evidence": {"required_paise": required, "provided_paise": security_deposit},
        }

    def _check_two_packet(self, tender: Dict[str, Any]) -> Dict[str, Any]:
        """GFR Rule 155: Consultancy above ₹25 Lakh requires two-packet evaluation."""
        estimated = tender.get("estimated_value_paise", 0)
        category = tender.get("category", "")

        if category != "CONSULTANCY":
            return {
                "rule": "GFR-155",
                "title": "Two-Packet Evaluation",
                "status": "N/A",
                "reason": f"Only applies to CONSULTANCY (this is {category})",
            }

        if estimated < self.two_packet_threshold:
            return {
                "rule": "GFR-155",
                "title": "Two-Packet Evaluation",
                "status": "N/A",
                "reason": "Below ₹25 Lakh threshold",
            }

        is_two_packet = tender.get("evaluation_method", "") == "TWO_PACKET"
        if is_two_packet:
            return {
                "rule": "GFR-155",
                "title": "Two-Packet Evaluation",
                "status": "PASS",
                "reason": "Two-packet evaluation method correctly applied",
            }

        return {
            "rule": "GFR-155",
            "title": "Two-Packet Evaluation",
            "status": "FAIL",
            "reason": (
                f"Consultancy contract of ₹{estimated / 1_00_00_000_00:.2f} Cr "
                f"requires two-packet (technical + financial) evaluation per GFR 155"
            ),
        }

    def _check_minimum_bidders(
        self, tender: Dict[str, Any], bids: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """GFR Rule 160: Need minimum 3 bidders or documented single-source justification."""
        method = tender.get("procurement_method", "OPEN_TENDER")
        bid_count = len(bids)

        if method == "SINGLE_SOURCE" and bid_count < self.min_bidders_single_source:
            justification = tender.get("single_source_justification", "")
            if justification:
                return {
                    "rule": "GFR-160",
                    "title": "Minimum Bidders / Single Source",
                    "status": "WARNING",
                    "reason": (
                        f"Single-source procurement with {bid_count} bidder(s). "
                        f"Justification provided: '{justification[:100]}'"
                    ),
                }
            return {
                "rule": "GFR-160",
                "title": "Minimum Bidders / Single Source",
                "status": "FAIL",
                "reason": (
                    f"Single-source procurement without documented justification. "
                    f"GFR 160 requires documented reasoning for single-source."
                ),
            }

        if bid_count < 3:
            return {
                "rule": "GFR-160",
                "title": "Minimum Bidders",
                "status": "WARNING",
                "reason": f"Only {bid_count} bidder(s). GFR recommends minimum 3 for competitive bidding.",
            }

        return {
            "rule": "GFR-160",
            "title": "Minimum Bidders",
            "status": "PASS",
            "reason": f"{bid_count} bidders received — competitive threshold met",
        }

    def _check_notice_period(self, tender: Dict[str, Any]) -> Dict[str, Any]:
        """GFR Rule 166: Minimum 14 days notice for standard tenders."""
        start = tender.get("bid_start_date") or tender.get("published_at")
        end = tender.get("bid_end_date") or tender.get("deadline")

        if not start or not end:
            return {
                "rule": "GFR-166",
                "title": "Minimum Notice Period",
                "status": "WARNING",
                "reason": "Cannot verify — bid start/end dates not available",
            }

        try:
            if isinstance(start, str):
                start_dt = datetime.fromisoformat(start.replace("Z", "+00:00"))
            else:
                start_dt = start
            if isinstance(end, str):
                end_dt = datetime.fromisoformat(end.replace("Z", "+00:00"))
            else:
                end_dt = end

            notice_days = (end_dt - start_dt).days
        except (ValueError, TypeError):
            return {
                "rule": "GFR-166",
                "title": "Minimum Notice Period",
                "status": "WARNING",
                "reason": "Cannot parse dates for notice period calculation",
            }

        if notice_days >= self.min_tender_notice_days:
            return {
                "rule": "GFR-166",
                "title": "Minimum Notice Period",
                "status": "PASS",
                "reason": f"{notice_days}-day notice period meets minimum {self.min_tender_notice_days} days",
                "evidence": {"notice_days": notice_days},
            }

        return {
            "rule": "GFR-166",
            "title": "Minimum Notice Period",
            "status": "FAIL",
            "reason": (
                f"Only {notice_days}-day notice period. "
                f"GFR 166 requires minimum {self.min_tender_notice_days} days."
            ),
            "evidence": {"notice_days": notice_days},
        }

    def _check_msme_preference(
        self, tender: Dict[str, Any], bids: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """GFR Rule 173: 25% procurement reservation for MSMEs."""
        estimated = tender.get("estimated_value_paise", 0)
        msme_bids = [b for b in bids if b.get("is_msme")]
        msme_ratio = len(msme_bids) / max(len(bids), 1)

        if not bids:
            return {
                "rule": "GFR-173",
                "title": "MSME Purchase Preference",
                "status": "N/A",
                "reason": "No bids to evaluate",
            }

        if msme_ratio >= self.msme_reservation_pct:
            return {
                "rule": "GFR-173",
                "title": "MSME Purchase Preference",
                "status": "PASS",
                "reason": (
                    f"{len(msme_bids)}/{len(bids)} ({msme_ratio:.0%}) bidders are MSMEs — "
                    f"meets 25% reservation requirement"
                ),
            }

        return {
            "rule": "GFR-173",
            "title": "MSME Purchase Preference",
            "status": "WARNING",
            "reason": (
                f"Only {len(msme_bids)}/{len(bids)} ({msme_ratio:.0%}) MSME bidders. "
                f"GFR 173 recommends 25% MSME participation. "
                f"Consider MSME outreach."
            ),
        }

    def _check_emd(
        self, tender: Dict[str, Any], bids: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """GFR Rule 175: EMD should be 2-5% of estimated cost."""
        estimated = tender.get("estimated_value_paise", 0)
        if estimated == 0:
            return {
                "rule": "GFR-175",
                "title": "Earnest Money Deposit",
                "status": "N/A",
                "reason": "Estimated value not available",
            }

        emd_amount = tender.get("emd_paise", 0)
        if emd_amount == 0:
            return {
                "rule": "GFR-175",
                "title": "Earnest Money Deposit",
                "status": "WARNING",
                "reason": "No EMD amount specified. GFR 175 requires 2-5% EMD.",
            }

        emd_pct = emd_amount / estimated
        if self.emd_min_pct <= emd_pct <= self.emd_max_pct:
            return {
                "rule": "GFR-175",
                "title": "Earnest Money Deposit",
                "status": "PASS",
                "reason": f"EMD is {emd_pct:.1%} of estimated cost — within 2-5% range",
            }

        return {
            "rule": "GFR-175",
            "title": "Earnest Money Deposit",
            "status": "FAIL" if emd_pct < self.emd_min_pct else "WARNING",
            "reason": (
                f"EMD is {emd_pct:.1%} of estimated cost. "
                f"GFR 175 requires 2-5%."
            ),
        }

    def _check_performance_security(self, tender: Dict[str, Any]) -> Dict[str, Any]:
        """GFR Rule 177: Performance security should be 5-10% of contract value."""
        perf_security = tender.get("performance_security_pct", 0)
        category = tender.get("category", "")

        if category not in ("WORKS", "GOODS"):
            return {
                "rule": "GFR-177",
                "title": "Performance Security",
                "status": "N/A",
                "reason": f"Performance security primarily applies to WORKS/GOODS (this is {category})",
            }

        if perf_security == 0:
            return {
                "rule": "GFR-177",
                "title": "Performance Security",
                "status": "WARNING",
                "reason": "No performance security percentage specified. GFR 177 requires 5-10%.",
            }

        if self.performance_security_min <= perf_security <= self.performance_security_max:
            return {
                "rule": "GFR-177",
                "title": "Performance Security",
                "status": "PASS",
                "reason": f"Performance security of {perf_security:.0%} is within 5-10% range",
            }

        return {
            "rule": "GFR-177",
            "title": "Performance Security",
            "status": "FAIL",
            "reason": f"Performance security of {perf_security:.0%} is outside 5-10% GFR range",
        }


# Module-level instance for import
gfr_engine = GFRComplianceEngine()
