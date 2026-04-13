'use client';

import { useState, useEffect, useMemo } from 'react';

/* ═══════════════════════════════════════════════════════════
 * TenderShield — CAG National Risk Dashboard
 * Aggregated national fraud risk view for CAG headquarters
 * Shows state-wise risk, ministry scores, and top risky tenders
 * ═══════════════════════════════════════════════════════════ */

// Indian states with simulated risk data
const STATE_DATA = [
  { code: 'MH', name: 'Maharashtra', risk: 72, tenders: 342, flagged: 48, color: '#ef4444' },
  { code: 'UP', name: 'Uttar Pradesh', risk: 68, tenders: 287, flagged: 39, color: '#f97316' },
  { code: 'KA', name: 'Karnataka', risk: 45, tenders: 198, flagged: 18, color: '#f59e0b' },
  { code: 'TN', name: 'Tamil Nadu', risk: 38, tenders: 215, flagged: 14, color: '#22c55e' },
  { code: 'DL', name: 'Delhi', risk: 62, tenders: 156, flagged: 32, color: '#f97316' },
  { code: 'GJ', name: 'Gujarat', risk: 35, tenders: 178, flagged: 11, color: '#22c55e' },
  { code: 'WB', name: 'West Bengal', risk: 58, tenders: 134, flagged: 24, color: '#f59e0b' },
  { code: 'RJ', name: 'Rajasthan', risk: 52, tenders: 167, flagged: 21, color: '#f59e0b' },
  { code: 'MP', name: 'Madhya Pradesh', risk: 48, tenders: 145, flagged: 16, color: '#f59e0b' },
  { code: 'KL', name: 'Kerala', risk: 28, tenders: 112, flagged: 6, color: '#22c55e' },
  { code: 'AP', name: 'Andhra Pradesh', risk: 55, tenders: 132, flagged: 22, color: '#f59e0b' },
  { code: 'TS', name: 'Telangana', risk: 42, tenders: 98, flagged: 12, color: '#f59e0b' },
];

const MINISTRY_DATA = [
  { code: 'MoRTH', name: 'Roads & Highways', risk: 76, value_cr: 24500, flagged: 34 },
  { code: 'MoD', name: 'Defence', risk: 65, value_cr: 18200, flagged: 22 },
  { code: 'MoR', name: 'Railways', risk: 58, value_cr: 15800, flagged: 18 },
  { code: 'MoH', name: 'Health & Family Welfare', risk: 52, value_cr: 8600, flagged: 14 },
  { code: 'MoE', name: 'Education', risk: 45, value_cr: 6200, flagged: 10 },
  { code: 'MoUD', name: 'Urban Development', risk: 42, value_cr: 9400, flagged: 12 },
  { code: 'MoIT', name: 'IT & Electronics', risk: 35, value_cr: 4300, flagged: 6 },
  { code: 'MoA', name: 'Agriculture', risk: 38, value_cr: 3800, flagged: 8 },
];

const TOP_RISKY_TENDERS = [
  { id: 'TDR-MoRTH-2025-001', title: 'NH-8 Lane Expansion Delhi-Jaipur', value: 450, risk: 82, ministry: 'MoRTH', action: 'ESCALATE_CAG' },
  { id: 'TDR-MoD-2025-003', title: 'Armoured Vehicle Procurement Phase-III', value: 1200, risk: 78, ministry: 'MoD', action: 'ESCALATE_CAG' },
  { id: 'TDR-MoR-2025-007', title: 'Vande Bharat Coach Manufacturing', value: 380, risk: 71, ministry: 'MoR', action: 'FREEZE' },
  { id: 'TDR-MoH-2025-012', title: 'CT Scanner Procurement — 50 District Hospitals', value: 85, risk: 64, ministry: 'MoH', action: 'FREEZE' },
  { id: 'TDR-MoUD-2025-004', title: 'Smart City Surveillance Network', value: 220, risk: 59, ministry: 'MoUD', action: 'FREEZE' },
];

const ACTION_COLORS: Record<string, string> = {
  ESCALATE_CAG: '#ef4444',
  FREEZE: '#f97316',
  FLAG: '#f59e0b',
  MONITOR: '#22c55e',
};

export default function NationalRiskPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const totals = useMemo(() => ({
    tenders: STATE_DATA.reduce((a, s) => a + s.tenders, 0),
    flagged: STATE_DATA.reduce((a, s) => a + s.flagged, 0),
    avgRisk: Math.round(STATE_DATA.reduce((a, s) => a + s.risk, 0) / STATE_DATA.length),
    totalValue: MINISTRY_DATA.reduce((a, m) => a + m.value_cr, 0),
  }), []);

  if (!mounted) return null;

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>🗺️ National Risk Dashboard</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            Aggregated fraud risk view for CAG headquarters — state-wise risk, ministry scores, and active alerts
          </p>
        </div>
        <div style={{
          padding: '6px 14px', borderRadius: 8,
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)',
          fontSize: 11, fontWeight: 600, color: '#f87171',
        }}>
          🔴 LIVE — Last updated: {new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })} IST
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Total Active Tenders', value: totals.tenders.toLocaleString(), icon: '📋', color: '#6366f1' },
          { label: 'Flagged for Review', value: totals.flagged.toLocaleString(), icon: '🚩', color: '#ef4444' },
          { label: 'National Risk Index', value: totals.avgRisk.toString(), icon: '📊', color: totals.avgRisk > 50 ? '#f97316' : '#22c55e' },
          { label: 'Total Value Under Monitor', value: `₹${(totals.totalValue / 100).toFixed(0)}K Cr`, icon: '💰', color: '#f59e0b' },
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

      {/* State Risk Heatmap (Table-based) */}
      <div style={{
        padding: 20, borderRadius: 16, marginBottom: 20,
        background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
      }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>🗺️ State-wise Risk Heatmap</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
          {STATE_DATA.sort((a, b) => b.risk - a.risk).map(state => (
            <div key={state.code} style={{
              padding: '12px 14px', borderRadius: 10,
              background: `${state.color}08`,
              border: `1px solid ${state.color}22`,
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
      </div>

      {/* Two Column: Ministry Scores + Top Risky Tenders */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Ministry Scores */}
        <div style={{
          padding: 20, borderRadius: 16,
          background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
        }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>🏛️ Ministry Risk Scores</h2>
          {MINISTRY_DATA.sort((a, b) => b.risk - a.risk).map(ministry => {
            const barColor = ministry.risk >= 60 ? '#ef4444' : ministry.risk >= 40 ? '#f59e0b' : '#22c55e';
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
                  ₹{ministry.value_cr.toLocaleString()} Cr • {ministry.flagged} flagged
                </div>
              </div>
            );
          })}
        </div>

        {/* Top Risky Tenders */}
        <div style={{
          padding: 20, borderRadius: 16,
          background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
        }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>🔥 Top Risky Active Tenders</h2>
          {TOP_RISKY_TENDERS.map(tender => (
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
          ))}
        </div>
      </div>

      {/* System Info */}
      <div style={{
        marginTop: 20, padding: 14, borderRadius: 12,
        background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.1)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12,
      }}>
        <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
          <strong style={{ color: 'var(--accent)' }}>Engine:</strong> CompositeRiskScorer v2.0 (HYBRID) •
          <strong style={{ color: 'var(--accent)' }}> Detectors:</strong> 6 + Boundary Gaming •
          <strong style={{ color: 'var(--accent)' }}> Thresholds:</strong> DYNAMIC_HMAC
        </div>
        <div style={{ fontSize: 10, color: '#64748b' }}>
          Data: Simulated • Production: Connect to Supabase for live data
        </div>
      </div>
    </div>
  );
}
