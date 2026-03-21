// ─────────────────────────────────────────────────
// FILE: components/PricePredictionWidget.tsx
// TYPE: CLIENT COMPONENT
// SECRET KEYS USED: none — calls /api/ai/predict-price
// WHAT THIS FILE DOES: Shows AI fair price range with visual slider and bid comparison
// ─────────────────────────────────────────────────
'use client';

import { useState, useEffect } from 'react';

interface Prediction {
  fair_min_crore: number; fair_max_crore: number; fair_value_crore: number;
  confidence: number; based_on_count: number;
  flag_below_crore: number; flag_above_crore: number;
  reasoning: string; demo?: boolean;
}

export default function PricePredictionWidget({ category, estimated_value_crore, winning_bid_crore }: {
  category?: string; estimated_value_crore: number; winning_bid_crore?: number;
}) {
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/ai/predict-price', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category: category || 'GOODS', estimated_value_crore }),
    }).then(r => r.json()).then(d => setPrediction(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [category, estimated_value_crore]);

  if (loading) return <div className="card-glass p-4 animate-pulse"><div className="h-24 bg-[var(--bg-secondary)] rounded-lg" /></div>;
  if (!prediction) return null;

  const range = prediction.fair_max_crore - prediction.fair_min_crore;
  const fairPos = range ? ((prediction.fair_value_crore - prediction.fair_min_crore) / range) * 100 : 50;

  const bidPct = winning_bid_crore ? ((winning_bid_crore / estimated_value_crore) * 100).toFixed(2) : null;
  const bidSuspicious = winning_bid_crore && bidPct && parseFloat(bidPct) > 95;

  return (
    <div className="card-glass rounded-xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">🤖</span>
        <h3 className="font-semibold text-sm">AI Fair Price Range</h3>
        <span className="text-[10px] text-[var(--text-secondary)] ml-auto">Based on {prediction.based_on_count} similar tenders</span>
      </div>

      {/* Range slider */}
      <div className="relative h-8 mb-3">
        <div className="absolute top-3 left-0 right-0 h-2 rounded-full bg-[var(--bg-secondary)]">
          <div className="absolute h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-400" style={{ left: '10%', right: '10%' }} />
        </div>
        {/* Fair value marker */}
        <div className="absolute top-0" style={{ left: `${Math.max(10, Math.min(90, fairPos * 0.8 + 10))}%`, transform: 'translateX(-50%)' }}>
          <div className="w-0.5 h-8 bg-white mx-auto" />
        </div>
      </div>

      <div className="flex justify-between text-xs mb-3">
        <span className="text-green-400">₹{prediction.fair_min_crore} Cr</span>
        <span className="text-white font-bold">↑ Fair: ₹{prediction.fair_value_crore} Cr</span>
        <span className="text-green-400">₹{prediction.fair_max_crore} Cr</span>
      </div>

      {/* Winning bid comparison */}
      {winning_bid_crore && (
        <div className={`p-3 rounded-lg mt-3 ${bidSuspicious ? 'bg-red-500/10 border border-red-500/20' : 'bg-green-500/10 border border-green-500/20'}`}>
          <p className="text-sm">{bidSuspicious ? '⚠️' : '✅'} Winning bid: <b className="text-[var(--accent)]">₹{winning_bid_crore} Cr</b></p>
          <p className="text-xs text-[var(--text-secondary)] mt-1">= {bidPct}% of estimate</p>
          {bidSuspicious && <p className="text-xs text-red-400 mt-1">This is unusually close — suggests possible inside knowledge of budget.</p>}
        </div>
      )}

      <p className="text-[10px] text-[var(--text-secondary)] mt-3">{prediction.reasoning}</p>
      <p className="text-[10px] text-[var(--text-secondary)] mt-1">Confidence: {(prediction.confidence * 100).toFixed(0)}%</p>
      {prediction.demo && <p className="text-[10px] text-yellow-400 mt-1">📌 Demo prediction</p>}
    </div>
  );
}
