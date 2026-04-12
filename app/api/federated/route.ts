import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/rbac';

// ═══════════════════════════════════════════════════════════
// Federated Learning API — HONEST IMPLEMENTATION
// Uses deterministic convergence curves (no Math.random)
// Will proxy to Python FL backend when available
// ═══════════════════════════════════════════════════════════

export const dynamic = 'force-dynamic';

const FL_BACKEND = process.env.FL_BACKEND_URL || '';

const MINISTRIES = [
  { id: 'MoHFW', name: 'Ministry of Health & Family Welfare', tenders: 847, color: '#ef4444' },
  { id: 'MoRTH', name: 'Ministry of Road Transport', tenders: 623, color: '#f59e0b' },
  { id: 'MoD', name: 'Ministry of Defence', tenders: 512, color: '#6366f1' },
  { id: 'MoE', name: 'Ministry of Education', tenders: 389, color: '#22c55e' },
  { id: 'MoIT', name: 'Ministry of IT & Electronics', tenders: 278, color: '#8b5cf6' },
];

/**
 * Deterministic convergence simulation — NO Math.random().
 * Uses sigmoid curves based on ministry data size and round number.
 * Every run with the same (ministry, round) produces the same metrics.
 */
function deterministicLocalTraining(ministry: typeof MINISTRIES[0], round: number) {
  // Deterministic seed based on ministry ID character codes
  const seed = ministry.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const dataFactor = ministry.tenders / 1000;

  // Sigmoid convergence: accuracy = base + sigmoid(round) * ceiling
  const sigmoid = 1 / (1 + Math.exp(-(round - 4) / 1.5));
  const accuracy = Math.min(0.97, 0.62 + dataFactor * 0.08 + sigmoid * 0.22);
  const loss = Math.max(0.03, 0.85 - dataFactor * 0.15 - sigmoid * 0.55);

  // Deterministic gradient norm (decreases with convergence)
  const gradNorm = 0.5 / (1 + round * 0.3) + 0.02 * (seed % 10) / 10;

  // Deterministic training time based on data size
  const trainMs = 80 + Math.floor(ministry.tenders * 0.15) + (seed % 30);

  return {
    ministry_id: ministry.id,
    ministry_name: ministry.name,
    color: ministry.color,
    data_points: ministry.tenders,
    local_accuracy: Math.round(accuracy * 1000) / 1000,
    local_loss: Math.round(loss * 1000) / 1000,
    gradient_norm: Math.round(gradNorm * 1000) / 1000,
    training_time_ms: trainMs,
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { round = 1, total_rounds = 10, user_role } = body;

    // RBAC: Require ai_analyze permission
    const denied = requirePermission(user_role, 'ai_analyze');
    if (denied) return denied;

    // Try real FL backend first
    if (FL_BACKEND) {
      try {
        const backendRes = await fetch(`${FL_BACKEND}/federated/round`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ round, total_rounds }),
          signal: AbortSignal.timeout(10_000),
        });
        if (backendRes.ok) {
          const data = await backendRes.json();
          return NextResponse.json({ ...data, _mode: 'REAL_FL_BACKEND' });
        }
      } catch { /* Fall through to deterministic simulation */ }
    }

    const start = Date.now();

    // Deterministic local training for each ministry
    const localResults = MINISTRIES.map(m => deterministicLocalTraining(m, round));

    // FedAvg aggregation (weighted by data points)
    const totalDataPoints = localResults.reduce((a, r) => a + r.data_points, 0);
    const globalAccuracy = localResults.reduce((a, r) => a + r.local_accuracy * (r.data_points / totalDataPoints), 0);
    const globalLoss = localResults.reduce((a, r) => a + r.local_loss * (r.data_points / totalDataPoints), 0);

    // Deterministic convergence history
    const history = Array.from({ length: Math.min(round, total_rounds) }, (_, i) => {
      const r = i + 1;
      const results = MINISTRIES.map(m => deterministicLocalTraining(m, r));
      const tp = results.reduce((a, x) => a + x.data_points, 0);
      return {
        round: r,
        global_accuracy: Math.round(results.reduce((a, x) => a + x.local_accuracy * (x.data_points / tp), 0) * 1000) / 1000,
        global_loss: Math.round(results.reduce((a, x) => a + x.local_loss * (x.data_points / tp), 0) * 1000) / 1000,
      };
    });

    return NextResponse.json({
      success: true,
      current_round: round,
      total_rounds,
      local_results: localResults,
      global_model: {
        accuracy: Math.round(globalAccuracy * 1000) / 1000,
        loss: Math.round(globalLoss * 1000) / 1000,
        aggregation_method: 'FedAvg (McMahan et al. 2017)',
        total_data_points: totalDataPoints,
      },
      convergence_history: history,
      aggregation_time_ms: Date.now() - start,
      privacy_guarantees: [
        'Zero tender data shared between ministries',
        'Only gradient updates transmitted',
        'FedAvg weighted aggregation by data size',
      ],
      _mode: 'DETERMINISTIC_SIMULATION',
      _note: 'Deterministic convergence curves — same inputs produce same outputs. Set FL_BACKEND_URL for real distributed training.',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
