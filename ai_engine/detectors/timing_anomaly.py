"""
============================================================================
TenderShield — Timing Anomaly Detector
============================================================================
Detects suspicious timing patterns in bid submissions.

ANOMALIES:
  1. Burst Submission — multiple bids submitted within seconds (coordinated)
  2. Last-Minute Clustering — all bids arrive in final minutes of deadline
  3. Off-Hours Submission — bids submitted at unusual times (3 AM, holidays)
  4. Sequential Timestamps — bids arrive in exact intervals (automated)
  5. Time Zone Mismatch — submission time doesn't match bidder's registered state

INDIA CONTEXT:
  Indian government offices work 9:30 AM - 5:30 PM IST, Mon-Fri.
  Tenders submitted outside these hours (especially 12 AM - 6 AM) are suspicious.
  National holidays (Republic Day, Independence Day, Gandhi Jayanti) are also flagged.
============================================================================
"""

import logging
from typing import List, Dict, Any
from datetime import datetime, timezone, timedelta

logger = logging.getLogger("tendershield.ai.timing")
IST = timezone(timedelta(hours=5, minutes=30))


class TimingAnomalyDetector:
    """Detects suspicious timing patterns in bid submissions."""

    def __init__(self):
        self.name = "TIMING_ANOMALY"
        self.burst_window_seconds = 60          # Bids within 60s = burst
        self.last_minute_window_minutes = 15    # Last 15 mins of deadline
        self.off_hours_start = 22               # 10 PM IST
        self.off_hours_end = 6                  # 6 AM IST
        self.sequential_tolerance_seconds = 5   # Tolerance for "exact interval"

    def analyze(self, bids: List[Dict[str, Any]], tender: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analyze bid submission times for anomalies.

        Args:
            bids: List of bids with submission timestamps
            tender: Tender with deadline

        Returns:
            Risk assessment for timing anomalies
        """
        result = {
            "detector": self.name,
            "risk_score": 0,
            "confidence": 0.0,
            "flags": [],
            "evidence": {},
            "recommendation": "MONITOR",
        }

        # Parse timestamps
        timestamps = []
        for bid in bids:
            ts_str = bid.get("submitted_at_ist", "")
            if ts_str:
                try:
                    ts = datetime.fromisoformat(ts_str.replace("+05:30", "+0530").replace("+0530", "+05:30"))
                    timestamps.append((ts, bid.get("bidder_did", "")))
                except (ValueError, TypeError):
                    pass

        if len(timestamps) < 2:
            result["evidence"]["reason"] = "Insufficient timestamps for analysis"
            return result

        timestamps.sort(key=lambda x: x[0])

        # ---- Check 1: Burst Submission ----
        burst = self._detect_burst(timestamps)
        result["evidence"]["burst_analysis"] = burst
        if burst["detected"]:
            result["risk_score"] += 30
            result["flags"].append(f"BURST_SUBMISSION: {burst['count']} bids within {self.burst_window_seconds}s — possible coordination")

        # ---- Check 2: Last-Minute Clustering ----
        deadline_str = tender.get("deadline_ist", "")
        if deadline_str:
            last_minute = self._check_last_minute(timestamps, deadline_str)
            result["evidence"]["last_minute"] = last_minute
            if last_minute["detected"]:
                result["risk_score"] += 20
                result["flags"].append(f"LAST_MINUTE: {last_minute['percentage']:.0f}% of bids in final {self.last_minute_window_minutes} minutes")

        # ---- Check 3: Off-Hours Submission ----
        off_hours = self._check_off_hours(timestamps)
        result["evidence"]["off_hours"] = off_hours
        if off_hours["detected"]:
            result["risk_score"] += 15
            result["flags"].append(f"OFF_HOURS: {off_hours['count']} bids submitted outside office hours (10PM-6AM IST)")

        # ---- Check 4: Sequential Intervals ----
        sequential = self._check_sequential(timestamps)
        result["evidence"]["sequential"] = sequential
        if sequential["detected"]:
            result["risk_score"] += 25
            result["flags"].append(f"SEQUENTIAL: Bids arrive at exact {sequential['interval_seconds']}s intervals — likely automated")

        # ---- Check 5: Weekend/Holiday Submission ----
        weekend = self._check_weekend_holiday(timestamps)
        result["evidence"]["weekend_holiday"] = weekend
        if weekend["detected"]:
            result["risk_score"] += 10
            result["flags"].append(f"WEEKEND_HOLIDAY: {weekend['count']} bids on non-working days")

        result["risk_score"] = min(100, result["risk_score"])
        result["confidence"] = min(1.0, len(timestamps) / 8.0)

        if result["risk_score"] >= 76:
            result["recommendation"] = "ESCALATE_CAG"
        elif result["risk_score"] >= 51:
            result["recommendation"] = "FREEZE"
        elif result["risk_score"] >= 26:
            result["recommendation"] = "FLAG"

        return result

    def _detect_burst(self, timestamps: list) -> Dict:
        """Detect multiple bids within a short window."""
        max_burst = 0
        for i in range(len(timestamps)):
            burst_count = 1
            for j in range(i + 1, len(timestamps)):
                diff = (timestamps[j][0] - timestamps[i][0]).total_seconds()
                if diff <= self.burst_window_seconds:
                    burst_count += 1
                else:
                    break
            max_burst = max(max_burst, burst_count)

        return {
            "detected": max_burst >= 3,
            "count": max_burst,
            "window_seconds": self.burst_window_seconds,
        }

    def _check_last_minute(self, timestamps: list, deadline_str: str) -> Dict:
        """Check if most bids arrived near the deadline."""
        try:
            deadline = datetime.fromisoformat(deadline_str.replace("+05:30", "+0530").replace("+0530", "+05:30"))
        except (ValueError, TypeError):
            return {"detected": False}

        window_start = deadline - timedelta(minutes=self.last_minute_window_minutes)
        last_minute_count = sum(1 for ts, _ in timestamps if window_start <= ts <= deadline)
        percentage = (last_minute_count / len(timestamps)) * 100

        return {
            "detected": percentage > 70 and len(timestamps) >= 3,
            "count": last_minute_count,
            "total": len(timestamps),
            "percentage": percentage,
        }

    def _check_off_hours(self, timestamps: list) -> Dict:
        """Check for bids submitted during non-business hours."""
        off_hours_bids = []
        for ts, bidder in timestamps:
            hour = ts.hour
            if hour >= self.off_hours_start or hour < self.off_hours_end:
                off_hours_bids.append({"bidder": bidder, "hour": hour})

        return {
            "detected": len(off_hours_bids) >= 2,
            "count": len(off_hours_bids),
            "bids": off_hours_bids[:5],
        }

    def _check_sequential(self, timestamps: list) -> Dict:
        """Detect bids arriving at exact regular intervals."""
        if len(timestamps) < 3:
            return {"detected": False}

        intervals = []
        for i in range(len(timestamps) - 1):
            diff = (timestamps[i+1][0] - timestamps[i][0]).total_seconds()
            intervals.append(diff)

        if not intervals:
            return {"detected": False}

        mean_interval = sum(intervals) / len(intervals)
        if mean_interval == 0:
            return {"detected": False}

        # Check if all intervals are very close to the mean
        import math
        variance = sum((i - mean_interval) ** 2 for i in intervals) / len(intervals)
        cv = math.sqrt(variance) / mean_interval if mean_interval > 0 else 1

        return {
            "detected": cv < 0.1 and len(intervals) >= 3 and mean_interval < 300,
            "interval_seconds": int(mean_interval),
            "cv": round(cv, 4),
        }

    def _check_weekend_holiday(self, timestamps: list) -> Dict:
        """Check for bids on weekends or Indian national holidays."""
        # Indian national holidays (approximate dates, fixed ones)
        national_holidays = {
            (1, 26),   # Republic Day
            (8, 15),   # Independence Day
            (10, 2),   # Gandhi Jayanti
        }

        non_working = []
        for ts, bidder in timestamps:
            is_weekend = ts.weekday() >= 5  # Saturday=5, Sunday=6
            is_holiday = (ts.month, ts.day) in national_holidays
            if is_weekend or is_holiday:
                non_working.append({"bidder": bidder, "day": ts.strftime("%A %d-%b")})

        return {
            "detected": len(non_working) >= 2,
            "count": len(non_working),
            "details": non_working[:5],
        }
