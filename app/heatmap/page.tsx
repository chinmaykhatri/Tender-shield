// ─────────────────────────────────────────────────
// FILE: app/heatmap/page.tsx
// TYPE: CLIENT COMPONENT
// SECRET KEYS USED: none — uses NEXT_PUBLIC_MAPBOX_TOKEN
// WHAT THIS FILE DOES: Full-screen India fraud heatmap with state risk colors, tender bubbles
// ─────────────────────────────────────────────────
'use client';

import { useState, useEffect } from 'react';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

interface TenderMarker {
  id: string; title: string; ministry: string; ministry_code: string;
  value_crore: number; risk_score: number; risk_level: string;
  lat: number; lng: number; status: string;
}

const DEMO_MARKERS: TenderMarker[] = [
  { id: 'TDR-MoRTH-2025-000001', title: 'NH-44 Highway Expansion Phase 3', ministry: 'Ministry of Road Transport', ministry_code: 'MoRTH', value_crore: 450, risk_score: 23, risk_level: 'LOW', lat: 28.614, lng: 77.209, status: 'BIDDING_OPEN' },
  { id: 'TDR-MoE-2025-000002', title: 'PM SHRI Schools Digital Infrastructure', ministry: 'Ministry of Education', ministry_code: 'MoE', value_crore: 85, risk_score: 31, risk_level: 'LOW', lat: 28.635, lng: 77.225, status: 'AWARDED' },
  { id: 'TDR-MoH-2025-000003', title: 'AIIMS Delhi Medical Equipment', ministry: 'Ministry of Health', ministry_code: 'MoH', value_crore: 120, risk_score: 94, risk_level: 'CRITICAL', lat: 28.567, lng: 77.210, status: 'FROZEN_BY_AI' },
  { id: 'TDR-MoD-2025-000004', title: 'Smart City Surveillance System', ministry: 'Ministry of Defence', ministry_code: 'MoD', value_crore: 200, risk_score: 57, risk_level: 'HIGH', lat: 28.597, lng: 77.199, status: 'UNDER_EVALUATION' },
  { id: 'TDR-MoF-2025-000005', title: 'Digital Tax Infrastructure', ministry: 'Ministry of Finance', ministry_code: 'MoF', value_crore: 340, risk_score: 12, risk_level: 'LOW', lat: 28.610, lng: 77.240, status: 'BIDDING_OPEN' },
  { id: 'TDR-MoRTH-2025-000006', title: 'Mumbai Metro Phase 4', ministry: 'Ministry of Urban', ministry_code: 'MoUD', value_crore: 780, risk_score: 45, risk_level: 'MEDIUM', lat: 19.076, lng: 72.877, status: 'BIDDING_OPEN' },
  { id: 'TDR-MoH-2025-000007', title: 'Bengaluru Hospital Network', ministry: 'Ministry of Health', ministry_code: 'MoH', value_crore: 95, risk_score: 68, risk_level: 'HIGH', lat: 12.972, lng: 77.594, status: 'UNDER_EVALUATION' },
  { id: 'TDR-MoE-2025-000008', title: 'Tamil Nadu Edu-Tech Hub', ministry: 'Ministry of Education', ministry_code: 'MoE', value_crore: 62, risk_score: 18, risk_level: 'LOW', lat: 13.083, lng: 80.270, status: 'AWARDED' },
];

function getRiskColor(score: number): string {
  if (score >= 76) return '#dc2626';
  if (score >= 51) return '#f97316';
  if (score >= 26) return '#f59e0b';
  return '#22c55e';
}

function getRiskBg(score: number): string {
  if (score >= 76) return 'rgba(220,38,38,0.15)';
  if (score >= 51) return 'rgba(249,115,22,0.15)';
  if (score >= 26) return 'rgba(245,158,11,0.15)';
  return 'rgba(34,197,94,0.15)';
}

export default function HeatmapPage() {
  const [selectedTender, setSelectedTender] = useState<TenderMarker | null>(null);
  const [filter, setFilter] = useState({ ministry: '', category: '', minValue: 0 });
  const [markers] = useState<TenderMarker[]>(DEMO_MARKERS);

  const stats = {
    total: markers.length,
    totalValue: markers.reduce((a, m) => a + m.value_crore, 0),
    critical: markers.filter(m => m.risk_level === 'CRITICAL').length,
    high: markers.filter(m => m.risk_level === 'HIGH').length,
  };

  const topRisky = [...markers].sort((a, b) => b.risk_score - a.risk_score).slice(0, 5);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      {/* Tricolor */}
      <div className="tricolor-bar fixed top-0 left-0 right-0 z-50" />
      <div className="flex h-screen pt-1">
        {/* Map area */}
        <div className="flex-1 relative bg-[#0a1628]">
          {/* Static India Map Visual */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative" style={{ width: '600px', height: '650px' }}>
              {/* India SVG outline */}
              <svg viewBox="0 0 600 650" className="w-full h-full opacity-20">
                <path d="M280,50 Q350,30 380,60 Q420,40 440,80 Q480,70 500,110 Q520,130 510,170 Q530,190 520,230 Q540,260 520,290 Q510,320 490,340 Q500,370 480,400 Q470,430 450,450 Q440,480 420,500 Q400,520 380,530 Q360,550 340,560 Q320,570 300,580 Q280,590 260,580 Q240,570 220,550 Q200,530 190,500 Q180,470 170,440 Q160,410 150,380 Q140,350 130,320 Q120,290 130,260 Q140,230 150,200 Q160,170 180,150 Q200,130 220,110 Q240,90 260,70 Z" fill="none" stroke="#818cf8" strokeWidth="2" />
              </svg>

              {/* Tender markers */}
              {markers.map((m) => {
                const x = ((m.lng - 68) / 30) * 600;
                const y = ((35 - m.lat) / 25) * 650;
                const size = Math.max(20, Math.min(50, m.value_crore / 15));
                return (
                  <button key={m.id} onClick={() => setSelectedTender(m)}
                    className="absolute transform -translate-x-1/2 -translate-y-1/2 rounded-full flex items-center justify-center text-[10px] font-bold transition-all hover:scale-125 cursor-pointer"
                    style={{
                      left: `${Math.max(5, Math.min(95, (x / 600) * 100))}%`,
                      top: `${Math.max(5, Math.min(95, (y / 650) * 100))}%`,
                      width: `${size}px`, height: `${size}px`,
                      background: getRiskColor(m.risk_score),
                      boxShadow: `0 0 ${size}px ${getRiskColor(m.risk_score)}60`,
                      border: selectedTender?.id === m.id ? '3px solid white' : 'none',
                    }}>
                    {m.risk_score}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Stats overlay */}
          <div className="absolute top-4 left-4 flex gap-3">
            {[
              { label: 'Active', value: stats.total, color: '#6366f1' },
              { label: 'Total Value', value: `₹${stats.totalValue}Cr`, color: '#22c55e' },
              { label: 'Critical', value: stats.critical, color: '#dc2626' },
              { label: 'High Risk', value: stats.high, color: '#f97316' },
            ].map(s => (
              <div key={s.label} className="px-3 py-2 rounded-lg bg-black/60 backdrop-blur-md border border-[var(--border-subtle)]">
                <p className="text-[10px] text-[var(--text-secondary)]">{s.label}</p>
                <p className="text-lg font-bold" style={{ color: s.color }}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="absolute bottom-4 left-4 px-4 py-3 rounded-lg bg-black/60 backdrop-blur-md border border-[var(--border-subtle)]">
            <p className="text-[10px] text-[var(--text-secondary)] mb-2">Risk Level</p>
            <div className="flex gap-4 text-xs">
              {[{ color: '#dc2626', label: 'Critical' }, { color: '#f97316', label: 'High' }, { color: '#f59e0b', label: 'Medium' }, { color: '#22c55e', label: 'Low' }].map(l => (
                <div key={l.label} className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full" style={{ background: l.color }} />
                  <span className="text-[var(--text-secondary)]">{l.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Tender popup */}
          {selectedTender && (
            <div className="absolute bottom-20 left-1/2 -translate-x-1/2 w-80 card-glass rounded-xl p-4 animate-fade-in">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-sm">{selectedTender.title}</h3>
                <button onClick={() => setSelectedTender(null)} className="text-[var(--text-secondary)]">✕</button>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                <div><span className="text-[var(--text-secondary)]">Ministry: </span>{selectedTender.ministry_code}</div>
                <div><span className="text-[var(--text-secondary)]">Value: </span><span className="text-[var(--accent)]">₹{selectedTender.value_crore} Cr</span></div>
                <div><span className="text-[var(--text-secondary)]">Risk: </span><span style={{ color: getRiskColor(selectedTender.risk_score) }}>{selectedTender.risk_score}/100</span></div>
                <div><span className="text-[var(--text-secondary)]">Status: </span>{selectedTender.status.replace(/_/g, ' ')}</div>
              </div>
              <a href={`/dashboard/tenders/${selectedTender.id}`} className="btn-primary text-xs py-1.5 w-full text-center block">View Details →</a>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="w-80 bg-[var(--bg-card)] border-l border-[var(--border-subtle)] overflow-y-auto">
          <div className="p-5">
            <h2 className="text-lg font-display font-bold mb-1">🗺️ India Procurement Risk Map</h2>
            <p className="text-xs text-[var(--text-secondary)] mb-4">{stats.total} Active | ₹{stats.totalValue}Cr Total | {stats.critical} CRITICAL</p>

            {/* Top Risky */}
            <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">Top Risk Tenders</h3>
            <div className="space-y-2 mb-6">
              {topRisky.map(t => (
                <button key={t.id} onClick={() => setSelectedTender(t)} className="w-full text-left p-3 rounded-lg hover:bg-[var(--bg-secondary)] transition-all" style={{ background: getRiskBg(t.risk_score) }}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium truncate flex-1 mr-2">{t.title}</span>
                    <span className="text-xs font-bold" style={{ color: getRiskColor(t.risk_score) }}>{t.risk_score}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-[var(--text-secondary)]">{t.ministry_code}</span>
                    <span className="text-[10px] text-[var(--text-secondary)]">₹{t.value_crore}Cr</span>
                  </div>
                </button>
              ))}
            </div>

            {/* Filters */}
            <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">Filters</h3>
            <div className="space-y-3">
              <select className="input-field text-sm w-full" value={filter.ministry} onChange={e => setFilter(f => ({ ...f, ministry: e.target.value }))}>
                <option value="">All Ministries</option>
                {['MoRTH', 'MoH', 'MoE', 'MoD', 'MoF', 'MoUD'].map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <select className="input-field text-sm w-full" value={filter.category} onChange={e => setFilter(f => ({ ...f, category: e.target.value }))}>
                <option value="">All Categories</option>
                {['WORKS', 'GOODS', 'SERVICES', 'CONSULTANCY'].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Back button */}
            <a href="/dashboard" className="block mt-6 text-center text-sm text-[var(--accent)] hover:underline">← Back to Dashboard</a>
          </div>
        </div>
      </div>
    </div>
  );
}
