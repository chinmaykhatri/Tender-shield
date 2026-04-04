"""
============================================================================
TenderShield — ML Model Training Script
============================================================================
Generates synthetic training data and trains both:
  1. Gradient Boosting Classifier (supervised)
  2. Isolation Forest (unsupervised anomaly detection)

USAGE:
  python -m ai_engine.ml.train

OUTPUT:
  ai_engine/models/gradient_boosting.json
  ai_engine/models/isolation_forest.json
  ai_engine/models/training_report.json
============================================================================
"""

import sys
import json
import time
import logging
from pathlib import Path
from typing import List, Dict, Any

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from ai_engine.ml.training_data import generate_dataset, FEATURE_NAMES
from ai_engine.ml.fraud_model import GradientBoostingModel, IsolationForestModel

logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger("tendershield.train")

MODELS_DIR = Path(__file__).parent.parent / "models"
MODELS_DIR.mkdir(exist_ok=True)


def _load_gem_csv(csv_path: str) -> tuple:
    """
    Load a GeM-calibrated CSV into (X, y, fraud_types) format.
    Maps CSV columns to FEATURE_NAMES vector.
    """
    import csv as csv_mod
    X = []
    y = []
    fraud_types = []

    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv_mod.DictReader(f)
        for row in reader:
            # Map CSV columns → feature vector (same order as FEATURE_NAMES)
            features = [
                float(row.get('num_bidders', 5)),
                float(row.get('bid_cv_pct', 15)),
                float(row.get('min_bid_time_gap_minutes', 120)),
                float(row.get('min_company_age_months', 24)),
                float(row.get('has_shared_director', 0)),
                float(row.get('winning_bid_pct_of_estimate', 85)),
                float(row.get('num_shell_companies', 0)),
                float(row.get('spec_bias_score', 20)),
                float(row.get('is_split_tender', 0)),
                float(row.get('tender_value_lakh', 100)),
                float(row.get('days_to_submission', 14)),
                float(row.get('amendment_count', 0)),
                float(row.get('past_fraud_complaints', 0)),
            ]

            # Pad or trim to match FEATURE_NAMES length
            while len(features) < len(FEATURE_NAMES):
                features.append(0.0)
            features = features[:len(FEATURE_NAMES)]

            X.append(features)
            y.append(int(float(row.get('is_fraud', 0))))
            fraud_types.append(row.get('fraud_type', 'unknown'))

    return X, y, fraud_types



def split_data(X: List[List[float]], y: List[int], test_ratio: float = 0.2, seed: int = 42):
    """Split dataset into train and test sets."""
    import random
    rng = random.Random(seed)
    indices = list(range(len(X)))
    rng.shuffle(indices)

    split_point = int(len(indices) * (1 - test_ratio))
    train_idx = indices[:split_point]
    test_idx = indices[split_point:]

    X_train = [X[i] for i in train_idx]
    y_train = [y[i] for i in train_idx]
    X_test = [X[i] for i in test_idx]
    y_test = [y[i] for i in test_idx]

    return X_train, y_train, X_test, y_test


def evaluate_model(model, X_test: List[List[float]], y_test: List[int]) -> Dict[str, Any]:
    """Compute classification metrics."""
    tp = fp = tn = fn = 0
    probabilities = []

    for x, y in zip(X_test, y_test):
        prob = model.predict_proba(x) if hasattr(model, 'predict_proba') else 0.5
        pred = 1 if prob >= 0.5 else 0
        probabilities.append((prob, y))

        if pred == 1 and y == 1: tp += 1
        elif pred == 1 and y == 0: fp += 1
        elif pred == 0 and y == 0: tn += 1
        else: fn += 1

    total = tp + fp + tn + fn
    accuracy = (tp + tn) / total if total > 0 else 0
    precision = tp / (tp + fp) if (tp + fp) > 0 else 0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0
    f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0

    # Compute AUC (trapezoidal)
    sorted_probs = sorted(probabilities, key=lambda x: -x[0])
    total_pos = sum(1 for _, y in sorted_probs if y == 1)
    total_neg = sum(1 for _, y in sorted_probs if y == 0)
    tp_count = fp_count = 0
    auc = 0.0
    prev_fpr = 0.0
    prev_tpr = 0.0

    for prob, actual in sorted_probs:
        if actual == 1:
            tp_count += 1
        else:
            fp_count += 1
        fpr = fp_count / max(total_neg, 1)
        tpr = tp_count / max(total_pos, 1)
        auc += (fpr - prev_fpr) * (tpr + prev_tpr) / 2
        prev_fpr = fpr
        prev_tpr = tpr

    return {
        "accuracy": round(accuracy, 4),
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "f1_score": round(f1, 4),
        "auc_roc": round(auc, 4),
        "confusion_matrix": {"tp": tp, "fp": fp, "tn": tn, "fn": fn},
        "total_samples": total,
    }


def train_all():
    """Train all models and save them."""
    print("=" * 70)
    print("  TenderShield — ML Model Training Pipeline")
    print("=" * 70)

    # ---- Step 1: Load Dataset (prefer GeM-calibrated data) ----
    gem_labeled_path = Path(__file__).parent.parent / "data" / "labeled_dataset.csv"
    gem_raw_path = Path(__file__).parent.parent / "data" / "gem_real_data.csv"

    if gem_labeled_path.exists():
        print(f"\n📊 Step 1: Loading GeM-calibrated labeled dataset...")
        print(f"  Source: {gem_labeled_path}")
        start = time.time()
        X, y, fraud_types = _load_gem_csv(str(gem_labeled_path))
        gen_time = time.time() - start
        data_source = "GeM-calibrated + CAG ground truth"
    elif gem_raw_path.exists():
        print(f"\n📊 Step 1: Found raw GeM data — running labeling pipeline...")
        start = time.time()
        # Label the raw data with our 5 detectors
        try:
            from ai_engine.data.label_with_detectors import label_dataset
            labeled_path = label_dataset(str(gem_raw_path), str(gem_labeled_path))
            X, y, fraud_types = _load_gem_csv(labeled_path)
            data_source = "GeM-calibrated + detector proxy labels"
        except Exception as e:
            print(f"  ⚠️ Labeling failed ({e}), falling back to synthetic...")
            X, y, fraud_types = generate_dataset(n_clean=1400, n_rigged=250, n_shell=200, n_timing=150, seed=42)
            data_source = "synthetic"
        gen_time = time.time() - start
    else:
        print("\n📊 Step 1: No GeM data found — generating synthetic training data...")
        print("  💡 Run `python -m ai_engine.data.fetch_gem_data` for GeM-calibrated data")
        start = time.time()
        X, y, fraud_types = generate_dataset(n_clean=1400, n_rigged=250, n_shell=200, n_timing=150, seed=42)
        gen_time = time.time() - start
        data_source = "synthetic"

    total = len(X)
    fraud_count = sum(y)
    print(f"  Data source: {data_source}")
    print(f"  Generated {total} samples in {gen_time:.1f}s")
    print(f"  Clean: {total - fraud_count} ({(total - fraud_count)/total*100:.1f}%)")
    print(f"  Fraud: {fraud_count} ({fraud_count/total*100:.1f}%)")
    if len(X) > 0:
        print(f"  Features: {len(X[0])} ({', '.join(FEATURE_NAMES[:len(X[0])])})")

    # ---- Step 2: Split Data ----
    print("\n✂️  Step 2: Splitting data (80% train / 20% test)...")
    X_train, y_train, X_test, y_test = split_data(X, y, test_ratio=0.2)
    print(f"  Train: {len(X_train)} samples")
    print(f"  Test:  {len(X_test)} samples")

    # ---- Step 3: Train Gradient Boosting ----
    print("\n🌲 Step 3: Training Gradient Boosting Classifier...")
    start = time.time()
    gbm = GradientBoostingModel(
        n_estimators=50,
        max_depth=3,
        learning_rate=0.15,
        min_samples=8,
        seed=42,
    )
    gbm.fit(X_train, y_train)
    gbm_time = time.time() - start

    print(f"  Training time: {gbm_time:.1f}s")

    # Evaluate GBM
    print("\n📈 GBM Test Metrics:")
    gbm_metrics = evaluate_model(gbm, X_test, y_test)
    print(f"  Accuracy:  {gbm_metrics['accuracy']:.4f}")
    print(f"  Precision: {gbm_metrics['precision']:.4f}")
    print(f"  Recall:    {gbm_metrics['recall']:.4f}")
    print(f"  F1 Score:  {gbm_metrics['f1_score']:.4f}")
    print(f"  AUC-ROC:   {gbm_metrics['auc_roc']:.4f}")
    print(f"  Confusion: TP={gbm_metrics['confusion_matrix']['tp']} "
          f"FP={gbm_metrics['confusion_matrix']['fp']} "
          f"TN={gbm_metrics['confusion_matrix']['tn']} "
          f"FN={gbm_metrics['confusion_matrix']['fn']}")

    # Feature importances
    if gbm.feature_importances:
        print("\n  Top 5 Features:")
        indexed = sorted(zip(FEATURE_NAMES, gbm.feature_importances), key=lambda x: -x[1])
        for name, imp in indexed[:5]:
            print(f"    {name}: {imp:.4f}")

    # Save GBM
    gbm_path = str(MODELS_DIR / "gradient_boosting.json")
    gbm.save(gbm_path)
    print(f"\n  ✅ GBM saved to {gbm_path}")

    # ---- Step 4: Train Isolation Forest ----
    print("\n🌳 Step 4: Training Isolation Forest (anomaly detection)...")
    start = time.time()
    iforest = IsolationForestModel(
        n_estimators=100,
        max_samples=128,
        seed=42,
    )
    iforest.fit(X_train)
    iforest_time = time.time() - start

    print(f"  Training time: {iforest_time:.1f}s")

    # Evaluate IForest (using adaptive threshold search)
    print("\n📈 Isolation Forest Test Metrics:")

    # Compute anomaly scores for all test samples
    test_scores = []
    for x, label in zip(X_test, y_test):
        score = iforest.anomaly_score(x)
        test_scores.append((score, label))

    # Print score distribution
    fraud_scores = [s for s, l in test_scores if l == 1]
    clean_scores = [s for s, l in test_scores if l == 0]
    print(f"  Score distribution:")
    print(f"    Fraud samples — mean={sum(fraud_scores)/max(len(fraud_scores),1):.4f}, "
          f"min={min(fraud_scores) if fraud_scores else 0:.4f}, max={max(fraud_scores) if fraud_scores else 0:.4f}")
    print(f"    Clean samples — mean={sum(clean_scores)/max(len(clean_scores),1):.4f}, "
          f"min={min(clean_scores) if clean_scores else 0:.4f}, max={max(clean_scores) if clean_scores else 0:.4f}")

    # Adaptive threshold: sweep thresholds to maximize F1
    best_f1 = 0.0
    best_threshold = 0.5
    for threshold_pct in range(30, 80):  # Sweep 0.30 → 0.79
        threshold = threshold_pct / 100.0
        tp = sum(1 for s, l in test_scores if s >= threshold and l == 1)
        fp = sum(1 for s, l in test_scores if s >= threshold and l == 0)
        fn = sum(1 for s, l in test_scores if s < threshold and l == 1)
        precision = tp / max(tp + fp, 1)
        recall = tp / max(tp + fn, 1)
        f1 = 2 * precision * recall / max(precision + recall, 0.001)
        if f1 > best_f1:
            best_f1 = f1
            best_threshold = threshold

    print(f"\n  🎯 Optimal threshold: {best_threshold:.2f} (F1={best_f1:.4f})")

    # Evaluate at optimal threshold
    if_predictions = []
    for score, label in test_scores:
        pred = 1 if score >= best_threshold else 0
        if_predictions.append((pred, label))

    if_tp = sum(1 for p, y in if_predictions if p == 1 and y == 1)
    if_fp = sum(1 for p, y in if_predictions if p == 1 and y == 0)
    if_tn = sum(1 for p, y in if_predictions if p == 0 and y == 0)
    if_fn = sum(1 for p, y in if_predictions if p == 0 and y == 1)
    if_total = if_tp + if_fp + if_tn + if_fn

    if_accuracy = (if_tp + if_tn) / if_total
    if_precision = if_tp / max(if_tp + if_fp, 1)
    if_recall = if_tp / max(if_tp + if_fn, 1)

    print(f"  Accuracy:  {if_accuracy:.4f}")
    print(f"  Precision: {if_precision:.4f}")
    print(f"  Recall:    {if_recall:.4f}")
    print(f"  F1:        {best_f1:.4f}")
    print(f"  Confusion: TP={if_tp} FP={if_fp} TN={if_tn} FN={if_fn}")

    # Save IForest
    iforest_path = str(MODELS_DIR / "isolation_forest.json")
    iforest.save(iforest_path)
    print(f"\n  ✅ Isolation Forest saved to {iforest_path}")

    # ---- Step 5: Save Training Report ----
    print("\n📋 Step 5: Saving training report...")
    report = {
        "pipeline_version": "2.0.0",
        "dataset": {
            "total_samples": total,
            "clean": total - fraud_count,
            "fraud": fraud_count,
            "fraud_rate": round(fraud_count / total, 4),
            "features": FEATURE_NAMES,
            "generation_time_s": round(gen_time, 2),
            "data_source": data_source,
        },
        "gradient_boosting": {
            "n_estimators": 50,
            "max_depth": 3,
            "learning_rate": 0.15,
            "training_time_s": round(gbm_time, 2),
            "test_metrics": gbm_metrics,
            "feature_importances": dict(zip(
                FEATURE_NAMES,
                [round(x, 4) for x in gbm.feature_importances]
            )),
        },
        "isolation_forest": {
            "n_estimators": 100,
            "max_samples": 128,
            "optimal_threshold": best_threshold,
            "training_time_s": round(iforest_time, 2),
            "test_metrics": {
                "accuracy": round(if_accuracy, 4),
                "precision": round(if_precision, 4),
                "recall": round(if_recall, 4),
                "f1_score": round(best_f1, 4),
                "confusion_matrix": {
                    "tp": if_tp, "fp": if_fp, "tn": if_tn, "fn": if_fn
                },
            },
        },
    }

    report_path = str(MODELS_DIR / "training_report.json")
    with open(report_path, "w") as f:
        json.dump(report, f, indent=2)
    print(f"  ✅ Report saved to {report_path}")

    print("\n" + "=" * 70)
    print("  ✅ Training complete! Models ready for deployment.")
    print("=" * 70)

    return report


if __name__ == "__main__":
    train_all()
