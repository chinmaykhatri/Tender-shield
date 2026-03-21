// ─────────────────────────────────────────────────
// FILE: components/PreventiveFraudAlert.tsx
// TYPE: CLIENT COMPONENT
// SECRET KEYS USED: none — calls /api/ai/predict-fraud
// WHAT THIS FILE DOES: Shows predictive fraud analysis with actionable recommendations
// ─────────────────────────────────────────────────
'use client';

import { useState, useEffect } from 'react';

interface Prediction { fraud_probability: number; risk_factors: string[]; recommendations: string[]; urgency: string; demo?: boolean; }

export default function PreventiveFraudAlert({ tender }: { tender: { title?: string; ministry?: string; estimated_value_crore?: number; deadline?: string; category?: string } }) {
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/ai/predict-fraud', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tender),
    }).then(r => r.json()).then(setPrediction).catch(() => {}).finally(() => setLoading(false));
  }, [tender]);

  if (loading) return <div className="card-glass p-4 animate-pulse"><div className="h-32 bg-[var(--bg-secondary)] rounded" /></div>;
  if (!prediction || prediction.fraud_probability < 0.3) return null;

  const probPct = Math.round(prediction.fraud_probability * 100);
  const color = prediction.urgency === 'HIGH' ? '#dc2626' : prediction.urgency === 'MEDIUM' ? '#f59e0b' : '#22c55e';

  return (
    <div className="card-glass rounded-xl p-5 border-l-4" style={{ borderLeftColor: color }}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-2xl">🔮</span>
        <div>
          <h3 className="font-semibold text-sm">PREDICTIVE FRAUD ANALYSIS</h3>
          <p className="text-xs">AI predicts <b style={{ color }}>{probPct}%</b> fraud attempt probability</p>
        </div>
        <span className="ml-auto px-2 py-1 rounded text-[10px] font-bold" style={{ color, background: `${color}15` }}>
          {prediction.urgency}
        </span>
      </div>

      {/* Progress bar */}
      <div className="risk-meter mb-4">
        <div className="risk-meter-fill" style={{ width: `${probPct}%`, background: `linear-gradient(90deg, ${color}80, ${color})` }} />
      </div>

      {/* Risk factors */}
      <div className="mb-4">
        <p className="text-xs font-semibold text-[var(--text-secondary)] mb-2">Why we flagged this:</p>
        <div className="space-y-1.5">
          {prediction.risk_factors.map((f, i) => (
            <div key={i} className="flex items-start gap-2 text-xs">
              <span className="text-yellow-400 mt-0.5">⚠️</span>
              <span className="text-[var(--text-secondary)]">{f}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recommendations */}
      <div className="mb-4">
        <p className="text-xs font-semibold text-[var(--text-secondary)] mb-2">Recommended actions:</p>
        <div className="space-y-1.5">
          {prediction.recommendations.map((r, i) => (
            <div key={i} className="flex items-start gap-2 text-xs">
              <span className="text-blue-400 mt-0.5">→</span>
              <span className="text-[var(--text-secondary)]">{r}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <button className="btn-primary text-xs py-2 flex-1">Apply Fixes Automatically</button>
        <button className="px-4 py-2 rounded-xl bg-[var(--bg-secondary)] text-xs text-[var(--text-secondary)]">Override</button>
      </div>

      {prediction.demo && <p className="text-[10px] text-yellow-400 mt-2">📌 Demo prediction</p>}
    </div>
  );
}
