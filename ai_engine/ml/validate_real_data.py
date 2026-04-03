"""
============================================================================
TenderShield — Validate ML Models Against Real GeM Data
============================================================================
Runs the pre-trained GBM and Isolation Forest models against 100 authentic
GeM-pattern tenders to validate performance on real-world procurement data.

USAGE:
    python -m ai_engine.ml.validate_real_data
============================================================================
"""

import json
import sys
from pathlib import Path
from datetime import datetime, timezone, timedelta

IST = timezone(timedelta(hours=5, minutes=30))

# Add project root to path
PROJECT_ROOT = Path(__file__).parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from ai_engine.ml.real_gem_data import (
    REAL_GEM_TENDERS, CLEAN_TENDERS, FRAUD_TENDERS,
    DATASET_STATS, extract_training_features, FRAUD_PATTERNS
)
from ai_engine.ml.fraud_model import FraudMLPipeline


def validate():
    """Run validation against real GeM data."""
    print("=" * 70)
    print("  TenderShield — Real GeM Data Validation")
    print("=" * 70)
    print(f"\n  Dataset: {DATASET_STATS['total']} tenders")
    print(f"  Clean: {DATASET_STATS['clean']} | Fraud: {DATASET_STATS['fraud']}")
    print(f"  Ministries: {DATASET_STATS['ministries_covered']}")
    print(f"  Categories: {DATASET_STATS['categories_covered']}")
    print(f"  Total value: {DATASET_STATS['total_value_display']}")
    print(f"  Source: {DATASET_STATS['source']}")

    # Load pre-trained models
    print("\n  Loading pre-trained models...")
    pipeline = FraudMLPipeline()
    pipeline.load_models()

    if not pipeline.loaded:
        print("  ERROR: Models not found. Run train.py first.")
        return

    print(f"  GBM: {'loaded' if pipeline.gbm else 'missing'}")
    print(f"  IForest: {'loaded' if pipeline.iforest else 'missing'}")
    if pipeline.iforest:
        print(f"  IForest threshold: {pipeline.iforest.anomaly_threshold:.2f}")

    # Extract features from real data
    print("\n  Extracting features from real GeM data...")
    X, y = extract_training_features(REAL_GEM_TENDERS)
    print(f"  Feature vectors: {len(X)} (15 features each)")

    # Run predictions
    print("\n" + "-" * 70)
    print("  Running ML predictions on real GeM tenders...")
    print("-" * 70)

    results = []
    for i, (features, label) in enumerate(zip(X, y)):
        prediction = pipeline.predict(features)
        results.append({
            "index": i,
            "actual": label,
            "predicted": 1 if prediction["ml_prediction"] == "FRAUD" else 0,
            "gbm_prob": prediction["ml_fraud_probability"],
            "anomaly_score": prediction["anomaly_score"],
            "ml_risk_score": prediction["ml_risk_score"],
            "model_agreement": prediction["model_agreement"],
        })

    # Calculate metrics
    tp = sum(1 for r in results if r["predicted"] == 1 and r["actual"] == 1)
    fp = sum(1 for r in results if r["predicted"] == 1 and r["actual"] == 0)
    tn = sum(1 for r in results if r["predicted"] == 0 and r["actual"] == 0)
    fn = sum(1 for r in results if r["predicted"] == 0 and r["actual"] == 1)
    total = tp + fp + tn + fn

    accuracy = (tp + tn) / total
    precision = tp / max(tp + fp, 1)
    recall = tp / max(tp + fn, 1)
    f1 = 2 * precision * recall / max(precision + recall, 0.001)

    agreement_rate = sum(1 for r in results if r["model_agreement"]) / total

    print(f"\n  RESULTS ON REAL GeM DATA:")
    print(f"  {'=' * 40}")
    print(f"  Accuracy:  {accuracy:.4f} ({accuracy*100:.1f}%)")
    print(f"  Precision: {precision:.4f} ({precision*100:.1f}%)")
    print(f"  Recall:    {recall:.4f} ({recall*100:.1f}%)")
    print(f"  F1 Score:  {f1:.4f}")
    print(f"  Model Agreement: {agreement_rate:.4f} ({agreement_rate*100:.1f}%)")
    print(f"\n  Confusion Matrix:")
    print(f"    TP={tp} (fraud correctly caught)")
    print(f"    FP={fp} (false alarms)")
    print(f"    TN={tn} (clean correctly cleared)")
    print(f"    FN={fn} (fraud missed)")

    # Per-fraud-type analysis
    print(f"\n  PER-FRAUD-TYPE ANALYSIS:")
    print(f"  {'-' * 50}")
    fraud_type_results = {}
    fraud_tenders_with_features = [t for t in REAL_GEM_TENDERS if t["is_fraud"]]
    for tender, result in zip([t for t in REAL_GEM_TENDERS if len(t["bids"]) >= 2], results):
        if tender["is_fraud"]:
            ft = tender["fraud_type"]
            if ft not in fraud_type_results:
                fraud_type_results[ft] = {"correct": 0, "total": 0}
            fraud_type_results[ft]["total"] += 1
            if result["predicted"] == 1:
                fraud_type_results[ft]["correct"] += 1

    for ft, r in sorted(fraud_type_results.items()):
        detection_rate = r["correct"] / max(r["total"], 1)
        bar = "█" * int(detection_rate * 20) + "░" * (20 - int(detection_rate * 20))
        print(f"    {ft:30s} {bar} {detection_rate*100:5.1f}% ({r['correct']}/{r['total']})")

    # Save validation report
    report = {
        "validation_date": datetime.now(IST).strftime("%Y-%m-%dT%H:%M:%S+05:30"),
        "dataset": DATASET_STATS,
        "model_version": "1.1.0",
        "results": {
            "accuracy": round(accuracy, 4),
            "precision": round(precision, 4),
            "recall": round(recall, 4),
            "f1_score": round(f1, 4),
            "model_agreement_rate": round(agreement_rate, 4),
            "confusion_matrix": {"tp": tp, "fp": fp, "tn": tn, "fn": fn},
        },
        "per_fraud_type": {
            ft: {"detection_rate": r["correct"] / max(r["total"], 1), **r}
            for ft, r in fraud_type_results.items()
        },
        "data_source": "Real GeM Portal Patterns + CAG/CVC Reports",
    }

    report_path = Path(__file__).parent.parent / "models" / "real_gem_validation.json"
    with open(report_path, "w") as f:
        json.dump(report, f, indent=2)
    print(f"\n  Validation report saved: {report_path}")

    print("\n" + "=" * 70)
    print("  Validation complete!")
    print("=" * 70)

    return report


if __name__ == "__main__":
    validate()
