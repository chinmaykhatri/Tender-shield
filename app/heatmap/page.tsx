// ─────────────────────────────────────────────────
// FILE: app/heatmap/page.tsx
// TYPE: CLIENT COMPONENT
// SECRET KEYS USED: none
// WHAT THIS FILE DOES: India procurement risk heatmap with TreeMap, state table, and ministry breakdown
// ─────────────────────────────────────────────────
'use client';

import { useState, useEffect } from 'react';

function getRiskColor(score: number): string {
  if (score >= 70) return '#ef4444';
  if (score >= 50) return '#f97316';
  if (score >= 30) return '#f59e0b';
  return '#22c55e';
}

function TreeMapBlock({ state, maxFraud, onSelect, selected }: {
  state: any; maxFraud: number; onSelect: (s: any) => void; selected: boolean;
}) {
  const size = Math.max(60, (state.fraud_cases / Math.max(maxFraud, 1)) * 140);
  return (
    <button onClick={() => onSelect(state)}
      className={`transition-all hover:scale-105 rounded-xl text-center flex flex-col items-center justify-center ${selected ? 'ring-2 ring-white' : ''}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        background: `${getRiskColor(state.risk_score)}15`,
        border: `2px solid ${getRiskColor(state.risk_score)}40`,
        boxShadow: selected ? `0 0 20px ${getRiskColor(state.risk_score)}40` : 'none',
      }}>
      <span className="text-xs font-bold" style={{ color: getRiskColor(state.risk_score) }}>{state.code}</span>
      <span className="text-[10px] text-[var(--text-secondary)]">{state.fraud_cases}</span>
    </button>
  );
}

export default function HeatmapPage() {
  const [data, setData] = useState<any>(null);
  const [selectedState, setSelectedState] = useState<any>(null);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/heatmap/data')
      .then(r => r.json())
      .then(d => { setData(d.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const filteredStates = filter === 'all' ? data.states
    : filter === 'critical' ? data.states.filter((s: any) => s.risk_score >= 70)
    : filter === 'high' ? data.states.filter((s: any) => s.risk_score >= 50 && s.risk_score < 70)
    : data.states.filter((s: any) => s.risk_score < 50);

  const maxFraud = Math.max(...data.states.map((s: any) => s.fraud_cases));

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      {/* Tricolor */}
      <div className="tricolor-bar fixed top-0 left-0 right-0 z-50" />

      <div className="max-w-7xl mx-auto px-4 py-8 pt-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">🗺️ India Procurement Risk Map</h1>
            <p className="text-[var(--text-secondary)]">State-wise fraud hotspots — {data.total_fraud_cases} cases across ₹{data.total_value_crore.toLocaleString()} Cr</p>
          </div>
          <div className="flex gap-2">
            {[
              { key: 'all', label: 'All', color: '#6366f1' },
              { key: 'critical', label: '🔴 Critical', color: '#ef4444' },
              { key: 'high', label: '🟠 High', color: '#f97316' },
              { key: 'low', label: '🟢 Low', color: '#22c55e' },
            ].map(f => (
              <button key={f.key} onClick={() => setFilter(f.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${filter === f.key ? 'opacity-100' : 'opacity-50'}`}
                style={{ borderColor: `${f.color}40`, color: f.color, background: filter === f.key ? `${f.color}15` : 'transparent' }}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { icon: '🗺️', label: 'States Monitored', value: data.states.length, color: '#6366f1' },
            { icon: '🚨', label: 'Fraud Cases', value: data.total_fraud_cases, color: '#ef4444' },
            { icon: '💰', label: 'Total Value', value: `₹${data.total_value_crore.toLocaleString()} Cr`, color: '#22c55e' },
            { icon: '📋', label: 'Tenders Tracked', value: data.total_tenders, color: '#f59e0b' },
          ].map((s, i) => (
            <div key={i} className="stat-card">
              <div className="flex items-center gap-2 mb-2">
                <span>{s.icon}</span>
                <span className="text-xs text-[var(--text-secondary)] uppercase">{s.label}</span>
              </div>
              <p className="text-2xl font-bold font-mono" style={{ color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* TreeMap */}
          <div className="lg:col-span-3 card-glass p-6">
            <h2 className="font-semibold mb-4">📊 Risk TreeMap — Size = Fraud Cases, Color = Risk Level</h2>
            <div className="flex flex-wrap gap-2 justify-center">
              {filteredStates
                .sort((a: any, b: any) => b.fraud_cases - a.fraud_cases)
                .map((state: any) => (
                  <TreeMapBlock
                    key={state.code}
                    state={state}
                    maxFraud={maxFraud}
                    onSelect={setSelectedState}
                    selected={selectedState?.code === state.code}
                  />
                ))}
            </div>

            {/* Legend */}
            <div className="flex justify-center gap-6 mt-6 text-xs">
              {[
                { color: '#ef4444', label: 'Critical (70+)' },
                { color: '#f97316', label: 'High (50-69)' },
                { color: '#f59e0b', label: 'Medium (30-49)' },
                { color: '#22c55e', label: 'Low (<30)' },
              ].map(l => (
                <div key={l.label} className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full" style={{ background: l.color }} />
                  <span className="text-[var(--text-secondary)]">{l.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right panel */}
          <div className="lg:col-span-2 space-y-4">
            {/* Selected state details */}
            {selectedState && (
              <div className="card-glass p-5 animate-fade-in">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-lg">{selectedState.state}</h3>
                  <button onClick={() => setSelectedState(null)} className="text-[var(--text-secondary)] hover:text-white">✕</button>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="p-3 rounded-lg bg-[var(--bg-secondary)]">
                    <p className="text-xs text-[var(--text-secondary)]">Risk Score</p>
                    <p className="text-xl font-bold" style={{ color: getRiskColor(selectedState.risk_score) }}>{selectedState.risk_score}/100</p>
                  </div>
                  <div className="p-3 rounded-lg bg-[var(--bg-secondary)]">
                    <p className="text-xs text-[var(--text-secondary)]">Fraud Cases</p>
                    <p className="text-xl font-bold text-red-400">{selectedState.fraud_cases}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-[var(--bg-secondary)]">
                    <p className="text-xs text-[var(--text-secondary)]">Total Value</p>
                    <p className="text-xl font-bold text-[var(--accent)]">₹{selectedState.value_crore} Cr</p>
                  </div>
                  <div className="p-3 rounded-lg bg-[var(--bg-secondary)]">
                    <p className="text-xs text-[var(--text-secondary)]">Tenders</p>
                    <p className="text-xl font-bold">{selectedState.tenders}</p>
                  </div>
                </div>
                {/* Risk bar */}
                <div className="mt-3">
                  <div className="risk-meter">
                    <div className="risk-meter-fill" style={{
                      width: `${selectedState.risk_score}%`,
                      background: getRiskColor(selectedState.risk_score),
                    }} />
                  </div>
                </div>
              </div>
            )}

            {/* Ministry breakdown */}
            <div className="card-glass p-5">
              <h3 className="font-semibold mb-3">🏛️ Ministry Breakdown</h3>
              <div className="space-y-2">
                {data.ministry_breakdown.sort((a: any, b: any) => b.fraud_cases - a.fraud_cases).map((m: any) => (
                  <div key={m.ministry} className="flex items-center justify-between p-2 rounded-lg hover:bg-[var(--bg-secondary)] transition-all">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{m.ministry}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-1.5 rounded-full bg-[var(--bg-secondary)] overflow-hidden">
                          <div className="h-full rounded-full" style={{
                            width: `${m.risk_score}%`,
                            background: getRiskColor(m.risk_score),
                          }} />
                        </div>
                        <span className="text-xs font-mono" style={{ color: getRiskColor(m.risk_score) }}>{m.risk_score}</span>
                      </div>
                    </div>
                    <span className="text-xs text-red-400 font-semibold ml-3">{m.fraud_cases} cases</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top risk states table */}
            <div className="card-glass p-5">
              <h3 className="font-semibold mb-3">🔴 Top Risk States</h3>
              <div className="space-y-2">
                {data.states
                  .sort((a: any, b: any) => b.risk_score - a.risk_score)
                  .slice(0, 5)
                  .map((s: any, i: number) => (
                    <button key={s.code} onClick={() => setSelectedState(s)}
                      className="w-full text-left p-3 rounded-lg hover:bg-[var(--bg-secondary)] transition-all flex items-center gap-3"
                      style={{ background: `${getRiskColor(s.risk_score)}08` }}>
                      <span className="text-lg font-bold text-[var(--text-secondary)] w-6">{i + 1}</span>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{s.state}</p>
                        <p className="text-xs text-[var(--text-secondary)]">{s.fraud_cases} fraud cases · ₹{s.value_crore} Cr</p>
                      </div>
                      <span className="text-sm font-bold font-mono" style={{ color: getRiskColor(s.risk_score) }}>{s.risk_score}</span>
                    </button>
                  ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <a href="/dashboard" className="text-[var(--accent)] text-sm hover:underline">← Back to Dashboard</a>
        </div>
      </div>
    </div>
  );
}
