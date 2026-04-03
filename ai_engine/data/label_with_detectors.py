"""
============================================================================
TenderShield — Detector-Based Labeling Pipeline
============================================================================
Applies TenderShield's 5 fraud detectors as proxy labels to data records
where ground truth (confirmed fraud = CAG audit outcome) is not available.

METHODOLOGY:
  This is standard practice in fraud detection where labeled data is scarce.
  We use our rule-based detectors to label data, then train ML models on
  those labels. The ML models can then discover NEW patterns beyond what
  the rules capture (generalization).

ACKNOWLEDGED LIMITATION:
  The model may partially learn to replicate detector logic rather than
  discover truly novel patterns. This is mitigated by:
  1. Using real CAG cases as ground truth anchors
  2. Including features the detectors don't use in training
  3. Reporting all performance metrics honestly

USAGE:
  python -m ai_engine.data.label_with_detectors
============================================================================
"""

import csv
import logging
from pathlib import Path
from typing import Dict, Any, List, Tuple

logger = logging.getLogger("tendershield.ml.labeler")


def apply_5_detectors(record: Dict[str, Any]) -> Tuple[int, List[str], int]:
    """
    Apply TenderShield's 5 fraud detectors to a single record.

    Returns:
        (is_fraud, flags, risk_score)
    """
    flags: List[str] = []
    score = 0

    # ── Detector 1: Bid CV Analysis (bid rigging) ──
    cv = float(record.get('bid_cv_pct', 100))
    if cv < 2:
        score += 35
        flags.append('BID_RIGGING_CRITICAL')
    elif cv < 4:
        score += 20
        flags.append('BID_RIGGING_HIGH')
    elif cv < 6:
        score += 8
        flags.append('BID_RIGGING_MEDIUM')

    # ── Detector 2: Shell Company Detection ──
    min_age = int(record.get('min_company_age_months', 24))
    if min_age < 3:
        score += 30
        flags.append('SHELL_COMPANY_CRITICAL')
    elif min_age < 6:
        score += 20
        flags.append('SHELL_COMPANY_HIGH')
    elif min_age < 12:
        score += 8
        flags.append('SHELL_COMPANY_MEDIUM')

    # ── Detector 3: Timing Collusion ──
    timing = float(record.get('min_bid_time_gap_minutes', 9999))
    if timing < 2:
        score += 30
        flags.append('TIMING_CRITICAL')
    elif timing < 30:
        score += 15
        flags.append('TIMING_HIGH')
    elif timing < 120:
        score += 5
        flags.append('TIMING_MEDIUM')

    # ── Detector 4: Front-Running Detection ──
    win_pct = float(record.get('winning_bid_pct_of_estimate', 90))
    if win_pct > 99:
        score += 30
        flags.append('FRONT_RUNNING_CRITICAL')
    elif win_pct > 98:
        score += 20
        flags.append('FRONT_RUNNING_HIGH')
    elif win_pct > 96:
        score += 10
        flags.append('FRONT_RUNNING_MEDIUM')

    # ── Detector 5: Director Conflict / Spec Bias ──
    if int(record.get('has_shared_director', 0)) == 1:
        score += 25
        flags.append('DIRECTOR_CONFLICT')

    spec = float(record.get('spec_bias_score', 0))
    if spec > 65:
        score += 20
        flags.append('SPEC_BIAS_HIGH')
    elif spec > 45:
        score += 10
        flags.append('SPEC_BIAS_MEDIUM')

    # ── Additional signals ──
    if int(record.get('num_shell_companies', 0)) > 0:
        score += 10
        flags.append('HAS_SHELL_ENTITIES')

    if int(record.get('is_split_tender', 0)) == 1:
        score += 15
        flags.append('SPLIT_TENDER')

    num_bidders = int(record.get('num_bidders', 5))
    if num_bidders <= 1:
        score += 10
        flags.append('SINGLE_BID')

    # Clamp
    score = min(100, score)

    # Threshold: score >= 50 → FRAUD
    is_fraud = 1 if score >= 50 else 0

    return is_fraud, flags, score


def label_dataset(input_csv: str = None, output_csv: str = None) -> str:
    """
    Apply 5-detector labeling to a CSV dataset.
    Records with existing CAG_REPORT source keep their ground truth labels.
    """
    if input_csv is None:
        input_csv = str(Path(__file__).parent / 'gem_real_data.csv')
    if output_csv is None:
        output_csv = str(Path(__file__).parent / 'labeled_dataset.csv')

    records: List[Dict[str, Any]] = []

    with open(input_csv, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            records.append(dict(row))

    # Apply detectors to all records
    cag_count = 0
    detector_labeled = 0
    for record in records:
        source = record.get('data_source', '')

        if source.startswith('CAG_REPORT'):
            # Ground truth — keep existing label
            cag_count += 1
            record['label_source'] = 'CAG_GROUND_TRUTH'
            record['detector_score'] = '100'
            record['detector_flags'] = 'CAG_CONFIRMED'
        else:
            # Apply detectors as proxy labels
            is_fraud, flags, score = apply_5_detectors(record)
            record['is_fraud'] = str(is_fraud)
            record['detector_score'] = str(score)
            record['detector_flags'] = ','.join(flags) if flags else 'CLEAN'
            record['label_source'] = 'DETECTOR_PROXY'
            detector_labeled += 1

    # Save labeled dataset
    fieldnames = list(records[0].keys()) if records else []
    with open(output_csv, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(records)

    # Statistics
    total = len(records)
    fraud_count = sum(1 for r in records if int(r.get('is_fraud', 0)) == 1)
    fraud_rate = fraud_count / total if total > 0 else 0

    logger.info(f"[ML Labeling] Dataset labeled successfully")
    logger.info(f"  Total records: {total}")
    logger.info(f"  CAG ground truth: {cag_count}")
    logger.info(f"  Detector-labeled: {detector_labeled}")
    logger.info(f"  Fraud rate: {fraud_rate:.1%}")
    logger.info(f"  Output: {output_csv}")

    return output_csv


# ============================================================================
# CLI entry point
# ============================================================================

if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO, format='%(message)s')

    print("=" * 60)
    print("TenderShield — 5-Detector Labeling Pipeline")
    print("=" * 60)
    print()

    # Step 1: Generate data if not exists
    data_path = Path(__file__).parent / 'gem_real_data.csv'
    if not data_path.exists():
        print("[Step 1] Generating GeM-calibrated dataset...")
        from ai_engine.data.fetch_gem_data import generate_full_dataset, save_dataset_csv
        records = generate_full_dataset()
        save_dataset_csv(records)
    else:
        print(f"[Step 1] Found existing dataset: {data_path}")

    # Step 2: Label with detectors
    print("\n[Step 2] Applying 5-detector labeling...")
    output = label_dataset()

    # Step 3: Print report
    print("\n[Step 3] Label Distribution Report:")
    with open(output, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    # By fraud type
    fraud_types: Dict[str, int] = {}
    for r in rows:
        ft = r.get('fraud_type', 'unknown')
        fraud_types[ft] = fraud_types.get(ft, 0) + 1
    print("\n  Fraud Types:")
    for ft, count in sorted(fraud_types.items(), key=lambda x: -x[1]):
        print(f"    {ft}: {count}")

    # By label source
    print("\n  Label Sources:")
    sources: Dict[str, int] = {}
    for r in rows:
        ls = r.get('label_source', 'unknown')
        sources[ls] = sources.get(ls, 0) + 1
    for s, count in sources.items():
        print(f"    {s}: {count}")

    # Score distribution
    scores = [int(r.get('detector_score', 0)) for r in rows]
    print(f"\n  Score Distribution:")
    print(f"    Mean: {sum(scores) / len(scores):.1f}")
    print(f"    Max: {max(scores)}")
    print(f"    Min: {min(scores)}")
    for threshold in [26, 51, 76]:
        count = sum(1 for s in scores if s >= threshold)
        print(f"    Score >= {threshold}: {count} ({count / len(scores):.1%})")

    print(f"\n  Output: {output}")
    print("=" * 60)
