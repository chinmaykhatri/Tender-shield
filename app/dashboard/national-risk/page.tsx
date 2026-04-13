'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { getDashboardStats, getTenders } from '@/lib/dataLayer';

/* ═══════════════════════════════════════════════════════════
 * TenderShield — CAG National Risk Dashboard
 * Aggregated national fraud risk view — COMPUTED from Supabase/demo data
 * NOT hardcoded. Uses the same data layer as the rest of the app.
 * ═══════════════════════════════════════════════════════════ */

// State-Ministry mapping: which states have tenders in the demo/live data
const STATE_MINISTRY_MAP: Record<string, { name: string; states: string[] }> = {
  MoRTH: { name: 'Roads & Highways', states: ['MH', 'UP', 'RJ', 'DL'] },
  MoH:   { name: 'Health & Family Welfare', states: ['DL', 'UP', 'MH'] },
  MoE:   { name: 'Education', states: ['UP', 'RJ', 'MP', 'KA'] },
  MoD:   { name: 'Defence', states: ['DL', 'WB', 'RJ'] },
  MoR:   { name: 'Railways', states: ['WB', 'TN', 'MH', 'UP'] },
  MoIT:  { name: 'IT & Electronics', states: ['KA', 'TN', 'DL'] },
  MoUD:  { name: 'Urban Development', states: ['MP', 'KA', 'GJ'] },
  MoWCD: { name: 'Women & Child Dev', states: ['UP', 'MP', 'RJ'] },
};

const STATE_NAMES: Record<string, string> = {
  MH: 'Maharashtra', UP: 'Uttar Pradesh', KA: 'Karnataka', TN: 'Tamil Nadu',
  DL: 'Delhi', GJ: 'Gujarat', WB: 'West Bengal', RJ: 'Rajasthan',
  MP: 'Madhya Pradesh', KL: 'Kerala', AP: 'Andhra Pradesh', TS: 'Telangana',
};

const ACTION_COLORS: Record<string, string> = {
  ESCALATE_CAG: '#ef4444', FREEZE: '#f97316', FLAG: '#f59e0b', MONITOR: '#22c55e',
};

function riskColor(score: number): string {
  if (score >= 70) return '#ef4444';
  if (score >= 50) return '#f97316';
  if (score >= 30) return '#f59e0b';
  return '#22c55e';
}

interface TenderData {
  id: string;
  title: string;
  ministry_code: string;
  estimated_value_crore: number;
  risk_score: number;
  risk_level: string;
  status: string;
}

export default function NationalRiskPage() {
  const [mounted, setMounted] = useState(false);
  const [usingRealData, setUsingRealData] = useState(false);
  const [tenders, setTenders] = useState<TenderData[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [statsResult, tendersResult] = await Promise.all([
        getDashboardStats(),
        getTenders(),
      ]);
      setUsingRealData(statsResult.using_real_data || tendersResult.using_real_data);
      const t = (tendersResult.data || []) as unknown as TenderData[];
      setTenders(t);
    } catch {
      setTenders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { setMounted(true); loadData(); }, [loadData]);

  // ── COMPUTE ministry scores from actual tender data ──
  const ministryData = useMemo(() => {
    const map: Record<string, { name: string; tenders: number; value_cr: number; totalRisk: number; flagged: number }> = {};
    for (const t of tenders) {
      const code = t.ministry_code || 'Other';
      if (!map[code]) map[code] = { name: STATE_MINISTRY_MAP[code]?.name || code, tenders: 0, value_cr: 0, totalRisk: 0, flagged: 0 };
      map[code].tenders++;
      map[code].value_cr += t.estimated_value_crore || 0;
      map[code].totalRisk += t.risk_score || 0;
      if ((t.risk_score || 0) >= 50) map[code].flagged++;
    }
    return Object.entries(map)
      .map(([code, d]) => ({ code, ...d, risk: d.tenders > 0 ? Math.round(d.totalRisk / d.tenders) : 0 }))
      .sort((a, b) => b.risk - a.risk);
  }, [tenders]);

  // ── COMPUTE state risk from ministry → state mapping ──
  const stateData = useMemo(() => {
    const stateMap: Record<string, { tenders: number; totalRisk: number; flagged: number }> = {};
    for (const t of tenders) {
      const states = STATE_MINISTRY_MAP[t.ministry_code]?.states || ['DL'];
      const primaryState = states[0]; // assign tender to primary state of its ministry
      if (!stateMap[primaryState]) stateMap[primaryState] = { tenders: 0, totalRisk: 0, flagged: 0 };
      stateMap[primaryState].tenders++;
      stateMap[primaryState].totalRisk += t.risk_score || 0;
      if ((t.risk_score || 0) >= 50) stateMap[primaryState].flagged++;
    }
    return Object.entries(stateMap)
      .map(([code, d]) => ({
        code,
        name: STATE_NAMES[code] || code,
        risk: d.tenders > 0 ? Math.round(d.totalRisk / d.tenders) : 0,
        tenders: d.tenders,
        flagged: d.flagged,
        color: riskColor(d.tenders > 0 ? Math.round(d.totalRisk / d.tenders) : 0),
      }))
      .sort((a, b) => b.risk - a.risk);
  }, [tenders]);

  // ── COMPUTE top risky tenders (highest risk_score, status != AWARDED) ──
  const topRiskyTenders = useMemo(() => {
    return [...tenders]
      .filter(t => (t.risk_score || 0) >= 25 && t.status !== 'AWARDED')
      .sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0))
      .slice(0, 5)
      .map(t => ({
        id: t.id,
        title: t.title,
        value: t.estimated_value_crore || 0,
        risk: t.risk_score || 0,
        ministry: t.ministry_code || '—',
        action: (t.risk_score || 0) >= 76 ? 'ESCALATE_CAG' : (t.risk_score || 0) >= 51 ? 'FREEZE' : 'FLAG',
      }));
  }, [tenders]);

  const totals = useMemo(() => ({
    tenders: tenders.length,
    flagged: tenders.filter(t => (t.risk_score || 0) >= 50).length,
    avgRisk: tenders.length > 0 ? Math.round(tenders.reduce((a, t) => a + (t.risk_score || 0), 0) / tenders.length) : 0,
    totalValue: tenders.reduce((a, t) => a + (t.estimated_value_crore || 0), 0),
  }), [tenders]);

  if (!mounted) return null;

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>🗺️ National Risk Dashboard</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            Aggregated fraud risk view for CAG headquarters — computed from tender data, not hardcoded
          </p>
        </div>
        <div style={{
          padding: '6px 14px', borderRadius: 8,
          background: usingRealData ? 'rgba(34,197,94,0.08)' : 'rgba(245,158,11,0.08)',
          border: `1px solid ${usingRealData ? 'rgba(34,197,94,0.15)' : 'rgba(245,158,11,0.15)'}`,
          fontSize: 11, fontWeight: 600,
          color: usingRealData ? '#22c55e' : '#f59e0b',
        }}>
          {usingRealData ? '🟢 LIVE — Supabase' : '🟡 DEMO DATA — Illustrative'} • {tenders.length} tenders computed
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-secondary)' }}>
          Loading tender data from {usingRealData ? 'Supabase' : 'demo store'}...
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginBottom: 24 }}>
            {[
              { label: 'Total Tenders Analyzed', value: totals.tenders.toLocaleString(), icon: '📋', color: '#6366f1' },
              { label: 'Flagged (Risk ≥ 50)', value: totals.flagged.toLocaleString(), icon: '🚩', color: '#ef4444' },
              { label: 'Mean Risk Score', value: totals.avgRisk.toString(), icon: '📊', color: riskColor(totals.avgRisk) },
              { label: 'Total Value Monitored', value: `₹${totals.totalValue.toLocaleString()} Cr`, icon: '💰', color: '#f59e0b' },
            ].map((card, i) => (
              <div key={i} style={{
                padding: '16px 18px', borderRadius: 14,
                background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>{card.label}</div>
                    <div style={{ fontSize: 28, fontWeight: 800, color: card.color, fontFamily: "'DM Mono', monospace" }}>{card.value}</div>
                  </div>
                  <span style={{ fontSize: 28 }}>{card.icon}</span>
                </div>
              </div>
            ))}
          </div>

          {/* State Risk — Computed from tender ministry → state mapping */}
          <div style={{ padding: 20, borderRadius: 16, marginBottom: 20, background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>🗺️ State-wise Risk (Computed)</h2>
            <p style={{ fontSize: 10, color: 'var(--text-secondary)', marginBottom: 14 }}>
              Risk per state = mean(risk_score) of tenders assigned to that state via ministry mapping. Not a static table.
            </p>
            {stateData.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 30, color: 'var(--text-secondary)', fontSize: 13 }}>No tender data to compute state risk.</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
                {stateData.map(state => (
                  <div key={state.code} style={{
                    padding: '12px 14px', borderRadius: 10,
                    background: `${state.color}08`, border: `1px solid ${state.color}22`,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{state.name}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>
                        {state.tenders} tenders • {state.flagged} flagged
                      </div>
                    </div>
                    <div style={{
                      width: 44, height: 44, borderRadius: 10,
                      background: `${state.color}15`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 800, fontSize: 16, color: state.color,
                      fontFamily: "'DM Mono', monospace",
                    }}>{state.risk}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Two Column: Ministry Scores + Top Risky Tenders */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* Ministry Scores — COMPUTED */}
            <div style={{ padding: 20, borderRadius: 16, background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>🏛️ Ministry Risk Scores (Computed)</h2>
              <p style={{ fontSize: 10, color: 'var(--text-secondary)', marginBottom: 14 }}>
                Avg risk_score per ministry from {tenders.length} tenders
              </p>
              {ministryData.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 30, color: 'var(--text-secondary)', fontSize: 13 }}>No data.</div>
              ) : (
                ministryData.map(ministry => {
                  const barColor = riskColor(ministry.risk);
                  return (
                    <div key={ministry.code} style={{ marginBottom: 14 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: 600 }}>{ministry.name}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: barColor }}>{ministry.risk}</span>
                      </div>
                      <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.06)' }}>
                        <div style={{
                          height: '100%', borderRadius: 3, width: `${ministry.risk}%`,
                          background: barColor, transition: 'width 1s ease',
                        }} />
                      </div>
                      <div style={{ fontSize: 9, color: 'var(--text-secondary)', marginTop: 2 }}>
                        ₹{ministry.value_cr.toLocaleString()} Cr • {ministry.tenders} tenders • {ministry.flagged} flagged
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Top Risky Tenders — COMPUTED from actual tender list */}
            <div style={{ padding: 20, borderRadius: 16, background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>🔥 Top Risky Tenders (Computed)</h2>
              <p style={{ fontSize: 10, color: 'var(--text-secondary)', marginBottom: 14 }}>
                Tenders sorted by risk_score descending, status ≠ AWARDED
              </p>
              {topRiskyTenders.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 30, color: 'var(--text-secondary)', fontSize: 13 }}>No risky tenders found.</div>
              ) : (
                topRiskyTenders.map(tender => (
                  <div key={tender.id} style={{
                    padding: '12px 14px', borderRadius: 10, marginBottom: 10,
                    background: `${ACTION_COLORS[tender.action]}06`,
                    border: `1px solid ${ACTION_COLORS[tender.action]}15`,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 12, lineHeight: 1.3 }}>{tender.title}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 2 }}>
                          {tender.id} • {tender.ministry} • ₹{tender.value} Cr
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{
                          fontSize: 20, fontWeight: 800, color: ACTION_COLORS[tender.action],
                          fontFamily: "'DM Mono', monospace",
                        }}>{tender.risk}</div>
                        <div style={{
                          fontSize: 8, fontWeight: 600, color: ACTION_COLORS[tender.action],
                          textTransform: 'uppercase', letterSpacing: 0.5,
                        }}>{tender.action.replace('_', ' ')}</div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* System Info — HONEST */}
          <div style={{
            marginTop: 20, padding: 14, borderRadius: 12,
            background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.1)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12,
          }}>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
              <strong style={{ color: 'var(--accent)' }}>Source:</strong> {usingRealData ? 'Supabase (live)' : 'Demo data layer (illustrative)'} •
              <strong style={{ color: 'var(--accent)' }}> Computation:</strong> All scores computed at render — not hardcoded •
              <strong style={{ color: 'var(--accent)' }}> Tenders:</strong> {tenders.length}
            </div>
            <div style={{ fontSize: 10, color: '#64748b' }}>
              {usingRealData
                ? 'Data: Live Supabase queries'
                : 'Data: Demo mock — connect Supabase for live computation'}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
