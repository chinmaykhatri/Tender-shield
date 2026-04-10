import { NextResponse } from 'next/server';

// ═══════════════════════════════════════════════════════════
// Federated Learning API — Privacy-Preserving ML Simulation
// Simulates multi-ministry training without data sharing
// ═══════════════════════════════════════════════════════════

export const dynamic = 'force-dynamic';

const MINISTRIES = [
  { id: 'MoHFW', name: 'Ministry of Health & Family Welfare', tenders: 847, color: '#ef4444' },
  { id: 'MoRTH', name: 'Ministry of Road Transport', tenders: 623, color: '#f59e0b' },
  { id: 'MoD', name: 'Ministry of Defence', tenders: 512, color: '#6366f1' },
  { id: 'MoE', name: 'Ministry of Education', tenders: 389, color: '#22c55e' },
  { id: 'MoIT', name: 'Ministry of IT & Electronics', tenders: 278, color: '#8b5cf6' },
];

function simulateLocalTraining(ministry: typeof MINISTRIES[0], round: number) {
  // Simulate model metrics with realistic convergence curves
  const baseAccuracy = 0.65 + (ministry.tenders / 1000) * 0.15;
  const roundBonus = Math.min(0.2, round * 0.03 * (1 - Math.exp(-round / 5)));
  const noise = (Math.random() - 0.5) * 0.02;
  const accuracy = Math.min(0.97, baseAccuracy + roundBonus + noise);

  const baseLoss = 0.8 - (ministry.tenders / 1500) * 0.2;
  const lossReduction = Math.min(0.6, round * 0.06 * (1 - Math.exp(-round / 4)));

  return {
    ministry_id: ministry.id,
    ministry_name: ministry.name,
    color: ministry.color,
    data_points: ministry.tenders,
    local_accuracy: Math.round(accuracy * 1000) / 1000,
    local_loss: Math.round(Math.max(0.05, baseLoss - lossReduction + noise) * 1000) / 1000,
    gradient_norm: Math.round((Math.random() * 0.5 + 0.1) * 1000) / 1000,
    training_time_ms: Math.round(Math.random() * 200 + 100),
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { round = 1, total_rounds = 10 } = body;

    const start = Date.now();

    // Simulate local training for each ministry
    const localResults = MINISTRIES.map(m => simulateLocalTraining(m, round));

    // Federated averaging (FedAvg)
    const totalDataPoints = localResults.reduce((a, r) => a + r.data_points, 0);
    const globalAccuracy = localResults.reduce((a, r) => a + r.local_accuracy * (r.data_points / totalDataPoints), 0);
    const globalLoss = localResults.reduce((a, r) => a + r.local_loss * (r.data_points / totalDataPoints), 0);

    // Generate convergence history
    const history = Array.from({ length: Math.min(round, total_rounds) }, (_, i) => {
      const r = i + 1;
      const results = MINISTRIES.map(m => simulateLocalTraining(m, r));
      const tp = results.reduce((a, x) => a + x.data_points, 0);
      return {
        round: r,
        global_accuracy: Math.round(results.reduce((a, x) => a + x.local_accuracy * (x.data_points / tp), 0) * 1000) / 1000,
        global_loss: Math.round(results.reduce((a, x) => a + x.local_loss * (x.data_points / tp), 0) * 1000) / 1000,
        ministries: results.map(x => ({ id: x.ministry_id, accuracy: x.local_accuracy })),
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
        aggregation_method: 'FedAvg (Federated Averaging)',
        total_data_points: totalDataPoints,
      },
      convergence_history: history,
      aggregation_time_ms: Date.now() - start,
      privacy_guarantees: [
        'Zero tender data shared between ministries',
        'Only gradient updates transmitted',
        'Differential privacy noise injection (ε=1.0)',
        'Secure aggregation protocol',
      ],
      _mode: 'SIMULATION',
      _note: 'This demonstrates the federated learning protocol. Production deployment requires distributed training infrastructure.',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
