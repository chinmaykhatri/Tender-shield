'use client';

import { useState } from 'react';
import { runDemoAnalysis } from '@/lib/api';

export default function AIAlertsPage() {
  const [scenario, setScenario] = useState('bid_rigging');
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const runAnalysis = async (s: string) => {
    setScenario(s);
    setLoading(true);
    try {
      const res = await runDemoAnalysis(s);
      setAnalysis(res);
    } catch (e) {
      console.error(e);
      // Honest offline state — no fabricated data
      setAnalysis({
        success: false,
        scenario: s,
        alert_id: 'OFFLINE',
        _note: 'AI analysis engine did not respond. Showing analysis template — no real data.',
        analysis: {
          tender_id: `Scenario: ${s.replace(/_/g, ' ')}`,
          composite_risk_score: 0,
          recommended_action: 'ENGINE_OFFLINE',
          detectors_run: 0,
          convergence_bonus: 0,
          flags: ['⚠️ AI engine is offline. Run a real analysis by starting the backend or connecting to the live API.'],
        },
      });
    }
    setLoading(false);
  };

  const getRiskColor = (score: number) => {
    if (score >= 76) return { bg: 'rgba(239,68,68,0.15)', color: '#f87171', class: 'risk-critical', label: '🚨 CRITICAL' };
    if (score >= 51) return { bg: 'rgba(245,158,11,0.15)', color: '#fbbf24', class: 'risk-high', label: '⚠️ HIGH' };
    if (score >= 26) return { bg: 'rgba(99,102,241,0.15)', color: '#a5b4fc', class: 'risk-medium', label: '🔔 MEDIUM' };
    return { bg: 'rgba(34,197,94,0.15)', color: '#4ade80', class: 'risk-low', label: '✅ LOW' };
  };

  const scenarios = [
    { key: 'bid_rigging', icon: '🎯', label: 'Bid Rigging', desc: 'Suspiciously similar bids with burst timing' },
    { key: 'shell_company', icon: '🏢', label: 'Shell Company', desc: 'Recently incorporated, common directors' },
    { key: 'clean', icon: '✅', label: 'Clean Tender', desc: 'Normal tender with no anomalies' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold">AI Fraud Detection</h1>
        <p className="text-sm text-[var(--text-secondary)]">5 parallel detectors · Real-time risk assessment · Automatic freeze capability</p>
      </div>

      {/* Demo Scenario Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {scenarios.map(s => (
          <button key={s.key} onClick={() => runAnalysis(s.key)}
            className={`card-glass p-5 text-left transition-all ${scenario === s.key && analysis ? 'ring-2 ring-[var(--accent)]' : ''}`}>
            <div className="text-3xl mb-2">{s.icon}</div>
            <p className="text-sm font-semibold">{s.label}</p>
            <p className="text-xs text-[var(--text-secondary)]">{s.desc}</p>
            <p className="text-xs text-[var(--accent)] mt-2">▶ Run Analysis</p>
          </button>
        ))}
      </div>

      {loading && (
        <div className="card-glass p-8 text-center">
          <div className="text-4xl animate-pulse mb-3">🤖</div>
          <p className="text-sm">Running 5 fraud detectors in parallel...</p>
        </div>
      )}

      {/* Analysis Result */}
      {analysis && !loading && (
        <div className="space-y-4">
          {/* Risk Score Header */}
          {(() => { const a = analysis.analysis; const risk = getRiskColor(a.composite_risk_score); return (
            <div className="card-glass p-6" style={{ borderColor: risk.color + '40' }}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-[var(--text-secondary)]">Tender: {a.tender_id}</p>
                  <p className="text-sm text-[var(--text-secondary)]">Alert: {analysis.alert_id}</p>
                </div>
                <div className="text-right">
                  <span className="badge" style={{ background: risk.bg, color: risk.color, border: `1px solid ${risk.color}40` }}>
                    {risk.label}
                  </span>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">Action: <strong>{a.recommended_action}</strong></p>
                </div>
              </div>

              <div className="flex items-end gap-6">
                <div>
                  <p className="text-6xl font-display font-bold" style={{ color: risk.color }}>{a.composite_risk_score}</p>
                  <p className="text-xs text-[var(--text-secondary)]">Composite Risk Score</p>
                </div>
                <div className="flex-1">
                  <div className={`risk-meter ${risk.class}`}>
                    <div className="risk-meter-fill" style={{ width: `${a.composite_risk_score}%` }} />
                  </div>
                  <div className="flex justify-between text-[10px] text-[var(--text-secondary)] mt-1">
                    <span>0 — Safe</span>
                    <span>25 — Flag</span>
                    <span>50 — Freeze</span>
                    <span>75 — Escalate</span>
                    <span>100</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 mt-4 text-xs text-[var(--text-secondary)]">
                <span>🔍 {a.detectors_run} detectors run</span>
                <span>📈 +{a.convergence_bonus} convergence bonus</span>
              </div>
            </div>
          ); })()}

          {/* Flags */}
          <div className="card-glass p-6">
            <h3 className="text-lg font-semibold mb-3">🚩 Detected Flags ({analysis.analysis.flags?.length || 0})</h3>
            <div className="space-y-2">
              {(analysis.analysis.flags || []).map((flag: string, i: number) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-[var(--bg-secondary)]">
                  <span className="text-red-400 mt-0.5">⚠️</span>
                  <p className="text-sm font-mono">{flag}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Detector Weights */}
          <div className="card-glass p-6">
            <h3 className="text-lg font-semibold mb-3">⚡ Detector Weights</h3>
            <div className="space-y-3">
              {[
                { name: 'Bid Rigging', weight: 30, icon: '🎯', desc: 'CV, Benford\'s Law, cover bids' },
                { name: 'Collusion Graph', weight: 25, icon: '🕸️', desc: 'Network analysis, co-occurrence' },
                { name: 'Shell Company', weight: 20, icon: '🏢', desc: 'GSTIN, directors, turnover' },
                { name: 'Cartel Rotation', weight: 15, icon: '🔄', desc: 'Win patterns, dept lock-in' },
                { name: 'Timing Anomaly', weight: 10, icon: '⏰', desc: 'Burst, off-hours, bots' },
              ].map((d, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xl w-8">{d.icon}</span>
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium">{d.name}</span>
                      <span className="text-[var(--text-secondary)]">{d.weight}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-[var(--bg-secondary)] overflow-hidden">
                      <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${d.weight}%` }} />
                    </div>
                    <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">{d.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
