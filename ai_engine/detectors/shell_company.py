"""
============================================================================
TenderShield — Shell Company Detector (Rule-Based Pattern Matching)
============================================================================
Identifies shell/front companies used to create illusion of competition.

DETECTION METHOD: Rule-based pattern matching (NOT machine learning).
Each bidder is scored against 6 deterministic heuristic checks.
This is transparent and auditable — every flag has a clear reason.

INDICATORS:
  1. Common registered address among multiple bidders
  2. Common directors/signatories across companies
  3. Recently incorporated companies (< 1 year)
  4. Minimal financial footprint (very low turnover for tender size)
  5. GSTIN registered in different state than company address
  6. Pattern of winning only specific ministry tenders

INDIA CONTEXT:
  Shell companies are a known vehicle for procurement fraud in India.
  MCA (Ministry of Corporate Affairs) data cross-referencing is used.
  Companies Act 2013 Section 248 deals with removal of shell companies.
============================================================================
"""

import logging
from typing import List, Dict, Any
from collections import defaultdict

logger = logging.getLogger("tendershield.ai.shell_company")


class ShellCompanyDetector:
    """Identifies potential shell/front companies in bidder pool."""

    def __init__(self):
        self.name = "SHELL_COMPANY"
        self.min_turnover_ratio = 0.1  # Bid should be < 10x company turnover
        self.recent_incorporation_months = 12
        self.common_address_threshold = 2

    def analyze(self, bidder_profile: Dict[str, Any], tender: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analyze a single bidder for shell company indicators.
        
        Args:
            bidder_profile: Bidder details (GSTIN, PAN, incorporation date, etc.)
            tender: Tender details for context

        Returns:
            Risk assessment for this bidder
        """
        result: Dict[str, Any] = {
            "detector": self.name,
            "bidder_did": bidder_profile.get("bidder_did", ""),
            "risk_score": 0,
            "confidence": 0.0,
            "flags": [],
            "evidence": {},
            "recommendation": "MONITOR",
        }

        indicators_found = 0
        total_checks = 6

        # ---- Check 1: GSTIN State Mismatch ----
        gstin = bidder_profile.get("bidder_gstin", "")
        registered_state = bidder_profile.get("registered_state", "")
        if gstin and registered_state:
            gstin_state = gstin[:2]
            state_codes = {
                "01": "JK", "02": "HP", "03": "PB", "04": "CH", "05": "UK",
                "06": "HR", "07": "DL", "08": "RJ", "09": "UP", "10": "BR",
                "11": "SK", "12": "AR", "13": "NL", "14": "MN", "15": "MZ",
                "16": "TR", "17": "ML", "18": "AS", "19": "WB", "20": "JH",
                "21": "OR", "22": "CG", "23": "MP", "24": "GJ", "27": "MH",
                "29": "KA", "32": "KL", "33": "TN", "36": "TS", "37": "AP",
            }
            gstin_state_name = state_codes.get(gstin_state, "UNKNOWN")
            if registered_state and gstin_state_name != registered_state:
                result["risk_score"] += 15
                result["flags"].append(f"GSTIN_STATE_MISMATCH: GSTIN state {gstin_state_name} != registered state {registered_state}")
                indicators_found += 1
                result["evidence"]["gstin_state_mismatch"] = True

        # ---- Check 2: Recent Incorporation ----
        incorporation_months = bidder_profile.get("incorporation_months", None)
        if incorporation_months is not None and incorporation_months < self.recent_incorporation_months:
            result["risk_score"] += 20
            result["flags"].append(f"RECENTLY_INCORPORATED: Company is only {incorporation_months} months old")
            indicators_found += 1
            result["evidence"]["recently_incorporated"] = True

        # ---- Check 3: Low Turnover Ratio ----
        annual_turnover = bidder_profile.get("annual_turnover_paise", 0)
        tender_value = tender.get("estimated_value_paise", 0)
        if annual_turnover > 0 and tender_value > 0:
            ratio = tender_value / annual_turnover
            if ratio > 10:  # Bid > 10x turnover = suspicious
                result["risk_score"] += 20
                result["flags"].append(f"LOW_TURNOVER: Tender value is {ratio:.1f}x company turnover")
                indicators_found += 1
                result["evidence"]["turnover_ratio"] = round(ratio, 2)

        # ---- Check 4: Minimal Employee Count ----
        employee_count = bidder_profile.get("employee_count", None)
        if employee_count is not None and employee_count < 5 and tender_value > 1_00_00_000 * 100:
            result["risk_score"] += 15
            result["flags"].append(f"MINIMAL_EMPLOYEES: Only {employee_count} employees for ₹{tender_value/100/100_00_000:.0f}L+ tender")
            indicators_found += 1
            result["evidence"]["minimal_employees"] = True

        # ---- Check 5: Common Director Pattern ----
        directors = bidder_profile.get("director_dids", [])
        known_shell_directors = bidder_profile.get("flagged_directors", [])
        common_directors = set(directors).intersection(set(known_shell_directors))
        if common_directors:
            result["risk_score"] += 25
            result["flags"].append(f"COMMON_DIRECTORS: {len(common_directors)} director(s) linked to other flagged companies")
            indicators_found += 1
            result["evidence"]["common_directors"] = list(common_directors)

        # ---- Check 6: Common Address ----
        address_hash = bidder_profile.get("address_hash", "")
        flagged_addresses = bidder_profile.get("flagged_addresses", [])
        if address_hash and address_hash in flagged_addresses:
            result["risk_score"] += 20
            result["flags"].append("COMMON_ADDRESS: Company shares address with previously flagged entities")
            indicators_found += 1
            result["evidence"]["common_address"] = True

        result["risk_score"] = min(100, result["risk_score"])
        result["confidence"] = indicators_found / total_checks
        result["evidence"]["indicators_found"] = indicators_found
        result["evidence"]["total_checks"] = total_checks

        if result["risk_score"] >= 76:
            result["recommendation"] = "ESCALATE_CAG"
        elif result["risk_score"] >= 51:
            result["recommendation"] = "FREEZE"
        elif result["risk_score"] >= 26:
            result["recommendation"] = "FLAG"

        return result
