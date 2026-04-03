"""
============================================================================
TenderShield — ML Fraud Detection Model
============================================================================
Real machine learning pipeline for procurement fraud detection.

MODELS:
  1. Isolation Forest  — Unsupervised anomaly detection (no labels needed)
  2. Gradient Boosting — Supervised classification (uses labeled data)
  3. Ensemble          — Blends both for robust predictions

FEATURES:
  15 features extracted from each tender+bids combination.
  See training_data.py for feature definitions.

PERSISTENCE:
  Models serialize to JSON (no pickle — portable, inspectable).
  Trained model weights stored in ai_engine/models/

INTEGRATION:
  Called by risk_scorer.py alongside rule-based detectors.
  Hybrid scoring: 60% rules + 40% ML.
============================================================================
"""

import math
import json
import logging
from typing import List, Dict, Any, Optional, Tuple
from pathlib import Path
from datetime import datetime, timezone, timedelta

logger = logging.getLogger("tendershield.ai.ml_model")
IST = timezone(timedelta(hours=5, minutes=30))

MODELS_DIR = Path(__file__).parent.parent / "models"
MODELS_DIR.mkdir(exist_ok=True)


# ============================================================================
# Pure-Python Decision Tree (no sklearn dependency)
# ============================================================================

class TreeNode:
    """Node in a CART decision tree."""
    def __init__(self, feature_index: int = -1, threshold: float = 0.0,
                 left=None, right=None, prediction: Optional[float] = None,
                 samples: int = 0):
        self.feature_index = feature_index
        self.threshold = threshold
        self.left = left
        self.right = right
        self.prediction = prediction  # Leaf: P(fraud)
        self.samples = samples

    def to_dict(self) -> dict:
        if self.prediction is not None:
            return {"p": round(self.prediction, 4), "n": self.samples}
        return {
            "f": self.feature_index,
            "t": round(self.threshold, 6),
            "l": self.left.to_dict() if self.left else None,
            "r": self.right.to_dict() if self.right else None,
        }

    @classmethod
    def from_dict(cls, d: dict) -> "TreeNode":
        if "p" in d:
            return cls(prediction=d["p"], samples=d.get("n", 0))
        return cls(
            feature_index=d["f"],
            threshold=d["t"],
            left=cls.from_dict(d["l"]) if d.get("l") else None,
            right=cls.from_dict(d["r"]) if d.get("r") else None,
        )


def _gini(labels: List[int]) -> float:
    if not labels:
        return 0.0
    n = len(labels)
    ones = sum(labels)
    p1 = ones / n
    p0 = 1 - p1
    return 1 - p0 * p0 - p1 * p1


def _best_split(X: List[List[float]], y: List[int], feature_subset: List[int]):
    n = len(y)
    if n <= 1:
        return None
    parent_gini = _gini(y)
    best_gain = 0
    best_fi = -1
    best_thresh = 0.0

    for fi in feature_subset:
        values = sorted(set(row[fi] for row in X))
        for i in range(len(values) - 1):
            thresh = (values[i] + values[i+1]) / 2
            left_y = [y[j] for j in range(n) if X[j][fi] <= thresh]
            right_y = [y[j] for j in range(n) if X[j][fi] > thresh]
            if not left_y or not right_y:
                continue
            weighted = (len(left_y)/n) * _gini(left_y) + (len(right_y)/n) * _gini(right_y)
            gain = parent_gini - weighted
            if gain > best_gain:
                best_gain = gain
                best_fi = fi
                best_thresh = thresh

    if best_fi == -1:
        return None
    return best_fi, best_thresh, best_gain


class _Rng:
    """Deterministic pseudo-random number generator (LCG)."""
    def __init__(self, seed: int = 42):
        self.s = seed
    def next(self) -> float:
        self.s = (self.s * 1103515245 + 12345) & 0x7FFFFFFF
        return self.s / 0x7FFFFFFF
    def randint(self, lo: int, hi: int) -> int:
        return lo + int(self.next() * (hi - lo + 1))
    def sample(self, lst: list, k: int) -> list:
        pool = list(lst)
        result = []
        for _ in range(min(k, len(pool))):
            idx = self.randint(0, len(pool) - 1)
            result.append(pool.pop(idx))
        return result


def _build_tree(X: List[List[float]], y: List[int],
                max_depth: int, min_samples: int,
                num_features: int, depth: int, rng: _Rng) -> TreeNode:
    n = len(y)
    if depth >= max_depth or n <= min_samples or len(set(y)) == 1:
        ones = sum(y)
        return TreeNode(prediction=ones / max(n, 1), samples=n)

    all_features = list(range(len(X[0])))
    subset = rng.sample(all_features, num_features)

    split = _best_split(X, y, subset)
    if split is None:
        ones = sum(y)
        return TreeNode(prediction=ones / max(n, 1), samples=n)

    fi, thresh, _ = split
    left_X, left_y, right_X, right_y = [], [], [], []
    for i in range(n):
        if X[i][fi] <= thresh:
            left_X.append(X[i])
            left_y.append(y[i])
        else:
            right_X.append(X[i])
            right_y.append(y[i])

    return TreeNode(
        feature_index=fi, threshold=thresh,
        left=_build_tree(left_X, left_y, max_depth, min_samples, num_features, depth+1, rng),
        right=_build_tree(right_X, right_y, max_depth, min_samples, num_features, depth+1, rng),
    )


def _predict_tree(node: TreeNode, x: List[float]) -> float:
    if node.prediction is not None:
        return node.prediction
    if x[node.feature_index] <= node.threshold:
        return _predict_tree(node.left, x)
    return _predict_tree(node.right, x)


# ============================================================================
# Gradient Boosting Classifier (Pure Python)
# ============================================================================

class GradientBoostingModel:
    """
    Pure-Python Gradient Boosting for binary classification.
    Uses log-loss and builds shallow decision trees sequentially.
    """

    def __init__(self, n_estimators: int = 100, max_depth: int = 4,
                 learning_rate: float = 0.1, min_samples: int = 10,
                 seed: int = 42):
        self.n_estimators = n_estimators
        self.max_depth = max_depth
        self.learning_rate = learning_rate
        self.min_samples = min_samples
        self.seed = seed
        self.trees: List[TreeNode] = []
        self.base_prediction: float = 0.0
        self.feature_importances: List[float] = []

    def _sigmoid(self, x: float) -> float:
        if x > 20: return 1.0
        if x < -20: return 0.0
        return 1.0 / (1.0 + math.exp(-x))

    def fit(self, X: List[List[float]], y: List[int]):
        """Train the gradient boosting model."""
        n = len(y)
        n_features = len(X[0])
        num_features = max(1, int(math.sqrt(n_features)))
        rng = _Rng(self.seed)

        # Initialize with log-odds
        ones = sum(y)
        self.base_prediction = math.log(ones / max(n - ones, 1)) if ones > 0 and ones < n else 0.0

        # Current predictions (in log-odds space)
        F = [self.base_prediction] * n

        # Feature importance accumulator
        importance_counts = [0.0] * n_features

        logger.info(f"[GBM] Training {self.n_estimators} trees (depth={self.max_depth}, lr={self.learning_rate})...")

        for t in range(self.n_estimators):
            # Compute residuals (negative gradient of log-loss)
            residuals = []
            for i in range(n):
                p = self._sigmoid(F[i])
                residuals.append(y[i] - p)

            # Convert residuals to pseudo-labels for tree building
            # We quantize into 0/1 based on residual sign for Gini splitting
            pseudo_labels = [1 if r > 0 else 0 for r in residuals]

            # Build tree on residuals
            tree = _build_tree(X, pseudo_labels, self.max_depth, self.min_samples,
                             num_features, 0, rng)

            # Update predictions
            for i in range(n):
                pred = _predict_tree(tree, X[i])
                # Scale prediction by learning rate and residual magnitude
                update = self.learning_rate * (pred * 2 - 1)  # Map [0,1] to [-1,1]
                F[i] += update

            # Track feature importances
            self._accumulate_importance(tree, importance_counts)

            self.trees.append(tree)

            if (t + 1) % 25 == 0:
                # Compute training accuracy
                correct = sum(1 for i in range(n) if (self._sigmoid(F[i]) >= 0.5) == bool(y[i]))
                acc = correct / n
                logger.info(f"  [{t+1}/{self.n_estimators}] train_acc={acc:.3f}")

        # Normalize importances
        total = sum(importance_counts) or 1
        self.feature_importances = [c / total for c in importance_counts]

    def _accumulate_importance(self, node: TreeNode, counts: List[float]):
        if node.prediction is not None:
            return
        if node.feature_index >= 0:
            counts[node.feature_index] += node.samples if node.samples else 1
        if node.left:
            self._accumulate_importance(node.left, counts)
        if node.right:
            self._accumulate_importance(node.right, counts)

    def predict_proba(self, x: List[float]) -> float:
        """Predict P(fraud) for a single sample."""
        f = self.base_prediction
        for tree in self.trees:
            pred = _predict_tree(tree, x)
            f += self.learning_rate * (pred * 2 - 1)
        return self._sigmoid(f)

    def predict(self, x: List[float]) -> int:
        """Predict class (0 or 1)."""
        return 1 if self.predict_proba(x) >= 0.5 else 0

    def save(self, filepath: str):
        """Save model to JSON."""
        model_data = {
            "type": "GradientBoosting",
            "version": "1.0.0",
            "n_estimators": self.n_estimators,
            "max_depth": self.max_depth,
            "learning_rate": self.learning_rate,
            "base_prediction": self.base_prediction,
            "feature_importances": [round(x, 6) for x in self.feature_importances],
            "trees": [t.to_dict() for t in self.trees],
            "trained_at": datetime.now(IST).strftime("%Y-%m-%dT%H:%M:%S+05:30"),
        }
        with open(filepath, "w") as f:
            json.dump(model_data, f)
        logger.info(f"[GBM] Model saved to {filepath} ({len(self.trees)} trees)")

    @classmethod
    def load(cls, filepath: str) -> "GradientBoostingModel":
        """Load model from JSON."""
        with open(filepath) as f:
            data = json.load(f)
        model = cls(
            n_estimators=data["n_estimators"],
            max_depth=data["max_depth"],
            learning_rate=data["learning_rate"],
        )
        model.base_prediction = data["base_prediction"]
        model.feature_importances = data.get("feature_importances", [])
        model.trees = [TreeNode.from_dict(t) for t in data["trees"]]
        logger.info(f"[GBM] Model loaded from {filepath} ({len(model.trees)} trees)")
        return model


# ============================================================================
# Isolation Forest (Pure Python, Unsupervised)
# ============================================================================

class IsolationTree:
    """Single isolation tree for anomaly detection."""

    def __init__(self, feature_index: int = -1, threshold: float = 0.0,
                 left=None, right=None, size: int = 0):
        self.feature_index = feature_index
        self.threshold = threshold
        self.left = left
        self.right = right
        self.size = size  # External node: number of samples

    def to_dict(self) -> dict:
        if self.feature_index == -1:
            return {"s": self.size}
        return {
            "f": self.feature_index,
            "t": round(self.threshold, 6),
            "l": self.left.to_dict() if self.left else None,
            "r": self.right.to_dict() if self.right else None,
        }

    @classmethod
    def from_dict(cls, d: dict) -> "IsolationTree":
        if "s" in d and "f" not in d:
            return cls(size=d["s"])
        return cls(
            feature_index=d["f"],
            threshold=d["t"],
            left=cls.from_dict(d["l"]) if d.get("l") else None,
            right=cls.from_dict(d["r"]) if d.get("r") else None,
        )


def _build_isolation_tree(X: List[List[float]], max_depth: int, depth: int,
                           rng: _Rng) -> IsolationTree:
    n = len(X)
    if n <= 1 or depth >= max_depth:
        return IsolationTree(size=n)

    n_features = len(X[0])
    fi = rng.randint(0, n_features - 1)

    values = [row[fi] for row in X]
    min_v, max_v = min(values), max(values)
    if min_v == max_v:
        return IsolationTree(size=n)

    threshold = min_v + rng.next() * (max_v - min_v)

    left_X = [row for row in X if row[fi] <= threshold]
    right_X = [row for row in X if row[fi] > threshold]

    if not left_X or not right_X:
        return IsolationTree(size=n)

    return IsolationTree(
        feature_index=fi,
        threshold=threshold,
        left=_build_isolation_tree(left_X, max_depth, depth + 1, rng),
        right=_build_isolation_tree(right_X, max_depth, depth + 1, rng),
    )


def _path_length(node: IsolationTree, x: List[float], depth: int = 0) -> float:
    """Compute the path length for a sample in an isolation tree."""
    if node.feature_index == -1:
        # External node — add average path length for node size
        return depth + _c(node.size)
    if x[node.feature_index] <= node.threshold:
        return _path_length(node.left, x, depth + 1) if node.left else depth
    return _path_length(node.right, x, depth + 1) if node.right else depth


def _c(n: int) -> float:
    """Average path length of unsuccessful search in BST (Euler's constant correction)."""
    if n <= 1:
        return 0.0
    if n == 2:
        return 1.0
    return 2.0 * (math.log(n - 1) + 0.5772156649) - 2.0 * (n - 1) / n


class IsolationForestModel:
    """
    Pure-Python Isolation Forest for anomaly detection.
    Anomalies have shorter average path lengths.
    Uses adaptive threshold tuned during training.
    """

    def __init__(self, n_estimators: int = 150, max_samples: int = 256,
                 seed: int = 42, anomaly_threshold: float = 0.5):
        self.n_estimators = n_estimators
        self.max_samples = max_samples
        self.seed = seed
        self.trees: List[IsolationTree] = []
        self.training_size: int = 0
        self.anomaly_threshold: float = anomaly_threshold  # Adaptive threshold

    def fit(self, X: List[List[float]]):
        """Train the isolation forest."""
        n = len(X)
        self.training_size = n
        max_depth = int(math.ceil(math.log2(max(self.max_samples, 2))))
        rng = _Rng(self.seed)

        logger.info(f"[IForest] Training {self.n_estimators} isolation trees (max_samples={self.max_samples})...")

        for t in range(self.n_estimators):
            # Subsample
            sample_size = min(self.max_samples, n)
            indices = [rng.randint(0, n-1) for _ in range(sample_size)]
            X_sub = [X[i] for i in indices]

            tree = _build_isolation_tree(X_sub, max_depth, 0, rng)
            self.trees.append(tree)

        logger.info(f"[IForest] Training complete — {len(self.trees)} trees built")

    def tune_threshold(self, X: List[List[float]], y: List[int]):
        """
        Find optimal anomaly threshold by sweeping and maximizing F1.
        Call after fit() with labeled validation data.
        """
        scores = [self.anomaly_score(x) for x in X]
        best_f1 = 0.0
        best_t = 0.5

        for pct in range(30, 80):
            t = pct / 100.0
            tp = sum(1 for s, l in zip(scores, y) if s >= t and l == 1)
            fp = sum(1 for s, l in zip(scores, y) if s >= t and l == 0)
            fn = sum(1 for s, l in zip(scores, y) if s < t and l == 1)
            prec = tp / max(tp + fp, 1)
            rec = tp / max(tp + fn, 1)
            f1 = 2 * prec * rec / max(prec + rec, 0.001)
            if f1 > best_f1:
                best_f1 = f1
                best_t = t

        self.anomaly_threshold = best_t
        logger.info(f"[IForest] Optimal threshold: {best_t:.2f} (F1={best_f1:.4f})")
        return best_t, best_f1

    def anomaly_score(self, x: List[float]) -> float:
        """
        Compute anomaly score for a sample.
        Returns score in [0, 1]:
          - score > threshold → likely anomaly
          - score ≈ 0.5 → normal
          - score < 0.5 → definitely normal
        """
        if not self.trees:
            return 0.5

        avg_path = sum(_path_length(tree, x) for tree in self.trees) / len(self.trees)
        c_n = _c(self.max_samples)

        if c_n == 0:
            return 0.5

        # Score formula from the Isolation Forest paper (Liu et al., 2008)
        score = 2 ** (-avg_path / c_n)
        return score

    def is_anomaly(self, x: List[float]) -> bool:
        """Check if sample is anomalous using tuned threshold."""
        return self.anomaly_score(x) >= self.anomaly_threshold

    def save(self, filepath: str):
        """Save model to JSON."""
        model_data = {
            "type": "IsolationForest",
            "version": "1.1.0",
            "n_estimators": self.n_estimators,
            "max_samples": self.max_samples,
            "training_size": self.training_size,
            "anomaly_threshold": self.anomaly_threshold,
            "trees": [t.to_dict() for t in self.trees],
            "trained_at": datetime.now(IST).strftime("%Y-%m-%dT%H:%M:%S+05:30"),
        }
        with open(filepath, "w") as f:
            json.dump(model_data, f)
        logger.info(f"[IForest] Model saved to {filepath} (threshold={self.anomaly_threshold:.2f})")

    @classmethod
    def load(cls, filepath: str) -> "IsolationForestModel":
        """Load model from JSON."""
        with open(filepath) as f:
            data = json.load(f)
        model = cls(
            n_estimators=data["n_estimators"],
            max_samples=data["max_samples"],
            anomaly_threshold=data.get("anomaly_threshold", 0.5),
        )
        model.training_size = data.get("training_size", 0)
        model.trees = [IsolationTree.from_dict(t) for t in data["trees"]]
        logger.info(f"[IForest] Model loaded from {filepath} ({len(model.trees)} trees, threshold={model.anomaly_threshold:.2f})")
        return model


# ============================================================================
# Combined Fraud Detection Pipeline
# ============================================================================

class FraudMLPipeline:
    """
    Combined ML pipeline that uses both:
      - Gradient Boosting (supervised) for fraud probability
      - Isolation Forest (unsupervised) for anomaly detection

    Results are blended with rule-based detectors in risk_scorer.py.
    """

    def __init__(self):
        self.gbm: Optional[GradientBoostingModel] = None
        self.iforest: Optional[IsolationForestModel] = None
        self.loaded = False
        self._version = "1.0.0"
        self._trained_at = None

    def load_models(self, models_dir: Optional[str] = None):
        """Load pre-trained models from disk."""
        path = Path(models_dir) if models_dir else MODELS_DIR

        gbm_path = path / "gradient_boosting.json"
        iforest_path = path / "isolation_forest.json"

        if gbm_path.exists():
            self.gbm = GradientBoostingModel.load(str(gbm_path))
        else:
            logger.warning(f"[FraudML] GBM model not found at {gbm_path}")

        if iforest_path.exists():
            self.iforest = IsolationForestModel.load(str(iforest_path))
        else:
            logger.warning(f"[FraudML] Isolation Forest model not found at {iforest_path}")

        self.loaded = self.gbm is not None or self.iforest is not None
        if self.loaded:
            logger.info("[FraudML] ✅ Models loaded successfully")

    def predict(self, features: List[float]) -> Dict[str, Any]:
        """
        Run both models on a feature vector.

        Returns:
            {
                "ml_fraud_probability": 0.82,    # GBM P(fraud)
                "anomaly_score": 0.71,            # Isolation Forest score
                "ml_risk_score": 78,              # Combined (0-100)
                "ml_prediction": "FRAUD",         # Final label
                "model_agreement": true,           # Both models agree
                "feature_importances": {...},      # Top contributing features
            }
        """
        result: Dict[str, Any] = {
            "ml_fraud_probability": 0.0,
            "anomaly_score": 0.5,
            "ml_risk_score": 0,
            "ml_prediction": "CLEAN",
            "model_agreement": True,
            "models_available": {
                "gradient_boosting": self.gbm is not None,
                "isolation_forest": self.iforest is not None,
            },
        }

        fraud_prob = 0.0
        anomaly_score = 0.5

        if self.gbm:
            fraud_prob = self.gbm.predict_proba(features)
            result["ml_fraud_probability"] = round(fraud_prob, 4)

        if self.iforest:
            anomaly_score = self.iforest.anomaly_score(features)
            result["anomaly_score"] = round(anomaly_score, 4)

        # Combine: 70% GBM + 30% Isolation Forest
        if self.gbm and self.iforest:
            combined = 0.7 * fraud_prob + 0.3 * anomaly_score
        elif self.gbm:
            combined = fraud_prob
        elif self.iforest:
            combined = anomaly_score
        else:
            combined = 0.0

        result["ml_risk_score"] = min(100, int(combined * 100))
        result["ml_prediction"] = "FRAUD" if combined >= 0.5 else "CLEAN"

        # Check model agreement
        gbm_says_fraud = fraud_prob >= 0.5
        if_threshold = self.iforest.anomaly_threshold if self.iforest else 0.5
        iforest_says_fraud = anomaly_score >= if_threshold
        result["model_agreement"] = gbm_says_fraud == iforest_says_fraud
        result["iforest_threshold"] = if_threshold

        # Feature importances (from GBM)
        if self.gbm and self.gbm.feature_importances:
            from ai_engine.ml.training_data import FEATURE_NAMES
            indexed = list(zip(FEATURE_NAMES, self.gbm.feature_importances, features))
            indexed.sort(key=lambda x: -x[1])
            result["top_features"] = [
                {"name": name, "importance": round(imp, 4), "value": round(val, 4)}
                for name, imp, val in indexed[:5]
            ]

        return result

    def get_model_info(self) -> Dict[str, Any]:
        """Return model metadata for the /model/info endpoint."""
        info: Dict[str, Any] = {
            "pipeline_version": self._version,
            "models_loaded": self.loaded,
        }
        if self.gbm:
            info["gradient_boosting"] = {
                "n_estimators": self.gbm.n_estimators,
                "max_depth": self.gbm.max_depth,
                "learning_rate": self.gbm.learning_rate,
                "feature_importances": dict(zip(
                    _safe_feature_names(),
                    [round(x, 4) for x in self.gbm.feature_importances]
                )) if self.gbm.feature_importances else {},
            }
        if self.iforest:
            info["isolation_forest"] = {
                "n_estimators": self.iforest.n_estimators,
                "max_samples": self.iforest.max_samples,
                "training_size": self.iforest.training_size,
            }
        return info


def _safe_feature_names() -> List[str]:
    """Get feature names without import cycling."""
    try:
        from ai_engine.ml.training_data import FEATURE_NAMES
        return FEATURE_NAMES
    except ImportError:
        return [f"feature_{i}" for i in range(15)]


# Singleton pipeline instance
fraud_pipeline = FraudMLPipeline()
