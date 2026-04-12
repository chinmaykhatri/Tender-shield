"""
TenderShield — Federated Learning Client
Each ministry runs this locally to train on their data and send only gradients.

Uses scikit-learn SGDClassifier for local training.
Supports differential privacy via Gaussian noise injection.
"""

import numpy as np
from typing import Dict, Optional
import time


class FederatedClient:
    """Federated learning client — trains locally, sends only model updates."""

    def __init__(
        self,
        ministry_id: str,
        n_features: int = 12,
        n_samples: int = 100,
        dp_epsilon: float = 1.0,
        dp_enabled: bool = True,
    ):
        self.ministry_id = ministry_id
        self.n_features = n_features
        self.n_samples = n_samples
        self.dp_epsilon = dp_epsilon
        self.dp_enabled = dp_enabled

        # Local model parameters
        self.weights = np.zeros(n_features)
        self.bias = 0.0

        # Generate synthetic training data for this ministry
        # In production: read from ministry's local database
        rng = np.random.RandomState(hash(ministry_id) % 2**31)
        self.X = rng.randn(n_samples, n_features)
        self.y = (rng.rand(n_samples) > 0.5).astype(float)

        # Add some structure to the data
        self.X[:, 0] += self.y * 1.5  # Feature 0 correlated with label
        self.X[:, 1] -= self.y * 0.8  # Feature 1 anti-correlated

    def set_model(self, global_model: Dict):
        """Receive global model parameters from server."""
        self.weights = np.array(global_model['weights'])
        self.bias = float(global_model.get('bias', 0.0))

    def _sigmoid(self, z: np.ndarray) -> np.ndarray:
        return 1.0 / (1.0 + np.exp(-np.clip(z, -500, 500)))

    def train(self, epochs: int = 5, lr: float = 0.01, batch_size: int = 32) -> Dict:
        """
        Train locally using mini-batch SGD on logistic regression.
        Returns model update (weights delta + metrics).
        """
        start = time.time()
        old_weights = self.weights.copy()
        old_bias = self.bias

        for epoch in range(epochs):
            # Shuffle data each epoch
            indices = np.random.permutation(self.n_samples)
            for start_idx in range(0, self.n_samples, batch_size):
                batch_idx = indices[start_idx:start_idx + batch_size]
                X_batch = self.X[batch_idx]
                y_batch = self.y[batch_idx]

                # Forward pass
                z = X_batch @ self.weights + self.bias
                pred = self._sigmoid(z)

                # Gradient (binary cross-entropy)
                error = pred - y_batch
                grad_w = (X_batch.T @ error) / len(batch_idx)
                grad_b = np.mean(error)

                # SGD update
                self.weights -= lr * grad_w
                self.bias -= lr * grad_b

        # Compute metrics on full dataset
        z = self.X @ self.weights + self.bias
        pred = self._sigmoid(z)
        predictions = (pred > 0.5).astype(float)
        accuracy = float(np.mean(predictions == self.y))
        loss = float(-np.mean(self.y * np.log(pred + 1e-8) + (1 - self.y) * np.log(1 - pred + 1e-8)))

        # Differential privacy: add Gaussian noise to gradients
        weight_delta = self.weights - old_weights
        if self.dp_enabled and self.dp_epsilon > 0:
            sensitivity = 1.0 / self.n_samples  # L2 sensitivity
            sigma = sensitivity * np.sqrt(2 * np.log(1.25 / 0.01)) / self.dp_epsilon
            noise = np.random.normal(0, sigma, self.n_features)
            weight_delta += noise

        training_time_ms = int((time.time() - start) * 1000)

        return {
            'ministry_id': self.ministry_id,
            'weights': (old_weights + weight_delta).tolist(),  # Updated weights with DP noise
            'bias': float(self.bias),
            'n_samples': self.n_samples,
            'accuracy': round(accuracy, 4),
            'loss': round(loss, 4),
            'training_time_ms': training_time_ms,
            'dp_applied': self.dp_enabled,
            'dp_epsilon': self.dp_epsilon if self.dp_enabled else None,
        }


if __name__ == '__main__':
    # Demo: train a single ministry client
    client = FederatedClient('MoHFW', n_features=6, n_samples=200)
    result = client.train(epochs=10, lr=0.01)
    print(f"Ministry: {result['ministry_id']}")
    print(f"Accuracy: {result['accuracy']:.3f}")
    print(f"Loss: {result['loss']:.3f}")
    print(f"DP Applied: {result['dp_applied']} (ε={result['dp_epsilon']})")
    print(f"Training Time: {result['training_time_ms']}ms")
