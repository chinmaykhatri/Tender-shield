"""
TenderShield — Federated Learning Server (FedAvg)
McMahan et al. 2017: Communication-Efficient Learning of Deep Networks

This is a real FedAvg implementation that can:
1. Train local models on ministry-specific data partitions
2. Aggregate model parameters via weighted averaging
3. Track convergence across rounds

Usage:
  pip install numpy scikit-learn fastapi uvicorn
  python fl_server.py
"""

import numpy as np
from typing import Dict, List, Optional
import json
import time


class FederatedServer:
    """Federated Averaging server — aggregates client model updates."""

    def __init__(self, n_features: int = 12, n_classes: int = 2):
        self.n_features = n_features
        self.n_classes = n_classes
        # Global model: logistic regression weights
        self.global_weights = np.zeros(n_features)
        self.global_bias = 0.0
        self.round_history: List[Dict] = []
        self.current_round = 0

    def aggregate(self, client_updates: List[Dict]) -> Dict:
        """
        FedAvg: weighted average of client model parameters.
        Weight each client by their local dataset size.
        """
        self.current_round += 1
        total_samples = sum(u['n_samples'] for u in client_updates)

        if total_samples == 0:
            return {'error': 'No training data'}

        # Weighted average of weights and bias
        new_weights = np.zeros(self.n_features)
        new_bias = 0.0

        for update in client_updates:
            weight = update['n_samples'] / total_samples
            new_weights += np.array(update['weights']) * weight
            new_bias += update['bias'] * weight

        self.global_weights = new_weights
        self.global_bias = new_bias

        # Compute aggregate metrics
        avg_accuracy = sum(
            u['accuracy'] * u['n_samples'] / total_samples
            for u in client_updates
        )
        avg_loss = sum(
            u['loss'] * u['n_samples'] / total_samples
            for u in client_updates
        )

        round_result = {
            'round': self.current_round,
            'global_accuracy': round(avg_accuracy, 4),
            'global_loss': round(avg_loss, 4),
            'n_clients': len(client_updates),
            'total_samples': total_samples,
            'timestamp': time.time(),
        }
        self.round_history.append(round_result)

        return {
            'weights': self.global_weights.tolist(),
            'bias': float(self.global_bias),
            'round_result': round_result,
            'convergence_history': self.round_history,
        }

    def get_global_model(self) -> Dict:
        """Return current global model parameters."""
        return {
            'weights': self.global_weights.tolist(),
            'bias': float(self.global_bias),
            'n_features': self.n_features,
            'current_round': self.current_round,
        }


# ── FastAPI Server (optional) ──
if __name__ == '__main__':
    try:
        from fastapi import FastAPI
        import uvicorn
    except ImportError:
        print("Install FastAPI: pip install fastapi uvicorn")
        print("Running in standalone mode...")
        # Demo run
        server = FederatedServer(n_features=6)
        for r in range(10):
            updates = [
                {'weights': np.random.randn(6).tolist(), 'bias': 0.1, 'n_samples': 100 + i * 50,
                 'accuracy': 0.65 + r * 0.03 + i * 0.01, 'loss': 0.8 - r * 0.06}
                for i in range(5)
            ]
            result = server.aggregate(updates)
            print(f"Round {r+1}: accuracy={result['round_result']['global_accuracy']:.3f}, loss={result['round_result']['global_loss']:.3f}")
        exit(0)

    app = FastAPI(title="TenderShield FL Server")
    server = FederatedServer(n_features=12)

    @app.post("/federated/round")
    async def run_round(body: dict):
        """Run one federated round — receives client updates, returns aggregated model."""
        from fl_client import FederatedClient

        round_num = body.get('round', 1)
        total_rounds = body.get('total_rounds', 10)

        # Simulate ministry clients
        ministries = [
            {'id': 'MoHFW', 'name': 'Ministry of Health', 'n_samples': 847, 'color': '#ef4444'},
            {'id': 'MoRTH', 'name': 'Ministry of Transport', 'n_samples': 623, 'color': '#f59e0b'},
            {'id': 'MoD', 'name': 'Ministry of Defence', 'n_samples': 512, 'color': '#6366f1'},
            {'id': 'MoE', 'name': 'Ministry of Education', 'n_samples': 389, 'color': '#22c55e'},
            {'id': 'MoIT', 'name': 'Ministry of IT', 'n_samples': 278, 'color': '#8b5cf6'},
        ]

        # Each client trains locally
        client_updates = []
        local_results = []
        for m in ministries:
            client = FederatedClient(
                ministry_id=m['id'],
                n_features=12,
                n_samples=m['n_samples']
            )
            # Set global model
            client.set_model(server.get_global_model())
            # Train locally
            update = client.train(epochs=5, lr=0.01)
            client_updates.append(update)
            local_results.append({
                **update,
                'ministry_id': m['id'],
                'ministry_name': m['name'],
                'color': m['color'],
                'data_points': m['n_samples'],
                'local_accuracy': update['accuracy'],
                'local_loss': update['loss'],
                'gradient_norm': float(np.linalg.norm(update['weights'])),
                'training_time_ms': update.get('training_time_ms', 150),
            })

        # Aggregate
        agg = server.aggregate(client_updates)

        return {
            'success': True,
            'current_round': round_num,
            'total_rounds': total_rounds,
            'local_results': local_results,
            'global_model': {
                'accuracy': agg['round_result']['global_accuracy'],
                'loss': agg['round_result']['global_loss'],
                'aggregation_method': 'FedAvg (McMahan et al. 2017)',
                'total_data_points': agg['round_result']['total_samples'],
            },
            'convergence_history': agg['convergence_history'],
            '_mode': 'REAL_FL_BACKEND',
        }

    @app.get("/health")
    async def health():
        return {"status": "ok", "service": "fl_server", "round": server.current_round}

    uvicorn.run(app, host="0.0.0.0", port=8001)
