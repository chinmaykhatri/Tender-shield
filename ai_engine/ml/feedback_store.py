"""
============================================================================
TenderShield — Behavioral Learning Feedback Store
============================================================================
Stores officer labels on tender outcomes for model retraining.

Every tender that flows through TenderShield becomes training data.
Over time, this creates a proprietary dataset no competitor can replicate.

DESIGN:
  - Primary storage: JSON Lines (append-only, git-trackable)
  - Secondary storage: Supabase (if available, for cross-instance sync)
  - Format: {tender_id, label, officer_did, features, timestamp}

LIFECYCLE:
  1. Officer reviews AI risk assessment for a tender
  2. Officer labels outcome: CLEAN / SUSPICIOUS / FRAUD_CONFIRMED / FALSE_POSITIVE
  3. Label + detector output stored as ground truth
  4. When feedback reaches 50+ records, retraining pipeline can run
  5. Retrained model replaces current model → better accuracy → more trust

THIS IS THE DATA MOAT. Claude cannot replicate this. No amount of LLM
prompting can substitute for labeled procurement fraud data from real
Indian government officers.
============================================================================
"""

import json
import logging
from pathlib import Path
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Tuple

logger = logging.getLogger("tendershield.ai.feedback")
IST = timezone(timedelta(hours=5, minutes=30))

FEEDBACK_DIR = Path(__file__).parent.parent / "data" / "feedback"
FEEDBACK_DIR.mkdir(parents=True, exist_ok=True)
FEEDBACK_FILE = FEEDBACK_DIR / "officer_labels.jsonl"

# Valid outcome labels
VALID_LABELS = frozenset({"CLEAN", "SUSPICIOUS", "FRAUD_CONFIRMED", "FALSE_POSITIVE"})


def store_feedback(
    tender_id: str,
    label: str,
    officer_did: str,
    risk_score: int,
    detector_results: Dict[str, Any],
    notes: str = "",
) -> Dict[str, Any]:
    """
    Store an officer's outcome label for a tender.
    Used as ground truth for model retraining.

    Args:
        tender_id: The tender being labeled
        label: One of CLEAN, SUSPICIOUS, FRAUD_CONFIRMED, FALSE_POSITIVE
        officer_did: DID of the labeling officer (for audit trail)
        risk_score: The original AI composite risk score
        detector_results: Per-detector breakdown from CompositeRiskScorer
        notes: Free-text justification from the officer

    Returns:
        Confirmation dict with feedback record count

    Raises:
        ValueError: If label is not in VALID_LABELS
    """
    if label not in VALID_LABELS:
        raise ValueError(f"Invalid label '{label}'. Must be one of {sorted(VALID_LABELS)}")

    record = {
        "tender_id": tender_id,
        "label": label,
        "is_fraud": label in ("SUSPICIOUS", "FRAUD_CONFIRMED"),
        "officer_did": officer_did,
        "original_risk_score": risk_score,
        "detector_results_summary": _summarize_detectors(detector_results),
        "notes": notes,
        "timestamp_ist": datetime.now(IST).strftime("%Y-%m-%dT%H:%M:%S+05:30"),
        "schema_version": 1,
    }

    # Append to JSONL file (atomic for single-process; fine for our scale)
    with open(FEEDBACK_FILE, "a", encoding="utf-8") as f:
        f.write(json.dumps(record, ensure_ascii=False) + "\n")

    total = count_feedback()
    logger.info(
        f"[Feedback] Stored: tender={tender_id}, label={label}, "
        f"officer={officer_did}, total_records={total}"
    )

    return {
        "success": True,
        "tender_id": tender_id,
        "label": label,
        "total_feedback_records": total,
        "retraining_ready": total >= 50,
    }


def _summarize_detectors(detector_results: Dict[str, Any]) -> Dict[str, int]:
    """Extract risk_score from each detector result for compact storage."""
    summary: Dict[str, int] = {}
    for key, value in detector_results.items():
        if isinstance(value, dict):
            summary[key] = value.get("risk_score", 0)
        elif isinstance(value, (int, float)):
            summary[key] = int(value)
    return summary


def get_all_feedback() -> List[Dict[str, Any]]:
    """Load all feedback records from JSONL file."""
    if not FEEDBACK_FILE.exists():
        return []

    records: List[Dict[str, Any]] = []
    with open(FEEDBACK_FILE, encoding="utf-8") as f:
        for line_num, line in enumerate(f, 1):
            line = line.strip()
            if not line:
                continue
            try:
                records.append(json.loads(line))
            except json.JSONDecodeError:
                logger.warning(f"[Feedback] Skipping malformed line {line_num}")
                continue
    return records


def count_feedback() -> int:
    """Count total feedback records (fast — doesn't parse JSON)."""
    if not FEEDBACK_FILE.exists():
        return 0
    with open(FEEDBACK_FILE, encoding="utf-8") as f:
        return sum(1 for line in f if line.strip())


def get_feedback_stats() -> Dict[str, Any]:
    """
    Get aggregate statistics about feedback data.
    Used by the dashboard to show behavioral learning progress.
    """
    records = get_all_feedback()
    if not records:
        return {
            "total": 0,
            "labels": {},
            "retraining_ready": False,
            "data_moat_score": 0,
        }

    label_counts: Dict[str, int] = {}
    false_positive_rate = 0
    accuracy_signals = 0

    for r in records:
        lbl = r.get("label", "UNKNOWN")
        label_counts[lbl] = label_counts.get(lbl, 0) + 1

        # Track cases where AI was wrong → learning signal
        if lbl == "FALSE_POSITIVE":
            false_positive_rate += 1
            accuracy_signals += 1
        elif lbl == "FRAUD_CONFIRMED" and r.get("original_risk_score", 0) < 50:
            accuracy_signals += 1  # AI missed this fraud → learning signal

    total = len(records)

    return {
        "total": total,
        "labels": label_counts,
        "retraining_ready": total >= 50,
        "false_positive_count": false_positive_rate,
        "false_positive_rate": round(false_positive_rate / max(total, 1) * 100, 1),
        "accuracy_improvement_signals": accuracy_signals,
        "data_moat_score": min(100, total * 2),  # 50 records = 100% moat
        "oldest": records[0].get("timestamp_ist", "") if records else "",
        "newest": records[-1].get("timestamp_ist", "") if records else "",
    }


def get_retraining_data() -> Tuple[List[List[float]], List[int]]:
    """
    Convert feedback records to ML training format.
    Returns (feature_matrix, labels) for model retraining.

    The features are detector-level scores (not raw bid data),
    so the retrained model learns which detector *patterns* predict
    real fraud vs false positives.
    """
    records = get_all_feedback()
    features: List[List[float]] = []
    labels: List[int] = []

    for r in records:
        detector_scores = r.get("detector_results_summary", {})
        if not detector_scores:
            continue

        # Build feature vector from detector outputs
        feature_vec = [
            detector_scores.get("BID_RIGGING", 0) / 100.0,
            detector_scores.get("COLLUSION", 0) / 100.0,
            detector_scores.get("SHELL_COMPANY", 0) / 100.0,
            detector_scores.get("CARTEL", 0) / 100.0,
            detector_scores.get("TIMING_ANOMALY", 0) / 100.0,
            detector_scores.get("BOUNDARY_GAMING", 0) / 100.0,
            r.get("original_risk_score", 0) / 100.0,
        ]
        features.append(feature_vec)
        labels.append(1 if r.get("is_fraud", False) else 0)

    return features, labels


def get_retraining_summary() -> Dict[str, Any]:
    """
    Summary of retraining data quality for the ML dashboard.
    """
    features, labels = get_retraining_data()
    if not features:
        return {
            "samples": 0,
            "fraud_count": 0,
            "clean_count": 0,
            "ready": False,
            "recommendation": "Need at least 50 labeled tenders to retrain",
        }

    fraud_count = sum(labels)
    clean_count = len(labels) - fraud_count
    fraud_ratio = fraud_count / len(labels) if labels else 0

    ready = len(labels) >= 50 and fraud_count >= 5 and clean_count >= 10

    if not ready:
        if len(labels) < 50:
            recommendation = f"Need {50 - len(labels)} more labeled tenders"
        elif fraud_count < 5:
            recommendation = f"Need {5 - fraud_count} more fraud-confirmed labels"
        else:
            recommendation = f"Need {10 - clean_count} more clean labels"
    else:
        recommendation = "Ready for retraining. Run: python -m ai_engine.ml.train --feedback"

    return {
        "samples": len(labels),
        "fraud_count": fraud_count,
        "clean_count": clean_count,
        "fraud_ratio": round(fraud_ratio * 100, 1),
        "feature_dims": len(features[0]) if features else 0,
        "ready": ready,
        "recommendation": recommendation,
    }
