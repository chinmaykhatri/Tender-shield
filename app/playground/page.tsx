'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

/* ═══════════════════════════════════════════════════════════
 * TenderShield — Live Fraud Detection Playground
 * PUBLIC PAGE — No login required
 *
 * Two modes:
 *  1. Preset Scenarios — 5 real fraud patterns, one click to analyze
 *  2. Custom Analysis — enter any bid data, watch 6 detectors run
 *
 * This proves TenderShield isn't a ChatGPT wrapper.
 * ═══════════════════════════════════════════════════════════ */

interface DetectorResult {
  risk_score: number;
  [key: string]: unknown;
  flags?: string[];
}

interface AnalysisResult {
  success: boolean;
  risk_score: number;
  recommended_action: string;
  threshold_mode: string;
  source: string;
  flags: string[];
  detectors: Record<string, DetectorResult>;
  stats: Record<string, number>;
  audit_hash: string;
  tender_id?: string;
}

interface Scenario {
  id: string;
  name: string;
  description: string;
  bid_count: number;
  estimated_value_cr: string;
  expected_verdict: string;
}

interface CustomBid {
  id: string;
  company: string;
  amount: string;
  time_before_deadline: string;
  company_age_months: string;
}

const RISK_COLORS: Record<string, string> = {
  MONITOR: '#22c55e',
  FLAG: '#f59e0b',
  FREEZE: '#f97316',
  ESCALATE_CAG: '#ef4444',
};

const RISK_BG: Record<string, string> = {
  MONITOR: 'rgba(34,197,94,0.1)',
  FLAG: 'rgba(245,158,11,0.1)',
  FREEZE: 'rgba(249,115,22,0.1)',
  ESCALATE_CAG: 'rgba(239,68,68,0.1)',
};

const DETECTOR_LABELS: Record<string, string> = {
  BID_RIGGING: '📊 Bid Rigging (CV)',
  TIMING_ANOMALY: '⏱️ Timing Anomaly',
  COVER_BIDS: '🎭 Cover Bids',
  GAP_UNIFORMITY: '📐 Gap Uniformity',
  BOUNDARY_GAMING: '🎯 Boundary Gaming',
  BENFORDS_LAW: '🔢 Benford\'s Law',
};

const QUICK_PRESETS = [
  {
    name: '✅ Clean Tender',
    description: 'Normal competitive bidding — no fraud signals',
    estimate: '50',
    bids: [
      { id: '1', company: 'TechServ India', amount: '42', time_before_deadline: '10080', company_age_months: '96' },
      { id: '2', company: 'Infosys Solutions', amount: '48.5', time_before_deadline: '7200', company_age_months: '240' },
      { id: '3', company: 'Wipro Digital', amount: '44.2', time_before_deadline: '4320', company_age_months: '360' },
    ],
  },
  {
    name: '🚨 Bid Rigging',
    description: 'CV < 0.3% — bids suspiciously identical',
    estimate: '450',
    bids: [
      { id: '1', company: 'Cartel Corp A', amount: '432', time_before_deadline: '15', company_age_months: '84' },
      { id: '2', company: 'Cartel Corp B', amount: '433.5', time_before_deadline: '12', company_age_months: '72' },
      { id: '3', company: 'Cartel Corp C', amount: '434', time_before_deadline: '8', company_age_months: '60' },
    ],
  },
  {
    name: '🐚 Shell Companies',
    description: 'Companies < 6 months old bidding together',
    estimate: '120',
    bids: [
      { id: '1', company: 'NewReg Pvt Ltd', amount: '115', time_before_deadline: '5', company_age_months: '3' },
      { id: '2', company: 'QuickBid Corp', amount: '118', time_before_deadline: '4', company_age_months: '2' },
      { id: '3', company: 'Established Co', amount: '105', time_before_deadline: '4320', company_age_months: '96' },
    ],
  },
];

export default function PlaygroundPage() {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [selected, setSelected] = useState<string>('');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showMath, setShowMath] = useState(false);
  const [mode, setMode] = useState<'preset' | 'custom'>('preset');

  // Custom bid state
  const [customEstimate, setCustomEstimate] = useState('100');
  const [customBids, setCustomBids] = useState<CustomBid[]>([
    { id: '1', company: '', amount: '', time_before_deadline: '', company_age_months: '' },
    { id: '2', company: '', amount: '', time_before_deadline: '', company_age_months: '' },
    { id: '3', company: '', amount: '', time_before_deadline: '', company_age_months: '' },
  ]);

  // Load scenarios on mount
  useEffect(() => {
    fetch('/api/playground')
      .then(r => r.json())
      .then(data => {
        if (data.scenarios) setScenarios(data.scenarios);
      })
      .catch(() => {});
  }, []);

  async function runScenario(scenarioId: string) {
    setLoading(true);
    setError('');
    setResult(null);
    setSelected(scenarioId);

    try {
      const res = await fetch('/api/playground', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario_id: scenarioId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Analysis failed');
      setResult(data);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  const loadQuickPreset = (preset: typeof QUICK_PRESETS[0]) => {
    setCustomEstimate(preset.estimate);
    setCustomBids(preset.bids);
    setResult(null);
    setError('');
  };

  const addCustomBid = () => {
    if (customBids.length >= 8) return;
    setCustomBids(prev => [...prev, {
      id: Date.now().toString(),
      company: '', amount: '', time_before_deadline: '', company_age_months: '',
    }]);
  };

  const removeCustomBid = (id: string) => {
    if (customBids.length <= 2) return;
    setCustomBids(prev => prev.filter(b => b.id !== id));
  };

  const updateCustomBid = (id: string, field: keyof CustomBid, value: string) => {
    setCustomBids(prev => prev.map(b => b.id === id ? { ...b, [field]: value } : b));
  };

  const runCustomAnalysis = useCallback(async () => {
    setLoading(true);
    setError('');
    setResult(null);
    setSelected('');

    const validBids = customBids.filter(b => b.company && b.amount);
    if (validBids.length < 2) {
      setError('Enter at least 2 bids with company name and amount');
      setLoading(false);
      return;
    }

    try {
      const estimatePaise = parseFloat(customEstimate) * 1_00_00_00_000;
      const res = await fetch('/api/playground', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tender: {
            tender_id: `CUSTOM-${Date.now()}`,
            ministry_code: 'CUSTOM',
            estimated_value_paise: estimatePaise,
            category: 'CUSTOM',
          },
          custom_bids: validBids.map(b => ({
            revealed_amount_paise: parseFloat(b.amount) * 1_00_00_00_000,
            bidder_did: b.company.replace(/\s+/g, '-').toUpperCase(),
            submitted_minutes_before_deadline: parseInt(b.time_before_deadline) || 1440,
            incorporation_months: parseInt(b.company_age_months) || 60,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Analysis failed');
      setResult(data);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, [customEstimate, customBids]);

  const actionColor = result ? RISK_COLORS[result.recommended_action] || '#6366f1' : '#6366f1';
  const actionBg = result ? RISK_BG[result.recommended_action] || 'rgba(99,102,241,0.1)' : 'rgba(99,102,241,0.1)';

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #050510 0%, #0a0a1a 50%, #0f0f23 100%)',
      color: '#e2e8f0',
      fontFamily: "'DM Sans', 'Inter', system-ui, sans-serif",
    }}>
      {/* ── Header ── */}
      <header style={{
        padding: '20px 24px',
        borderBottom: '1px solid rgba(99,102,241,0.12)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backdropFilter: 'blur(12px)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: 'rgba(5,5,16,0.8)',
      }}>
        <Link href="/" style={{
          display: 'flex', alignItems: 'center', gap: 10,
          textDecoration: 'none', color: 'inherit',
        }}>
          <span style={{ fontSize: 24 }}>🛡️</span>
          <span style={{
            fontWeight: 700, fontSize: 18,
            background: 'linear-gradient(135deg, #FF9933, #a5b4fc)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>TenderShield</span>
          <span style={{
            fontSize: 10, color: '#6366f1', border: '1px solid rgba(99,102,241,0.3)',
            padding: '2px 8px', borderRadius: 20, fontWeight: 600,
          }}>PLAYGROUND</span>
        </Link>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={{
            fontSize: 10, color: '#4ade80', fontWeight: 600,
            padding: '3px 10px', borderRadius: 20,
            background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)',
          }}>🔓 NO LOGIN REQUIRED</span>
          <Link href="/" style={{
            fontSize: 13, color: '#94a3b8', textDecoration: 'none',
            padding: '6px 14px', borderRadius: 8,
            border: '1px solid rgba(148,163,184,0.2)',
            transition: 'all 0.2s',
          }}>← Home</Link>
        </div>
      </header>

      {/* ── Hero ── */}
      <section style={{ textAlign: 'center', padding: '48px 24px 24px' }}>
        <h1 style={{
          fontSize: 'clamp(24px, 4vw, 40px)', fontWeight: 800, marginBottom: 12,
          background: 'linear-gradient(135deg, #fff, #a5b4fc)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>
          Live Fraud Detection Playground
        </h1>
        <p style={{
          fontSize: 'clamp(14px, 2vw, 17px)', color: '#94a3b8',
          maxWidth: 680, margin: '0 auto 8px', lineHeight: 1.6,
        }}>
          Enter any bid data. Watch 6 real detectors run with HMAC-randomized thresholds.
          All computation is <strong style={{ color: '#f59e0b' }}>local</strong> — zero external API calls.
        </p>

        {/* Anti-wrapper proof */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginTop: 12 }}>
          {[
            '✓ No Claude/GPT calls',
            '✓ 100% local math',
            '✓ Source code visible',
            '✓ SHA-256 audit hash per analysis',
          ].map(badge => (
            <span key={badge} style={{
              background: 'rgba(34,197,94,0.08)',
              border: '1px solid rgba(34,197,94,0.2)',
              color: '#4ade80',
              fontSize: 11, padding: '3px 10px', borderRadius: 4,
            }}>{badge}</span>
          ))}
        </div>
      </section>

      {/* ── Mode Toggle ── */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px 8px' }}>
        <div style={{
          display: 'inline-flex', gap: 4, padding: 4, borderRadius: 10,
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
        }}>
          {(['preset', 'custom'] as const).map(m => (
            <button
              key={m}
              onClick={() => { setMode(m); setResult(null); setError(''); }}
              style={{
                padding: '8px 20px', borderRadius: 8, border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 600, transition: 'all 0.2s',
                background: mode === m ? 'rgba(99,102,241,0.15)' : 'transparent',
                color: mode === m ? '#a5b4fc' : '#94a3b8',
              }}
            >
              {m === 'preset' ? '📋 Preset Scenarios' : '✏️ Custom Analysis'}
            </button>
          ))}
        </div>
      </div>

      {/* ── Main Content ── */}
      <div style={{
        maxWidth: 1200, margin: '0 auto', padding: '16px 24px 80px',
        display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.2fr)',
        gap: 24,
      }}>
        {/* Left Panel */}
        <div>
          {mode === 'preset' ? (
            /* ── Preset Scenarios ── */
            <>
              <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, color: '#e2e8f0' }}>
                Choose a Scenario
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {scenarios.map(s => (
                  <button
                    key={s.id}
                    onClick={() => runScenario(s.id)}
                    disabled={loading}
                    style={{
                      textAlign: 'left',
                      padding: '16px 18px',
                      borderRadius: 12,
                      border: `1px solid ${selected === s.id ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.06)'}`,
                      background: selected === s.id ? 'rgba(99,102,241,0.08)' : 'rgba(255,255,255,0.02)',
                      cursor: loading ? 'wait' : 'pointer',
                      transition: 'all 0.2s',
                      color: 'inherit',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontWeight: 700, fontSize: 14 }}>{s.name}</span>
                      <span style={{
                        fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 10,
                        color: s.expected_verdict === 'HIGH_RISK' ? '#ef4444' : s.expected_verdict === 'MEDIUM_RISK' ? '#f59e0b' : '#22c55e',
                        background: s.expected_verdict === 'HIGH_RISK' ? 'rgba(239,68,68,0.1)' : s.expected_verdict === 'MEDIUM_RISK' ? 'rgba(245,158,11,0.1)' : 'rgba(34,197,94,0.1)',
                      }}>{s.expected_verdict}</span>
                    </div>
                    <p style={{ fontSize: 12, color: '#94a3b8', margin: 0, lineHeight: 1.4 }}>{s.description}</p>
                    <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                      <span style={{ fontSize: 10, color: '#64748b' }}>📋 {s.bid_count} bids</span>
                      <span style={{ fontSize: 10, color: '#64748b' }}>💰 ₹{s.estimated_value_cr} Cr</span>
                    </div>
                  </button>
                ))}
              </div>
            </>
          ) : (
            /* ── Custom Analysis ── */
            <>
              <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, color: '#e2e8f0' }}>
                Enter Your Bid Data
              </h2>

              {/* Quick presets for custom mode */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6 }}>Quick load:</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {QUICK_PRESETS.map(p => (
                    <button
                      key={p.name}
                      onClick={() => loadQuickPreset(p)}
                      style={{
                        padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.08)',
                        background: 'rgba(255,255,255,0.02)', color: '#94a3b8', cursor: 'pointer',
                        fontSize: 11, transition: 'all 0.15s',
                      }}
                    >{p.name}</button>
                  ))}
                </div>
              </div>

              {/* Estimate input */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 4 }}>
                  Government Estimate (₹ Crore)
                </label>
                <input
                  type="number"
                  value={customEstimate}
                  onChange={e => setCustomEstimate(e.target.value)}
                  style={inputStyle}
                  placeholder="e.g. 120"
                />
              </div>

              {/* Bid inputs */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>
                  Bid Submissions ({customBids.length})
                </div>
                {customBids.map((bid, i) => (
                  <div key={bid.id} style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: 10, padding: 12, marginBottom: 8,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontSize: 11, color: '#64748b' }}>Bid #{i + 1}</span>
                      {customBids.length > 2 && (
                        <button
                          onClick={() => removeCustomBid(bid.id)}
                          style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 12, padding: '0 4px' }}
                        >✕</button>
                      )}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                      <input
                        value={bid.company}
                        onChange={e => updateCustomBid(bid.id, 'company', e.target.value)}
                        placeholder="Company name"
                        style={inputStyle}
                      />
                      <input
                        type="number"
                        value={bid.amount}
                        onChange={e => updateCustomBid(bid.id, 'amount', e.target.value)}
                        placeholder="Amount (₹ Cr)"
                        style={inputStyle}
                      />
                      <input
                        type="number"
                        value={bid.time_before_deadline}
                        onChange={e => updateCustomBid(bid.id, 'time_before_deadline', e.target.value)}
                        placeholder="Min before deadline"
                        style={inputStyle}
                      />
                      <input
                        type="number"
                        value={bid.company_age_months}
                        onChange={e => updateCustomBid(bid.id, 'company_age_months', e.target.value)}
                        placeholder="Company age (months)"
                        style={inputStyle}
                      />
                    </div>
                  </div>
                ))}
                {customBids.length < 8 && (
                  <button onClick={addCustomBid} style={{
                    width: '100%', padding: '6px 12px', borderRadius: 8,
                    border: '1px dashed rgba(255,255,255,0.1)',
                    background: 'transparent', color: '#64748b', cursor: 'pointer',
                    fontSize: 12, marginTop: 4,
                  }}>+ Add Bid</button>
                )}
              </div>

              <button
                onClick={runCustomAnalysis}
                disabled={loading}
                style={{
                  width: '100%', padding: '12px 24px', borderRadius: 10,
                  background: loading ? 'rgba(255,153,51,0.08)' : 'transparent',
                  border: '1px solid rgba(255,153,51,0.4)',
                  color: '#FF9933', fontSize: 14, fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {loading ? '⏳ Running 6 detectors...' : '▶ Run Fraud Analysis'}
              </button>
            </>
          )}

          {/* Engine Info */}
          <div style={{
            marginTop: 20, padding: 16, borderRadius: 12,
            background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.1)',
          }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: '#a5b4fc', marginBottom: 8 }}>Engine Details</h3>
            <div style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.8 }}>
              <div>• <strong>6 Detectors:</strong> CV Analysis, Timing, Cover Bids, Gap Uniformity, Boundary Gaming, Benford&apos;s Law</div>
              <div>• <strong>Threshold:</strong> HMAC-SHA256 per-tender randomization [0.02, 0.05]</div>
              <div>• <strong>Anti-Gaming:</strong> Boundary clustering meta-detection</div>
              <div>• <strong>Audit:</strong> SHA-256 hash of every analysis result</div>
              <div>• <strong>API calls:</strong> <span style={{ color: '#4ade80', fontWeight: 700 }}>0 external</span> — all computation is local</div>
            </div>
          </div>
        </div>

        {/* Right: Results Panel */}
        <div>
          {loading && (
            <div style={{
              padding: 60, textAlign: 'center', borderRadius: 16,
              border: '1px solid rgba(99,102,241,0.15)',
              background: 'rgba(99,102,241,0.03)',
            }}>
              <div style={{
                width: 40, height: 40, border: '3px solid rgba(99,102,241,0.2)',
                borderTopColor: '#6366f1', borderRadius: '50%',
                animation: 'spin 1s linear infinite', margin: '0 auto 16px',
              }} />
              <p style={{ color: '#94a3b8', fontSize: 14 }}>Running 6 fraud detectors...</p>
              <p style={{ color: '#64748b', fontSize: 11, marginTop: 4 }}>Computing HMAC-derived dynamic thresholds</p>
            </div>
          )}

          {error && (
            <div style={{
              padding: 20, borderRadius: 12, background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', fontSize: 13,
            }}>
              ❌ {error}
            </div>
          )}

          {result && !loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Risk Score Card */}
              <div style={{
                padding: 24, borderRadius: 16,
                border: `1px solid ${actionColor}33`,
                background: actionBg,
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
                  Composite Risk Score
                </div>
                <div style={{
                  fontSize: 64, fontWeight: 800, color: actionColor,
                  lineHeight: 1, marginBottom: 8,
                  fontFamily: "'DM Mono', 'JetBrains Mono', monospace",
                }}>
                  {result.risk_score}
                </div>
                <div style={{
                  display: 'inline-block', padding: '4px 16px', borderRadius: 20,
                  background: `${actionColor}22`, color: actionColor,
                  fontSize: 13, fontWeight: 700, letterSpacing: 0.5,
                }}>
                  {result.recommended_action.replace('_', ' → ')}
                </div>
                <div style={{ fontSize: 10, color: '#64748b', marginTop: 8 }}>
                  Source: {result.source} • Threshold: {result.threshold_mode} • API calls: <strong style={{ color: '#4ade80' }}>0</strong>
                </div>
              </div>

              {/* Detector Breakdown */}
              <div style={{
                padding: 20, borderRadius: 14,
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14, color: '#e2e8f0' }}>
                  Per-Detector Breakdown
                </h3>
                {Object.entries(result.detectors).map(([name, det]) => {
                  const score = det.risk_score;
                  const barColor = score >= 50 ? '#ef4444' : score >= 25 ? '#f59e0b' : '#22c55e';
                  return (
                    <div key={name} style={{ marginBottom: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: 600 }}>{DETECTOR_LABELS[name] || name}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: barColor }}>{score}/100</span>
                      </div>
                      <div style={{
                        height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.06)',
                        overflow: 'hidden',
                      }}>
                        <div style={{
                          height: '100%', borderRadius: 3,
                          width: `${score}%`, background: barColor,
                          transition: 'width 0.8s ease-out',
                        }} />
                      </div>
                      {det.flags && (det.flags as string[]).length > 0 && (
                        <div style={{ marginTop: 4, fontSize: 10, color: '#94a3b8', paddingLeft: 8, borderLeft: `2px solid ${barColor}33` }}>
                          {(det.flags as string[]).map((f: string, fi: number) => (
                            <div key={fi} style={{ marginBottom: 2 }}>{f}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Statistical Evidence */}
              <div style={{
                padding: 16, borderRadius: 14,
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0', margin: 0 }}>📐 Statistical Evidence</h3>
                  <button
                    onClick={() => setShowMath(!showMath)}
                    style={{
                      fontSize: 10, background: 'rgba(99,102,241,0.1)', color: '#a5b4fc',
                      border: '1px solid rgba(99,102,241,0.2)', padding: '3px 10px',
                      borderRadius: 6, cursor: 'pointer', fontWeight: 600,
                    }}
                  >{showMath ? 'Hide Math' : 'Show Math'}</button>
                </div>
                <div style={{
                  display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                  gap: 8,
                }}>
                  {Object.entries(result.stats).map(([key, val]) => (
                    <div key={key} style={{
                      padding: '8px 12px', borderRadius: 8,
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.04)',
                    }}>
                      <div style={{ fontSize: 9, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        {key.replace(/_/g, ' ')}
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: '#e2e8f0', fontFamily: "'DM Mono', monospace" }}>
                        {typeof val === 'number' ? (val > 1000 ? val.toLocaleString() : val) : val}
                      </div>
                    </div>
                  ))}
                </div>
                {showMath && (
                  <div style={{
                    marginTop: 12, padding: 12, borderRadius: 8,
                    background: 'rgba(0,0,0,0.3)', fontFamily: "'DM Mono', 'JetBrains Mono', monospace",
                    fontSize: 11, color: '#a5b4fc', lineHeight: 1.8,
                    border: '1px solid rgba(99,102,241,0.1)',
                  }}>
                    <div>CV = σ / μ = {result.stats.std_dev_cr} / {result.stats.mean_cr} = {result.stats.cv}</div>
                    <div>Dynamic Threshold = HMAC-SHA256(&quot;tendershield-cv-{result.tender_id}&quot;) → [{String(result.detectors.BID_RIGGING?.threshold ?? 'N/A')}]</div>
                    <div>Suspicious = CV {'<'} threshold = {result.stats.cv} {'<'} {String(result.detectors.BID_RIGGING?.threshold ?? '?')} = {result.stats.cv < (Number(result.detectors.BID_RIGGING?.threshold) || 0.05) ? 'TRUE ⚠️' : 'FALSE ✅'}</div>
                    <div style={{ marginTop: 4, color: '#64748b' }}>// Each tender gets a unique threshold via HMAC — cartels cannot predict it</div>
                  </div>
                )}
              </div>

              {/* Flags */}
              {result.flags.length > 0 && (
                <div style={{
                  padding: 16, borderRadius: 14,
                  background: 'rgba(239,68,68,0.03)',
                  border: '1px solid rgba(239,68,68,0.1)',
                }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10, color: '#f87171' }}>🚩 Flags ({result.flags.length})</h3>
                  {result.flags.map((flag, i) => (
                    <div key={i} style={{
                      fontSize: 11, color: '#e2e8f0', marginBottom: 6,
                      paddingLeft: 10, borderLeft: '2px solid rgba(239,68,68,0.3)',
                      lineHeight: 1.5,
                    }}>
                      {flag}
                    </div>
                  ))}
                </div>
              )}

              {/* Audit Trail */}
              <div style={{
                padding: 12, borderRadius: 10,
                background: 'rgba(34,197,94,0.04)',
                border: '1px solid rgba(34,197,94,0.1)',
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <span style={{ fontSize: 16 }}>🔒</span>
                <div>
                  <div style={{ fontSize: 10, color: '#4ade80', fontWeight: 600 }}>SHA-256 AUDIT HASH</div>
                  <div style={{ fontSize: 11, color: '#94a3b8', fontFamily: "'DM Mono', monospace", wordBreak: 'break-all' }}>
                    {result.audit_hash}
                  </div>
                </div>
              </div>
            </div>
          )}

          {!result && !loading && !error && (
            <div style={{
              padding: 60, textAlign: 'center', borderRadius: 16,
              border: '1px dashed rgba(255,255,255,0.08)',
              background: 'rgba(255,255,255,0.01)',
              height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexDirection: 'column', gap: 12,
            }}>
              <div style={{ fontSize: 48 }}>🔍</div>
              <p style={{ color: '#64748b', fontSize: 15, fontWeight: 500 }}>
                {mode === 'preset' ? 'Select a scenario to run fraud analysis' : 'Enter bid data and click Run'}
              </p>
              <p style={{ color: '#475569', fontSize: 12, marginTop: 8, maxWidth: 400, margin: '8px auto 0' }}>
                Each analysis runs through 6 real detectors with HMAC-randomized thresholds.
                Every result generates a unique SHA-256 audit hash. Zero external API calls.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Responsive + animations */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 768px) {
          div[style*="gridTemplateColumns"] { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 8,
  padding: '8px 12px',
  color: '#fff',
  fontSize: 13,
  outline: 'none',
};
