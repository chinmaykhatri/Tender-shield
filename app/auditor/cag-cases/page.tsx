// ─────────────────────────────────────────────────
// FILE: app/auditor/cag-cases/page.tsx
// TYPE: CLIENT PAGE
// SECRET KEYS USED: none
// WHAT THIS FILE DOES: CAG historical fraud cases dashboard with search, filter, and pattern matching
// ─────────────────────────────────────────────────
'use client';

import { useState, useEffect } from 'react';

const FRAUD_TYPE_COLORS: Record<string, string> = {
  BID_RIGGING: '#ef4444', SHELL_COMPANY: '#a855f7', TIMING_COLLUSION: '#f97316',
  FRONT_RUNNING: '#3b82f6', SPLIT_TENDERING: '#f59e0b', SINGLE_BID: '#ec4899',
  PHANTOM_BILLING: '#dc2626', GEM_PRICE_ANOMALY: '#14b8a6',
};

export default function CAGCasesPage() {
  const [cases, setCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [selectedCase, setSelectedCase] = useState<any>(null);
  const [matches, setMatches] = useState<any[]>([]);
  const [matching, setMatching] = useState(false);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    fetch('/api/cag/parse-report')
      .then(r => r.json())
      .then(d => {
        setCases(d.data.cases);
        setStats(d.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const runPatternMatch = async () => {
    setMatching(true);
    try {
      const res = await fetch('/api/cag/parse-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tender_patterns: {
            cv_of_bids: 1.8,
            shared_directors: true,
            shell_company_age_months: 1,
            timing_anomaly: true,
            above_market_price: false,
          },
        }),
      });
      const data = await res.json();
      if (data.success) setMatches(data.data.matches);
    } catch {}
    setMatching(false);
  };

  const filtered = cases.filter(c => {
    if (filterType !== 'all' && !c.fraud_types.includes(filterType)) return false;
    if (search && !c.title.toLowerCase().includes(search.toLowerCase()) && !c.ministry.toLowerCase().includes(search.toLowerCase()) && !c.state.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const allFraudTypes = [...new Set(cases.flatMap(c => c.fraud_types))];

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">📚 CAG Historical Fraud Database</h1>
            <p className="text-[var(--text-secondary)]">Training data for TenderShield AI — from official CAG reports</p>
          </div>
          <button onClick={runPatternMatch} disabled={matching}
            className="btn-primary disabled:opacity-50">
            {matching ? '⏳ Matching...' : '🔍 Match Against AIIMS Tender'}
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="stat-card">
            <p className="text-xs text-[var(--text-secondary)]">Cases in Database</p>
            <p className="text-2xl font-bold text-[var(--accent)]">{stats?.total_cases || 0}</p>
          </div>
          <div className="stat-card">
            <p className="text-xs text-[var(--text-secondary)]">Total Fraud Value</p>
            <p className="text-2xl font-bold text-red-400">₹{Math.round(stats?.total_amount_crore || 0)} Cr</p>
          </div>
          <div className="stat-card">
            <p className="text-xs text-[var(--text-secondary)]">Ministries Affected</p>
            <p className="text-2xl font-bold text-[var(--saffron)]">{stats?.ministries_affected || 0}</p>
          </div>
          <div className="stat-card">
            <p className="text-xs text-[var(--text-secondary)]">Fraud Patterns</p>
            <p className="text-2xl font-bold text-purple-400">{stats?.fraud_types?.length || 0}</p>
          </div>
        </div>

        {/* Pattern matches */}
        {matches.length > 0 && (
          <div className="card-glass p-5 mb-6 bg-red-500/5 border-red-500/20 animate-fade-in">
            <h3 className="font-semibold mb-3 text-red-400">🎯 Pattern Matches — AIIMS Tender matches {matches.length} CAG cases</h3>
            <div className="space-y-2">
              {matches.map((m: any) => (
                <div key={m.case_id} className="p-3 rounded-lg bg-[var(--bg-secondary)] border border-red-500/10 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">{m.title}</p>
                    <p className="text-xs text-[var(--text-secondary)]">{m.ministry} · {m.cag_report} · ₹{m.amount_crore} Cr</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-red-400">{m.similarity}%</p>
                    <p className="text-[10px] text-[var(--text-secondary)]">Similarity</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <input className="input-field max-w-xs" placeholder="Search cases..."
            value={search} onChange={e => setSearch(e.target.value)} />
          <div className="flex flex-wrap gap-1">
            <button onClick={() => setFilterType('all')}
              className={`px-2 py-1 rounded text-xs transition-all ${filterType === 'all' ? 'bg-[var(--accent)]/15 text-[var(--accent)]' : 'text-[var(--text-secondary)]'}`}>
              All
            </button>
            {allFraudTypes.map(ft => (
              <button key={ft} onClick={() => setFilterType(ft)}
                className={`px-2 py-1 rounded text-xs transition-all ${filterType === ft ? 'opacity-100' : 'opacity-50'}`}
                style={{ color: FRAUD_TYPE_COLORS[ft] || '#6366f1', background: filterType === ft ? `${FRAUD_TYPE_COLORS[ft] || '#6366f1'}15` : 'transparent' }}>
                {ft.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Cases list */}
          <div className="lg:col-span-2 space-y-3">
            {filtered.map(c => (
              <button key={c.id} onClick={() => setSelectedCase(c)}
                className={`w-full text-left card-glass p-4 transition-all hover:border-[var(--accent)]/30 ${selectedCase?.id === c.id ? 'border-[var(--accent)] shadow-[0_0_20px_rgba(99,102,241,0.15)]' : ''}`}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-xs font-mono text-[var(--accent)]">{c.id}</p>
                    <p className="font-semibold text-sm">{c.title}</p>
                  </div>
                  <span className="text-sm font-bold text-red-400 whitespace-nowrap">₹{c.amount_crore} Cr</span>
                </div>
                <p className="text-xs text-[var(--text-secondary)] mb-2">{c.ministry} · {c.state} · {c.year}</p>
                <div className="flex flex-wrap gap-1">
                  {c.fraud_types.map((ft: string) => (
                    <span key={ft} className="text-[10px] px-2 py-0.5 rounded-full"
                      style={{ background: `${FRAUD_TYPE_COLORS[ft] || '#6366f1'}15`, color: FRAUD_TYPE_COLORS[ft] || '#6366f1' }}>
                      {ft.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              </button>
            ))}
          </div>

          {/* Detail panel */}
          <div>
            {selectedCase ? (
              <div className="card-glass p-5 sticky top-4 animate-fade-in">
                <div className="flex items-center justify-between mb-3">
                  <p className="font-mono text-xs text-[var(--accent)]">{selectedCase.id}</p>
                  <button onClick={() => setSelectedCase(null)} className="text-[var(--text-secondary)] hover:text-white">✕</button>
                </div>
                <h3 className="font-semibold mb-2">{selectedCase.title}</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between"><span className="text-[var(--text-secondary)]">Year</span><span>{selectedCase.year}</span></div>
                  <div className="flex justify-between"><span className="text-[var(--text-secondary)]">Ministry</span><span className="text-right text-xs">{selectedCase.ministry}</span></div>
                  <div className="flex justify-between"><span className="text-[var(--text-secondary)]">State</span><span>{selectedCase.state}</span></div>
                  <div className="flex justify-between"><span className="text-[var(--text-secondary)]">Amount</span><span className="font-bold text-red-400">₹{selectedCase.amount_crore} Cr</span></div>

                  <div className="p-3 rounded-lg bg-[var(--bg-secondary)]">
                    <p className="text-xs text-[var(--text-secondary)] mb-1">Description</p>
                    <p className="text-xs leading-relaxed">{selectedCase.description}</p>
                  </div>

                  <div className="p-3 rounded-lg bg-green-500/5 border border-green-500/20">
                    <p className="text-xs text-green-400 font-semibold mb-1">Outcome</p>
                    <p className="text-xs">{selectedCase.outcome}</p>
                  </div>

                  <div className="p-3 rounded-lg bg-[var(--accent)]/5 border border-[var(--accent)]/20">
                    <p className="text-xs text-[var(--accent)] font-semibold mb-1">Source</p>
                    <p className="text-xs">{selectedCase.cag_report}</p>
                  </div>

                  {Object.keys(selectedCase.patterns || {}).length > 0 && (
                    <div>
                      <p className="text-xs text-[var(--text-secondary)] mb-2">Detectable Patterns</p>
                      <div className="space-y-1">
                        {Object.entries(selectedCase.patterns).map(([key, val]) => (
                          <div key={key} className="flex justify-between text-xs">
                            <span className="text-[var(--text-secondary)]">{key.replace(/_/g, ' ')}</span>
                            <span className="font-mono text-[var(--accent)]">{String(val)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="card-glass p-8 text-center sticky top-4">
                <span className="text-4xl block mb-3">📖</span>
                <p className="text-sm text-[var(--text-secondary)]">Click a case to see full details</p>
                <div className="mt-4 p-3 rounded-lg bg-[var(--accent)]/5 border border-[var(--accent)]/20">
                  <p className="text-xs text-[var(--accent)]">
                    Each CAG case teaches TenderShield a new fraud pattern. The more reports parsed, the more accurate detection becomes.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="text-center mt-6">
          <a href="/dashboard" className="text-[var(--accent)] text-sm hover:underline">← Back to Dashboard</a>
        </div>
      </div>
    </div>
  );
}
