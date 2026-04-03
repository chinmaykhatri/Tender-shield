'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';

interface MathDetails {
  formula: string;
  inputs: Record<string, string | number>;
  computation: string[];
  threshold: string;
  result: string;
}

interface DetectorResult {
  name: string;
  score: number;
  flag: boolean;
  evidence: string;
  math: MathDetails;
}

interface AnalysisResult {
  risk_score: number;
  risk_level: string;
  confidence: number;
  detectors: DetectorResult[];
  recommended_action: string;
  summary: string;
  engine: string;
  bids_analyzed: number;
}

const SAMPLE_BIDS = [
  {
    bidder_name: 'BioMed Corp Pvt Ltd',
    amount: 118.5,
    gstin: '07AABCU9603R1ZM',
    pan: 'ABCDE1234F',
    cin: 'U33112DL2024PTC421567',
    incorporation_date: '2024-11-15',
    registered_address: '45 Nehru Place, New Delhi',
    submitted_at: new Date(Date.now() - 3600000).toISOString(),
    past_wins: 3,
  },
  {
    bidder_name: 'Pharma Plus Solutions',
    amount: 119.8,
    gstin: '07AABPU4203R2ZN',
    pan: 'ABCDE1234F',
    cin: 'U33112DL2024PTC421890',
    incorporation_date: '2024-12-01',
    registered_address: '45 Nehru Place, New Delhi',
    submitted_at: new Date(Date.now() - 3300000).toISOString(),
    past_wins: 4,
  },
  {
    bidder_name: 'MediCare India Ltd',
    amount: 121.2,
    gstin: '09AABCM7856R1ZQ',
    pan: 'FGHIJ5678K',
    cin: 'U24110UP2019PTC128456',
    incorporation_date: '2019-06-15',
    registered_address: '112 MG Road, Lucknow',
    submitted_at: new Date(Date.now() - 1800000).toISOString(),
    past_wins: 1,
  },
  {
    bidder_name: 'HealthFirst Enterprises',
    amount: 120.1,
    gstin: '27AABHF2345R1ZX',
    pan: 'LMNOP9012Q',
    cin: 'U24200MH2020PTC345678',
    incorporation_date: '2020-03-20',
    registered_address: '78 FC Road, Pune',
    submitted_at: new Date(Date.now() - 3200000).toISOString(),
    past_wins: 2,
  },
];

const detectorIcons: Record<string, string> = {
  "Benford's Law": '📐',
  'Bid Rigging (CV)': '📊',
  'Shell Company': '🏢',
  'Timing Collusion': '⏱️',
  'Cartel Rotation': '🔄',
};

const detectorColors: Record<string, string> = {
  "Benford's Law": '#8b5cf6',
  'Bid Rigging (CV)': '#3b82f6',
  'Shell Company': '#ef4444',
  'Timing Collusion': '#f59e0b',
  'Cartel Rotation': '#06b6d4',
};

export default function AIMonitorPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedDetector, setExpandedDetector] = useState<string | null>(null);
  const [customBids, setCustomBids] = useState(JSON.stringify(SAMPLE_BIDS, null, 2));
  const [showEditor, setShowEditor] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) { router.push('/'); return; }
    runAnalysis(SAMPLE_BIDS);
  }, [isAuthenticated, router]);

  async function runAnalysis(bids: any[]) {
    setLoading(true);
    try {
      const res = await fetch('/api/fraud-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bids,
          estimated_value: 120,
          historical_winners: ['BioMed Corp Pvt Ltd', 'Pharma Plus Solutions', 'BioMed Corp Pvt Ltd', 'MediCare India Ltd', 'Pharma Plus Solutions'],
          tender_id: 'LIVE-ANALYSIS',
        }),
      });
      const data = await res.json();
      setAnalysis(data);
    } catch (err) {
      console.error('Analysis failed:', err);
    }
    setLoading(false);
  }

  function handleRunCustom() {
    try {
      const bids = JSON.parse(customBids);
      runAnalysis(bids);
      setShowEditor(false);
    } catch { alert('Invalid JSON'); }
  }

  const riskColor = (level: string) =>
    ({ CRITICAL: '#ef4444', HIGH: '#f97316', MEDIUM: '#f59e0b', LOW: '#22c55e' }[level] || '#6366f1');

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">🧠 Statistical Fraud Detection Engine</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            5 independent detectors using real mathematical analysis — Benford&apos;s Law, CV, timing analysis, shell detection, cartel scoring
          </p>
        </div>
        <button
          onClick={() => setShowEditor(!showEditor)}
          className="px-4 py-2 rounded-xl text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90 transition-all"
        >
          {showEditor ? '✕ Close Editor' : '🧪 Custom Bids'}
        </button>
      </div>

      {/* Custom Bid Editor */}
      {showEditor && (
        <div className="card-glass p-6">
          <h3 className="font-semibold mb-2">📝 Custom Bid Data (JSON)</h3>
          <textarea
            value={customBids}
            onChange={e => setCustomBids(e.target.value)}
            rows={12}
            className="w-full p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] font-mono text-xs text-[var(--text-primary)]"
          />
          <button
            onClick={handleRunCustom}
            className="mt-3 px-6 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:opacity-90"
          >
            ⚡ Run Analysis
          </button>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
        </div>
      )}

      {analysis && !loading && (
        <>
          {/* Summary Bar */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="stat-card col-span-2 lg:col-span-1">
              <div className="text-xs text-[var(--text-secondary)] uppercase mb-1">Risk Score</div>
              <p className="text-3xl font-display font-bold" style={{ color: riskColor(analysis.risk_level) }}>
                {analysis.risk_score}
              </p>
              <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{
                background: `${riskColor(analysis.risk_level)}22`,
                color: riskColor(analysis.risk_level),
              }}>{analysis.risk_level}</span>
            </div>
            {[
              { label: 'Detectors', value: `${analysis.detectors.filter(d => d.flag).length}/${analysis.detectors.length} flagged`, color: '#ef4444' },
              { label: 'Bids Analyzed', value: analysis.bids_analyzed, color: '#3b82f6' },
              { label: 'Confidence', value: `${(analysis.confidence * 100).toFixed(0)}%`, color: '#22c55e' },
              { label: 'Action', value: analysis.recommended_action, color: '#f59e0b' },
            ].map((s, i) => (
              <div key={i} className="stat-card">
                <div className="text-xs text-[var(--text-secondary)] uppercase mb-1">{s.label}</div>
                <p className="text-lg font-bold" style={{ color: s.color }}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Engine Badge */}
          <div className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 text-sm">
            <strong className="text-indigo-400">Engine:</strong>{' '}
            <span className="text-[var(--text-secondary)]">{analysis.engine}</span>
          </div>

          {/* Detectors */}
          <div className="space-y-3">
            {analysis.detectors.map((d) => {
              const isExpanded = expandedDetector === d.name;
              const icon = detectorIcons[d.name] || '🔍';
              const color = detectorColors[d.name] || '#6366f1';

              return (
                <div key={d.name} className="card-glass overflow-hidden">
                  {/* Detector Header */}
                  <div
                    className="p-5 cursor-pointer hover:bg-[var(--bg-card)] transition-all"
                    onClick={() => setExpandedDetector(isExpanded ? null : d.name)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{icon}</span>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold">{d.name}</h3>
                            {d.flag && <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 font-bold">⚠️ FLAGGED</span>}
                          </div>
                          <p className="text-xs text-[var(--text-secondary)] mt-0.5 max-w-xl">{d.evidence}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-2xl font-bold" style={{ color: d.score >= 50 ? '#ef4444' : d.score >= 25 ? '#f59e0b' : '#22c55e' }}>
                            {d.score}
                          </p>
                          <p className="text-[10px] text-[var(--text-secondary)]">/100</p>
                        </div>
                        <span className="text-[var(--text-secondary)] text-sm">{isExpanded ? '▲' : '▼'}</span>
                      </div>
                    </div>

                    {/* Score Bar */}
                    <div className="mt-3 h-2 rounded-full bg-[var(--bg-secondary)] overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-1000"
                        style={{
                          width: `${d.score}%`,
                          background: `linear-gradient(90deg, ${color}, ${d.score >= 50 ? '#ef4444' : color})`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Expanded Math Details */}
                  {isExpanded && (
                    <div className="px-5 pb-5 border-t border-[var(--border-subtle)]">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
                        {/* Formula */}
                        <div className="p-4 rounded-xl bg-[var(--bg-secondary)]">
                          <h4 className="text-xs uppercase text-[var(--text-secondary)] font-bold mb-2">📐 Formula</h4>
                          <p className="font-mono text-sm text-indigo-400">{d.math.formula}</p>
                          <div className="mt-3">
                            <h5 className="text-xs uppercase text-[var(--text-secondary)] font-bold mb-1">Threshold</h5>
                            <p className="font-mono text-xs text-[var(--text-secondary)]">{d.math.threshold}</p>
                          </div>
                          <div className="mt-3">
                            <h5 className="text-xs uppercase text-[var(--text-secondary)] font-bold mb-1">Result</h5>
                            <p className={`font-mono text-xs font-bold ${d.flag ? 'text-red-400' : 'text-green-400'}`}>
                              {d.math.result}
                            </p>
                          </div>
                        </div>

                        {/* Inputs */}
                        <div className="p-4 rounded-xl bg-[var(--bg-secondary)]">
                          <h4 className="text-xs uppercase text-[var(--text-secondary)] font-bold mb-2">📊 Parameters</h4>
                          <div className="space-y-1">
                            {Object.entries(d.math.inputs).map(([key, val]) => (
                              <div key={key} className="flex justify-between text-xs">
                                <span className="text-[var(--text-secondary)]">{key}</span>
                                <span className="font-mono text-[var(--text-primary)]">{String(val)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Computation Steps */}
                      <div className="mt-4 p-4 rounded-xl bg-[#0d1117] border border-[#30363d]">
                        <h4 className="text-xs uppercase text-[var(--text-secondary)] font-bold mb-2">🔬 Computation Steps</h4>
                        <div className="space-y-1 font-mono text-xs">
                          {d.math.computation.map((step, i) => (
                            <div key={i} className={`py-0.5 ${
                              step.includes('⚠️') ? 'text-yellow-400' :
                              step.includes('✅') ? 'text-green-400' :
                              step.includes('❌') ? 'text-red-400' :
                              'text-gray-400'
                            }`}>
                              <span className="text-gray-600 mr-2">{String(i + 1).padStart(2, '0')}.</span>
                              {step}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Summary */}
          <div className="card-glass p-6">
            <h3 className="font-bold mb-2">📋 Analysis Summary</h3>
            <p className="text-sm text-[var(--text-secondary)]">{analysis.summary}</p>
            <div className="mt-3 flex gap-2 flex-wrap">
              <span className="text-xs px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">No LLM used</span>
              <span className="text-xs px-3 py-1 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">Pure statistical math</span>
              <span className="text-xs px-3 py-1 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">5 independent detectors</span>
              <span className="text-xs px-3 py-1 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">Transparent computation</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
