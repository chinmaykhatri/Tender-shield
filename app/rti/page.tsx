// ─────────────────────────────────────────────────
// FILE: app/rti/page.tsx
// TYPE: PUBLIC PAGE (no login required — any citizen)
// SECRET KEYS USED: none
// WHAT THIS FILE DOES: RTI Auto-Filing Portal — one-click RTI generation for Indian citizens
// ─────────────────────────────────────────────────
'use client';

import { useState } from 'react';

const FROZEN_TENDERS = [
  { id: 'TDR-MoH-2025-000003', title: 'AIIMS Delhi Medical Equipment', ministry: 'Ministry of Health', risk: 94, value: 120 },
  { id: 'TDR-MoD-2025-000004', title: 'Smart City Surveillance System', ministry: 'Ministry of Defence', risk: 57, value: 200 },
];

const DEMO_TRACKING = [
  { ref: 'RTI-TS-MOH003-A1B2C3', tender: 'AIIMS Equipment', date: '2025-03-15', status: 'RESPONDED', response: 'Information partially provided. TEC minutes withheld under Section 8(1)(a).' },
  { ref: 'RTI-TS-MOD004-D4E5F6', tender: 'Surveillance System', date: '2025-03-20', status: 'FILED', response: null },
  { ref: 'RTI-TS-MOE002-G7H8I9', tender: 'PM SHRI Schools', date: '2025-02-28', status: 'APPEALED', response: 'Information denied. First Appeal filed with CIC on 2025-03-28.' },
];

export default function RTIPage() {
  const [form, setForm] = useState({ tender_id: '', citizen_name: '', citizen_address: '', citizen_email: '' });
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);

  const generateRTI = async () => {
    if (!form.citizen_name || !form.citizen_address) return;
    setGenerating(true);
    setResult(null);

    try {
      const res = await fetch('/api/rti/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) setResult(data.data);
    } catch {}
    setGenerating(false);
  };

  const downloadPDF = () => {
    if (!result?.rti_letter_html) return;
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(result.rti_letter_html);
      win.document.close();
      setTimeout(() => win.print(), 500);
    }
  };

  const copyToClipboard = () => {
    if (!result?.rti_letter_html) return;
    const tmp = document.createElement('div');
    tmp.innerHTML = result.rti_letter_html;
    const text = tmp.textContent || tmp.innerText || '';
    navigator.clipboard.writeText(text);
  };

  const statusColors: Record<string, string> = { FILED: '#f59e0b', RESPONDED: '#22c55e', APPEALED: '#ef4444', GENERATED: '#6366f1' };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--saffron)]/10 border border-[var(--saffron)]/20 mb-4">
            <span className="text-[var(--saffron)]">🇮🇳</span>
            <span className="text-xs font-semibold text-[var(--saffron)] uppercase tracking-wider">RTI Act 2005 — Your Right</span>
          </div>
          <h1 className="text-4xl font-bold mb-2">RTI Auto-Filing Portal</h1>
          <p className="text-lg text-[var(--text-secondary)]">Your right to information under the RTI Act, 2005</p>
          <p className="text-sm text-[var(--accent)] mt-1">Free service for all Indian citizens — no login required</p>
        </div>

        {/* How it works */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          {[
            { step: '1', icon: '📝', title: 'Enter Details', desc: 'Select a flagged tender and enter your name + address' },
            { step: '2', icon: '🤖', title: 'AI Generates RTI', desc: 'TenderShield fills in all fraud evidence and legal language' },
            { step: '3', icon: '📬', title: 'File & Track', desc: 'Print/download and file with the ministry PIO or rtionline.gov.in' },
          ].map(s => (
            <div key={s.step} className="card-glass p-5 text-center">
              <div className="w-10 h-10 rounded-full bg-[var(--accent)]/10 flex items-center justify-center mx-auto mb-3">
                <span className="text-lg">{s.icon}</span>
              </div>
              <p className="text-xs text-[var(--accent)] font-semibold mb-1">STEP {s.step}</p>
              <p className="font-semibold mb-1">{s.title}</p>
              <p className="text-xs text-[var(--text-secondary)]">{s.desc}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Form */}
          <div className="lg:col-span-2 space-y-4">
            <div className="card-glass p-5">
              <h2 className="font-semibold mb-4 flex items-center gap-2">📋 Generate RTI Application</h2>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-[var(--text-secondary)] mb-1 block">Select Flagged Tender</label>
                  <select className="input-field" value={form.tender_id}
                    onChange={e => setForm({ ...form, tender_id: e.target.value })}>
                    <option value="">— Select a tender —</option>
                    {FROZEN_TENDERS.map(t => (
                      <option key={t.id} value={t.id}>{t.title} (Risk: {t.risk})</option>
                    ))}
                  </select>
                  {form.tender_id && (() => {
                    const t = FROZEN_TENDERS.find(ft => ft.id === form.tender_id);
                    return t ? (
                      <div className="mt-2 p-2 rounded-lg bg-red-500/5 border border-red-500/20 text-xs">
                        <span className="text-red-400 font-semibold">Risk: {t.risk}/100</span> · {t.ministry} · ₹{t.value} Cr
                      </div>
                    ) : null;
                  })()}
                </div>
                <div>
                  <label className="text-xs text-[var(--text-secondary)] mb-1 block">Your Full Name *</label>
                  <input className="input-field" placeholder="e.g. Rajesh Kumar"
                    value={form.citizen_name} onChange={e => setForm({ ...form, citizen_name: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-[var(--text-secondary)] mb-1 block">Your Address *</label>
                  <textarea className="input-field" rows={3} placeholder="Full address for PIO to respond by post"
                    value={form.citizen_address} onChange={e => setForm({ ...form, citizen_address: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-[var(--text-secondary)] mb-1 block">Email (optional)</label>
                  <input className="input-field" type="email" placeholder="your.email@example.com"
                    value={form.citizen_email} onChange={e => setForm({ ...form, citizen_email: e.target.value })} />
                </div>
              </div>
              <button onClick={generateRTI} disabled={generating || !form.citizen_name || !form.citizen_address}
                className="w-full mt-4 py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #FF9933, #f59e0b)', color: '#000', boxShadow: '0 4px 15px rgba(255,153,51,0.3)' }}>
                {generating ? '⏳ Generating RTI...' : '🇮🇳 Generate RTI Application'}
              </button>
            </div>

            {/* Your Rights */}
            <div className="card-glass p-5">
              <h3 className="font-semibold mb-3 flex items-center gap-2">⚖️ Your Rights Under RTI Act</h3>
              <div className="space-y-2 text-sm text-[var(--text-secondary)]">
                <div className="p-2 rounded-lg bg-green-500/5 border border-green-500/20">
                  <p className="text-green-400 text-xs font-semibold">✅ Cannot be penalized</p>
                  <p>No person can be penalized for filing an RTI application</p>
                </div>
                <div className="p-2 rounded-lg bg-green-500/5 border border-green-500/20">
                  <p className="text-green-400 text-xs font-semibold">✅ 30-day response</p>
                  <p>Ministry MUST respond within 30 days</p>
                </div>
                <div className="p-2 rounded-lg bg-green-500/5 border border-green-500/20">
                  <p className="text-green-400 text-xs font-semibold">✅ Appeal rights</p>
                  <p>Denial can be appealed to Central Information Commission</p>
                </div>
                <div className="p-2 rounded-lg bg-[var(--saffron)]/5 border border-[var(--saffron)]/20">
                  <p className="text-[var(--saffron)] text-xs font-semibold">⚡ PIO penalty</p>
                  <p>Non-compliance is punishable up to ₹25,000 under Section 20</p>
                </div>
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="lg:col-span-3 space-y-4">
            {!result && !generating && (
              <div className="card-glass p-12 text-center">
                <span className="text-5xl block mb-4">📜</span>
                <p className="text-lg font-semibold mb-2">Your RTI Application Will Appear Here</p>
                <p className="text-sm text-[var(--text-secondary)]">Fill in the form and click &quot;Generate RTI Application&quot;</p>
                <p className="text-xs text-[var(--accent)] mt-2">Powered by TenderShield AI + RTI Act 2005</p>
              </div>
            )}

            {generating && (
              <div className="card-glass p-12 text-center">
                <div className="w-12 h-12 border-3 border-[var(--saffron)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-[var(--text-secondary)]">Generating RTI application with AI fraud evidence...</p>
              </div>
            )}

            {result && (
              <>
                <div className="card-glass p-5">
                  <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
                    <div>
                      <p className="text-xs text-[var(--text-secondary)]">Reference Number</p>
                      <p className="font-mono font-bold text-[var(--accent)]">{result.reference_number}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={downloadPDF}
                        className="px-4 py-2 rounded-lg text-sm font-medium bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/30 hover:bg-[var(--accent)]/20 transition-all">
                        📄 Download PDF
                      </button>
                      <button onClick={copyToClipboard}
                        className="px-4 py-2 rounded-lg text-sm font-medium bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--border-subtle)] hover:bg-[var(--bg-card-hover)] transition-all">
                        📋 Copy Text
                      </button>
                      <button onClick={() => setShowPreview(!showPreview)}
                        className="px-4 py-2 rounded-lg text-sm font-medium bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--border-subtle)] hover:bg-[var(--bg-card-hover)] transition-all">
                        {showPreview ? '▲ Hide' : '▼ Preview'}
                      </button>
                    </div>
                  </div>

                  {showPreview && (
                    <div className="rounded-xl overflow-hidden border border-[var(--border-subtle)] bg-white">
                      <iframe srcDoc={result.rti_letter_html} className="w-full h-[500px]" title="RTI Preview" />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="card-glass p-5">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">📬 File by Post</h3>
                    <ol className="space-y-2 text-sm text-[var(--text-secondary)] list-decimal list-inside">
                      {result.filing_instructions.offline.map((step: string, i: number) => (
                        <li key={i}>{step}</li>
                      ))}
                    </ol>
                  </div>
                  <div className="card-glass p-5">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">🌐 File Online</h3>
                    <ol className="space-y-2 text-sm text-[var(--text-secondary)] list-decimal list-inside">
                      {result.filing_instructions.online.map((step: string, i: number) => (
                        <li key={i}>{step}</li>
                      ))}
                    </ol>
                    <a href="https://rtionline.gov.in" target="_blank" rel="noopener noreferrer"
                      className="mt-3 block text-center text-sm text-[var(--accent)] hover:underline">
                      → Open rtionline.gov.in
                    </a>
                  </div>
                </div>

                <div className="card-glass p-5">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">⚖️ If Denied — Appeal Process</h3>
                  <div className="space-y-2 text-sm text-[var(--text-secondary)]">
                    {result.filing_instructions.appeal.map((step: string, i: number) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="text-[var(--accent)] font-bold mt-0.5">{i + 1}.</span>
                        <span>{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* RTI Tracking */}
            <div className="card-glass p-5">
              <h3 className="font-semibold mb-3 flex items-center gap-2">📊 RTI Tracking — Recent Applications</h3>
              <div className="space-y-2">
                {DEMO_TRACKING.map(t => (
                  <div key={t.ref} className="p-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-xs text-[var(--accent)]">{t.ref}</span>
                      <span className="badge text-xs" style={{
                        background: `${statusColors[t.status] || '#6366f1'}15`,
                        color: statusColors[t.status] || '#6366f1',
                        border: `1px solid ${statusColors[t.status] || '#6366f1'}30`,
                      }}>{t.status}</span>
                    </div>
                    <p className="text-sm">{t.tender} · Filed {t.date}</p>
                    {t.response && <p className="text-xs text-[var(--text-secondary)] mt-1">{t.response}</p>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="text-center mt-8">
          <a href="/impact" className="text-[var(--accent)] text-sm hover:underline">← Impact Dashboard</a>
          <span className="text-[var(--text-secondary)] mx-4">|</span>
          <a href="/dashboard" className="text-[var(--accent)] text-sm hover:underline">Dashboard →</a>
        </div>
      </div>
    </div>
  );
}
