'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

/* ═══════════════════════════════════════════════════════════
 * TenderShield — Live Fraud Detection Playground
 * PUBLIC PAGE — No login required
 * 
 * Visitors can run REAL fraud detection on pre-built scenarios
 * or create custom bid distributions. This proves TenderShield
 * isn't a ChatGPT wrapper — it's a working AI engine.
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

export default function PlaygroundPage() {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [selected, setSelected] = useState<string>('');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showMath, setShowMath] = useState(false);

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
      <section style={{ textAlign: 'center', padding: '48px 24px 32px' }}>
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
          Run TenderShield&apos;s real AI engine on pre-built fraud scenarios.
          This is <strong style={{ color: '#f59e0b' }}>not a demo</strong> —
          it&apos;s the actual CompositeRiskScorer with 6 detectors, dynamic HMAC thresholds,
          and anti-gaming checksums.
        </p>
        <p style={{ fontSize: 12, color: '#64748b' }}>
          Try replacing this with ChatGPT. We dare you.
        </p>
      </section>

      {/* ── Main Content ── */}
      <div style={{
        maxWidth: 1200, margin: '0 auto', padding: '0 24px 80px',
        display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.2fr)',
        gap: 24,
      }}>
        {/* Left: Scenario Selector */}
        <div>
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

          {/* Engine Info */}
          <div style={{
            marginTop: 20, padding: 16, borderRadius: 12,
            background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.1)',
          }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: '#a5b4fc', marginBottom: 8 }}>🧠 Engine Details</h3>
            <div style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.8 }}>
              <div>• <strong>6 Detectors:</strong> CV Analysis, Timing, Cover Bids, Gap Uniformity, Boundary Gaming, Benford&apos;s Law</div>
              <div>• <strong>Threshold Mode:</strong> HMAC-SHA256 per-tender randomization</div>
              <div>• <strong>Anti-Gaming:</strong> Meta-detection of threshold evasion</div>
              <div>• <strong>Audit:</strong> SHA-256 hash of every analysis</div>
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
              <style>{`@keyframes spin { to { transform: rotate(360deg); }}`}</style>
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
                  fontFamily: "'DM Mono', monospace",
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
                  Source: {result.source} • Threshold: {result.threshold_mode}
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
                          {(det.flags as string[]).map((f: string, i: number) => (
                            <div key={i} style={{ marginBottom: 2 }}>{f}</div>
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
                    background: 'rgba(0,0,0,0.3)', fontFamily: "'DM Mono', monospace",
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
            }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
              <p style={{ color: '#64748b', fontSize: 15, fontWeight: 500 }}>Select a scenario to run fraud analysis</p>
              <p style={{ color: '#475569', fontSize: 12, marginTop: 8, maxWidth: 400, margin: '8px auto 0' }}>
                Each scenario runs through 6 real detectors with mathematically randomized thresholds.
                Every analysis generates a unique SHA-256 audit hash.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Responsive override for mobile */}
      <style>{`
        @media (max-width: 768px) {
          div[style*="gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.2fr)'"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
