// ─────────────────────────────────────────────────
// FILE: app/demo/page.tsx
// TYPE: PUBLIC PAGE (no login required)
// SECRET KEYS USED: none (call goes to API route)
// WHAT THIS FILE DOES: Interactive fraud demo — judges input data, watch AI analyze live
// ─────────────────────────────────────────────────
'use client';

import { useState, useRef, useEffect } from 'react';

interface BidRow {
  company_name: string; amount: string; time_submitted: string; gstin: string;
}

const EMPTY_BID: BidRow = { company_name: '', amount: '', time_submitted: '', gstin: '' };

const PRESETS: Record<string, { tender: any; bids: BidRow[] }> = {
  clean: {
    tender: { title: 'PM SHRI Schools Digital Infrastructure', ministry: 'Ministry of Education', estimated_value: '85' },
    bids: [
      { company_name: 'EduTech Solutions', amount: '78', time_submitted: '10:30', gstin: '33AABCE1234F1Z5' },
      { company_name: 'Digital Learn Corp', amount: '82', time_submitted: '14:15', gstin: '07AABCD5678G1Z3' },
      { company_name: 'SmartClass India', amount: '91', time_submitted: '11:45', gstin: '27AABCS9012H1Z1' },
      { company_name: 'Vidya Networks', amount: '84.5', time_submitted: '09:30', gstin: '19AABCV3456I1Z9' },
    ],
  },
  bid_rigging: {
    tender: { title: 'AIIMS Delhi Medical Equipment', ministry: 'Ministry of Health', estimated_value: '120' },
    bids: [
      { company_name: 'MedTech Solutions', amount: '118.5', time_submitted: '14:30', gstin: '27AABCM1234F1Z5' },
      { company_name: 'BioMed Corp', amount: '119.8', time_submitted: '16:58', gstin: '07AABCB5678B1ZP' },
      { company_name: 'Pharma Plus', amount: '120.1', time_submitted: '16:59', gstin: '27AABCP3456I1Z9' },
    ],
  },
  timing: {
    tender: { title: 'Smart City Surveillance System', ministry: 'Ministry of Defence', estimated_value: '200' },
    bids: [
      { company_name: 'SecureTech India', amount: '185', time_submitted: '14:22', gstin: '27AABCS1234K1Z5' },
      { company_name: 'VisionCorp', amount: '192', time_submitted: '16:58', gstin: '07AABCV5678L1Z3' },
      { company_name: 'SurveillancePro', amount: '195', time_submitted: '16:59', gstin: '33AABCS9012M1Z1' },
      { company_name: 'DefenceView', amount: '198', time_submitted: '16:59', gstin: '19AABCD3456N1Z9' },
    ],
  },
  shell: {
    tender: { title: 'NH-44 Highway Expansion Phase 3', ministry: 'Ministry of Road Transport', estimated_value: '450' },
    bids: [
      { company_name: 'Road Builders India', amount: '440', time_submitted: '11:00', gstin: '27AABCR1234O1Z7' },
      { company_name: 'Shell Infra Pvt Ltd', amount: '448', time_submitted: '16:55', gstin: '07AABCS1234K1Z5' },
      { company_name: 'Shell Infra Pvt Ltd', amount: '445', time_submitted: '16:56', gstin: '07AABCS1234K1Z5' },
    ],
  },
};

const MINISTRIES = [
  'Ministry of Health', 'Ministry of Education', 'Ministry of Defence',
  'Ministry of Road Transport', 'Ministry of Finance', 'Ministry of Railways',
  'Ministry of Urban Development', 'Ministry of Agriculture',
];

export default function DemoPage() {
  const [tender, setTender] = useState({ title: '', ministry: '', estimated_value: '' });
  const [bids, setBids] = useState<BidRow[]>([{ ...EMPTY_BID }, { ...EMPTY_BID }]);
  const [analyzing, setAnalyzing] = useState(false);
  const [streamLines, setStreamLines] = useState<string[]>([]);
  const [result, setResult] = useState<any>(null);
  const [streamDone, setStreamDone] = useState(false);
  const terminalRef = useRef<HTMLDivElement>(null);

  const loadPreset = (key: string) => {
    const p = PRESETS[key];
    setTender(p.tender);
    setBids(p.bids.map(b => ({ ...b })));
    setStreamLines([]);
    setResult(null);
    setStreamDone(false);
  };

  const addBid = () => { if (bids.length < 5) setBids([...bids, { ...EMPTY_BID }]); };
  const removeBid = (i: number) => { if (bids.length > 2) setBids(bids.filter((_, idx) => idx !== i)); };
  const updateBid = (i: number, field: keyof BidRow, value: string) => {
    setBids(bids.map((b, idx) => idx === i ? { ...b, [field]: value } : b));
  };

  const analyze = async () => {
    setAnalyzing(true);
    setStreamLines([]);
    setResult(null);
    setStreamDone(false);

    try {
      const res = await fetch('/api/demo/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tender, bids }),
      });
      const data = await res.json();

      if (data.success && data.stream_lines) {
        // Simulate streaming effect
        for (let i = 0; i < data.stream_lines.length; i++) {
          await new Promise<void>(resolve => setTimeout(resolve, 60 + Math.random() * 80));
          setStreamLines(prev => [...prev, data.stream_lines[i]]);
        }
        setResult(data.analysis);
        setStreamDone(true);
      }
    } catch {
      setStreamLines(prev => [...prev, '> Error: Analysis failed. Please try again.']);
    }
    setAnalyzing(false);
  };

  // Auto-scroll terminal
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [streamLines]);

  const riskColor = (score: number) =>
    score >= 76 ? '#ef4444' : score >= 51 ? '#f59e0b' : score >= 26 ? '#eab308' : '#22c55e';

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <div className="max-w-7xl mx-auto px-4 py-8 pt-6">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--accent)]/10 border border-[var(--accent)]/20 mb-4">
            <span className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse" />
            <span className="text-xs font-semibold text-[var(--accent)] uppercase tracking-wider">Live AI Demo</span>
          </div>
          <h1 className="text-4xl font-bold mb-2">Try It Yourself</h1>
          <p className="text-lg text-[var(--text-secondary)]">Enter any tender data — watch AI detect fraud live</p>
          <p className="text-sm text-[var(--accent)] mt-1">This is live AI, not a pre-recorded demo</p>
        </div>

        {/* Preset buttons */}
        <div className="flex flex-wrap justify-center gap-3 mb-8">
          {[
            { key: 'clean', label: '✅ Clean Tender', color: '#22c55e' },
            { key: 'bid_rigging', label: '📊 Bid Rigging', color: '#ef4444' },
            { key: 'timing', label: '⏰ Timing Collusion', color: '#f59e0b' },
            { key: 'shell', label: '🏢 Shell Company', color: '#8b5cf6' },
          ].map(p => (
            <button key={p.key} onClick={() => loadPreset(p.key)}
              className="px-4 py-2 rounded-xl text-sm font-medium border transition-all hover:scale-105"
              style={{ borderColor: `${p.color}40`, color: p.color, background: `${p.color}10` }}>
              {p.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* ─── LEFT: INPUT ─── */}
          <div className="lg:col-span-2 space-y-4">
            <div className="card-glass p-5">
              <h2 className="font-semibold mb-4 flex items-center gap-2">📝 Tender Details</h2>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-[var(--text-secondary)] mb-1 block">Tender Title</label>
                  <input className="input-field" placeholder="e.g. AIIMS Delhi Medical Equipment"
                    value={tender.title} onChange={e => setTender({ ...tender, title: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-[var(--text-secondary)] mb-1 block">Ministry</label>
                  <select className="input-field" value={tender.ministry}
                    onChange={e => setTender({ ...tender, ministry: e.target.value })}>
                    <option value="">Select Ministry</option>
                    {MINISTRIES.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-[var(--text-secondary)] mb-1 block">Estimated Value (₹ Crore)</label>
                  <input className="input-field" type="number" placeholder="120"
                    value={tender.estimated_value} onChange={e => setTender({ ...tender, estimated_value: e.target.value })} />
                </div>
              </div>
            </div>

            <div className="card-glass p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold flex items-center gap-2">💰 Bids ({bids.length})</h2>
                <button onClick={addBid} disabled={bids.length >= 5}
                  className="text-xs px-3 py-1 rounded-lg bg-[var(--accent)]/10 text-[var(--accent)] hover:bg-[var(--accent)]/20 disabled:opacity-30">
                  + Add Bid
                </button>
              </div>
              <div className="space-y-4">
                {bids.map((bid, i) => (
                  <div key={i} className="p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] relative">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-[var(--accent)]">Bid #{i + 1}</span>
                      {bids.length > 2 && (
                        <button onClick={() => removeBid(i)} className="text-xs text-red-400 hover:text-red-300">✕ Remove</button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input className="input-field text-sm" placeholder="Company name"
                        value={bid.company_name} onChange={e => updateBid(i, 'company_name', e.target.value)} />
                      <input className="input-field text-sm" type="number" placeholder="Amount (Cr)"
                        value={bid.amount} onChange={e => updateBid(i, 'amount', e.target.value)} />
                      <input className="input-field text-sm" placeholder="Time (HH:MM)"
                        value={bid.time_submitted} onChange={e => updateBid(i, 'time_submitted', e.target.value)} />
                      <input className="input-field text-sm" placeholder="GSTIN (opt)"
                        value={bid.gstin} onChange={e => updateBid(i, 'gstin', e.target.value)} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button onClick={analyze} disabled={analyzing || !tender.title}
              className="w-full py-4 rounded-xl font-bold text-lg transition-all disabled:opacity-50"
              style={{
                background: 'linear-gradient(135deg, #FF9933, #f59e0b)',
                color: '#000',
                boxShadow: analyzing ? 'none' : '0 4px 20px rgba(255,153,51,0.4)',
              }}>
              {analyzing ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  Analyzing...
                </span>
              ) : '🤖 Analyze with AI'}
            </button>
          </div>

          {/* ─── RIGHT: RESULTS ─── */}
          <div className="lg:col-span-3 space-y-4">
            {/* Terminal */}
            <div className="card-glass overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-secondary)] border-b border-[var(--border-subtle)]">
                <div className="flex gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-red-500/60" />
                  <span className="w-3 h-3 rounded-full bg-yellow-500/60" />
                  <span className="w-3 h-3 rounded-full bg-green-500/60" />
                </div>
                <span className="text-xs text-[var(--text-secondary)] font-mono">TenderShield AI Engine v1.0</span>
                {analyzing && <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse ml-auto" />}
              </div>
              <div ref={terminalRef} className="p-4 font-mono text-sm h-[400px] overflow-y-auto bg-[#0a0a14]"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                {streamLines.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-[var(--text-secondary)] text-center">
                    <div>
                      <p className="text-2xl mb-2">🔍</p>
                      <p>Your analysis will appear here</p>
                      <p className="text-xs mt-1">Fill in tender data and click &quot;Analyze with AI&quot;</p>
                    </div>
                  </div>
                ) : (
                  streamLines.map((line, i) => {
                    let color = '#a0a0c0';
                    if (line.includes('CRITICAL') || line.includes('🚩')) color = '#ef4444';
                    else if (line.includes('⚠️') || line.includes('WARNING')) color = '#f59e0b';
                    else if (line.includes('✅')) color = '#22c55e';
                    else if (line.includes('━━━') || line.includes('════')) color = '#6366f1';
                    else if (line.startsWith('>')) color = '#818cf8';
                    else if (line.includes('RISK SCORE') || line.includes('COMPOSITE')) color = '#FF9933';
                    return <div key={i} style={{ color }}>{line || '\u00A0'}</div>;
                  })
                )}
                {analyzing && <span className="inline-block w-2 h-4 bg-[var(--accent)] animate-pulse" />}
              </div>
            </div>

            {/* Result cards */}
            {streamDone && result && (
              <div className="space-y-4 animate-fade-in">
                {/* Risk gauge */}
                <div className="card-glass p-6 text-center">
                  <p className="text-sm text-[var(--text-secondary)] mb-2">Composite Risk Score</p>
                  <div className="relative w-48 h-24 mx-auto mb-4">
                    <svg viewBox="0 0 200 100" className="w-full h-full">
                      <path d="M 20 90 A 80 80 0 0 1 180 90" fill="none" stroke="var(--border-subtle)" strokeWidth="12" strokeLinecap="round" />
                      <path d="M 20 90 A 80 80 0 0 1 180 90" fill="none" stroke={riskColor(result.risk_score)}
                        strokeWidth="12" strokeLinecap="round"
                        strokeDasharray={`${(result.risk_score / 100) * 251.2} 251.2`}
                        style={{ transition: 'stroke-dasharray 1.5s ease-out' }} />
                      <circle cx="100" cy="90" r="5" fill={riskColor(result.risk_score)} />
                    </svg>
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-center">
                      <span className="text-4xl font-bold" style={{ color: riskColor(result.risk_score) }}>{result.risk_score}</span>
                      <span className="text-xs text-[var(--text-secondary)] block">/100</span>
                    </div>
                  </div>
                  <div className="inline-flex px-4 py-2 rounded-xl text-sm font-bold"
                    style={{
                      color: riskColor(result.risk_score),
                      background: `${riskColor(result.risk_score)}15`,
                      border: `1px solid ${riskColor(result.risk_score)}30`,
                    }}>
                    {result.recommended_action === 'FREEZE' ? '🔴 FREEZE TENDER' :
                      result.recommended_action === 'FLAG' ? '🟡 FLAG FOR REVIEW' :
                        result.recommended_action === 'REVIEW' ? '🟠 NEEDS REVIEW' : '🟢 MONITOR'}
                  </div>
                </div>

                {/* Flag cards */}
                {result.flags.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                      🚩 Fraud Flags ({result.flags.length})
                    </h3>
                    {result.flags.map((flag: any, i: number) => (
                      <div key={i} className="card-glass p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="badge" style={{
                            background: `${flag.severity === 'CRITICAL' ? '#ef4444' : flag.severity === 'HIGH' ? '#f59e0b' : '#6366f1'}15`,
                            color: flag.severity === 'CRITICAL' ? '#ef4444' : flag.severity === 'HIGH' ? '#f59e0b' : '#6366f1',
                            border: `1px solid ${flag.severity === 'CRITICAL' ? '#ef4444' : flag.severity === 'HIGH' ? '#f59e0b' : '#6366f1'}30`,
                          }}>{flag.type}</span>
                          <span className="badge" style={{
                            background: `${flag.severity === 'CRITICAL' ? '#ef4444' : '#f59e0b'}15`,
                            color: flag.severity === 'CRITICAL' ? '#ef4444' : '#f59e0b',
                          }}>{flag.severity}</span>
                        </div>
                        <p className="text-sm font-semibold">{flag.title}</p>
                        <p className="text-xs text-[var(--text-secondary)] mt-1">{flag.detail}</p>
                      </div>
                    ))}
                  </div>
                )}

                {result.flags.length === 0 && (
                  <div className="card-glass p-6 text-center">
                    <span className="text-4xl mb-2 block">✅</span>
                    <p className="font-semibold text-green-400">Clean Tender</p>
                    <p className="text-sm text-[var(--text-secondary)] mt-1">No fraud indicators detected. This tender appears legitimate.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Back link */}
        <div className="text-center mt-12">
          <a href="/impact" className="text-[var(--accent)] text-sm hover:underline">← Back to Impact Dashboard</a>
          <span className="text-[var(--text-secondary)] mx-4">|</span>
          <a href="/dashboard" className="text-[var(--accent)] text-sm hover:underline">Go to Dashboard →</a>
        </div>
      </div>
    </div>
  );
}
