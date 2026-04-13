'use client';

import { useState } from 'react';

/* ═══════════════════════════════════════════════════════════
 * TenderShield — GFR 2017 Compliance Dashboard
 * Checks tenders against General Financial Rules 2017
 * ═══════════════════════════════════════════════════════════ */

interface ComplianceRule {
  rule: string;
  title: string;
  status: 'PASS' | 'FAIL' | 'WARNING' | 'N/A';
  reason: string;
}

interface ComplianceResult {
  overall: string;
  score: number;
  rules: ComplianceRule[];
  passed: number;
  failed: number;
  warnings: number;
  hash: string;
}

const STATUS_STYLES: Record<string, { color: string; bg: string; icon: string }> = {
  PASS: { color: '#4ade80', bg: 'rgba(74,222,128,0.08)', icon: '✅' },
  FAIL: { color: '#f87171', bg: 'rgba(248,113,113,0.08)', icon: '❌' },
  WARNING: { color: '#fbbf24', bg: 'rgba(251,191,36,0.08)', icon: '⚠️' },
  'N/A': { color: '#64748b', bg: 'rgba(100,116,139,0.05)', icon: '➖' },
};

// Sample tenders for demo
const SAMPLE_TENDERS = [
  {
    label: 'Highway Project (₹450 Cr, WORKS)',
    tender: {
      tender_id: 'TDR-MoRTH-2025-001',
      ministry_code: 'MoRTH',
      estimated_value_paise: 4500000000000,
      category: 'WORKS',
      bid_start_date: new Date(Date.now() - 30 * 86400000).toISOString(),
      bid_end_date: new Date(Date.now() + 5 * 86400000).toISOString(),
    },
    bids: [
      { bidder_did: 'B1', revealed_amount_paise: 4300000000000 },
      { bidder_did: 'B2', revealed_amount_paise: 4350000000000, is_msme: true },
      { bidder_did: 'B3', revealed_amount_paise: 4400000000000 },
      { bidder_did: 'B4', revealed_amount_paise: 4900000000000, is_msme: true },
    ],
  },
  {
    label: 'IT Consultancy (₹1.2 Cr, CONSULTANCY)',
    tender: {
      tender_id: 'TDR-MoIT-2025-002',
      ministry_code: 'MoIT',
      estimated_value_paise: 12000000000,
      category: 'CONSULTANCY',
      bid_start_date: new Date(Date.now() - 10 * 86400000).toISOString(),
      bid_end_date: new Date(Date.now() - 3 * 86400000).toISOString(),
    },
    bids: [
      { bidder_did: 'C1', revealed_amount_paise: 11000000000 },
      { bidder_did: 'C2', revealed_amount_paise: 11500000000 },
    ],
  },
  {
    label: 'Medical Supplies (₹85 Cr, GOODS)',
    tender: {
      tender_id: 'TDR-MoH-2025-003',
      ministry_code: 'MoH',
      estimated_value_paise: 850000000000,
      category: 'GOODS',
      bid_start_date: new Date(Date.now() - 20 * 86400000).toISOString(),
      bid_end_date: new Date(Date.now() + 10 * 86400000).toISOString(),
    },
    bids: [
      { bidder_did: 'M1', revealed_amount_paise: 800000000000, is_msme: true },
      { bidder_did: 'M2', revealed_amount_paise: 820000000000 },
      { bidder_did: 'M3', revealed_amount_paise: 830000000000, is_msme: true },
      { bidder_did: 'M4', revealed_amount_paise: 840000000000, is_msme: true },
      { bidder_did: 'M5', revealed_amount_paise: 850000000000 },
    ],
  },
];

export default function CompliancePage() {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [result, setResult] = useState<ComplianceResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function runCheck() {
    setLoading(true);
    setResult(null);
    try {
      const sample = SAMPLE_TENDERS[selectedIdx];
      const res = await fetch('/api/compliance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tender: sample.tender, bids: sample.bids }),
      });
      const data = await res.json();
      if (data.compliance) setResult(data.compliance);
    } catch {}
    setLoading(false);
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>📜 GFR 2017 Compliance Engine</h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
          Check tenders against General Financial Rules 2017. Real rules. Real checks. Not a whitepaper.
        </p>
      </div>

      {/* Tender Selector */}
      <div style={{
        display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap',
      }}>
        {SAMPLE_TENDERS.map((s, i) => (
          <button key={i} onClick={() => setSelectedIdx(i)} style={{
            padding: '10px 16px', borderRadius: 10, fontSize: 12, fontWeight: 600,
            border: `1px solid ${selectedIdx === i ? 'var(--accent)' : 'var(--border-subtle)'}`,
            background: selectedIdx === i ? 'rgba(99,102,241,0.1)' : 'var(--bg-card)',
            color: selectedIdx === i ? 'var(--accent)' : 'var(--text-secondary)',
            cursor: 'pointer', transition: 'all 0.2s',
          }}>{s.label}</button>
        ))}
      </div>

      <button onClick={runCheck} disabled={loading} style={{
        padding: '12px 24px', borderRadius: 10, fontSize: 14, fontWeight: 700,
        background: 'linear-gradient(135deg, #6366f1, #818cf8)',
        color: '#fff', border: 'none', cursor: loading ? 'wait' : 'pointer',
        marginBottom: 24, transition: 'all 0.2s',
      }}>
        {loading ? '⏳ Running Compliance Checks...' : '🔍 Run GFR Compliance Check'}
      </button>

      {result && (
        <div>
          {/* Overall Score */}
          <div style={{
            padding: 24, borderRadius: 16, marginBottom: 20,
            background: result.overall === 'COMPLIANT' ? 'rgba(34,197,94,0.06)' : result.overall === 'NON_COMPLIANT' ? 'rgba(239,68,68,0.06)' : 'rgba(245,158,11,0.06)',
            border: `1px solid ${result.overall === 'COMPLIANT' ? 'rgba(34,197,94,0.2)' : result.overall === 'NON_COMPLIANT' ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)'}`,
            display: 'flex', alignItems: 'center', gap: 24,
          }}>
            <div style={{ fontSize: 48, fontWeight: 800, color: result.overall === 'COMPLIANT' ? '#4ade80' : result.overall === 'NON_COMPLIANT' ? '#f87171' : '#fbbf24', fontFamily: "'DM Mono', monospace" }}>
              {result.score}%
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
                {result.overall.replace(/_/g, ' ')}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                {result.passed} passed • {result.failed} failed • {result.warnings} warnings
              </div>
            </div>
          </div>

          {/* Rules */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {result.rules.map((rule, i) => {
              const style = STATUS_STYLES[rule.status] || STATUS_STYLES['N/A'];
              return (
                <div key={i} style={{
                  padding: '14px 18px', borderRadius: 12,
                  background: style.bg,
                  border: `1px solid ${style.color}22`,
                  display: 'flex', alignItems: 'flex-start', gap: 12,
                }}>
                  <span style={{ fontSize: 18 }}>{style.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>{rule.title}</span>
                      <span style={{ fontSize: 10, fontWeight: 600, color: style.color, padding: '2px 8px', borderRadius: 8, background: `${style.color}15` }}>
                        {rule.rule}
                      </span>
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '4px 0 0', lineHeight: 1.5 }}>{rule.reason}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Audit Hash */}
          <div style={{
            marginTop: 16, padding: 12, borderRadius: 10,
            background: 'rgba(34,197,94,0.04)', border: '1px solid rgba(34,197,94,0.1)',
            fontSize: 10, color: '#94a3b8', fontFamily: "'DM Mono', monospace",
          }}>
            🔒 Compliance check hash: {result.hash}
          </div>
        </div>
      )}
    </div>
  );
}
