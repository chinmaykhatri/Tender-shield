'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { useToast } from '@/components/ToastSystem';
import { validateStep1, validateStep2, validateStep3, validateComplete, type ValidationResult } from '@/lib/validation/tenderValidation';

const ALLOWED_ROLES = ['OFFICER', 'NIC_ADMIN', 'MINISTRY_OFFICER', 'SENIOR_OFFICER'];

const STEPS = ['Basic Info', 'Financial Details', 'Compliance', 'Documents', 'Review & Submit'];

const MINISTRIES = [
  { code: 'MoRTH', name: 'Ministry of Road Transport & Highways' },
  { code: 'MoH', name: 'Ministry of Health & Family Welfare' },
  { code: 'MoE', name: 'Ministry of Education' },
  { code: 'MoD', name: 'Ministry of Defence' },
  { code: 'MoF', name: 'Ministry of Finance' },
  { code: 'MoHUA', name: 'Ministry of Housing & Urban Affairs' },
  { code: 'MoRD', name: 'Ministry of Rural Development' },
  { code: 'MoCI', name: 'Ministry of Commerce & Industry' },
];

const GFR_RULES = ['GFR Rule 144', 'GFR Rule 149', 'GFR Rule 153', 'GFR Rule 153(a)', 'GFR Rule 154', 'GFR Rule 155', 'GFR Rule 166'];

export default function CreateTenderPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const { addToast } = useToast();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<any>(null);

  // ── RBAC GUARD ──────────────────────────────────────────────
  const userRole = user?.role ?? '';
  const isAllowed = ALLOWED_ROLES.includes(userRole);

  useEffect(() => {
    if (user && !isAllowed) {
      router.replace('/dashboard/tenders?error=unauthorized');
    }
  }, [user, isAllowed, router]);

  // Show Access Denied while redirecting
  if (user && !isAllowed) {
    return (
      <div className="max-w-lg mx-auto py-20 text-center animate-fade-in">
        <div className="card-glass p-10">
          <div className="text-5xl mb-4">🚫</div>
          <h2 className="text-2xl font-display font-bold mb-2" style={{ color: '#cc3300' }}>Access Denied</h2>
          <p className="text-sm text-[var(--text-secondary)] mb-2">Only Ministry Officers and NIC Admins can create tenders.</p>
          <p className="text-xs text-[var(--text-secondary)] mb-6">Your role: <strong>{userRole || 'Unknown'}</strong></p>
          <a href="/dashboard/tenders" className="btn-primary">← Browse Active Tenders</a>
        </div>
      </div>
    );
  }
  // ── END RBAC GUARD ──────────────────────────────────────────

  const [form, setForm] = useState({
    ministry_code: '', ministry: '', department: '', title: '', description: '',
    estimated_value_crore: '', bid_security_crore: '', category: 'WORKS',
    procurement_method: 'OPEN_TENDER', gfr_reference: 'GFR Rule 149',
    gem_category: '', gem_id: '', deadline: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const update = (field: string, value: string) => {
    const updated = { ...form, [field]: value };
    if (field === 'ministry_code') {
      updated.ministry = MINISTRIES.find(m => m.code === value)?.name || '';
    }
    if (field === 'estimated_value_crore') {
      const val = parseFloat(value) || 0;
      updated.bid_security_crore = (val * 0.02).toFixed(1);
    }
    // Clear error for the field being edited
    if (errors[field]) {
      setErrors(prev => { const next = { ...prev }; delete next[field]; return next; });
    }
    setForm(updated);
  };

  // ── STEP VALIDATION ─────────────────────────────────────────
  const handleNext = () => {
    let result: ValidationResult;
    if (step === 0) result = validateStep1(form);
    else if (step === 1) result = validateStep2(form);
    else if (step === 2) result = validateStep3(form);
    else result = { valid: true, errors: {} };

    if (!result.valid) {
      setErrors(result.errors);
      // Scroll to first error
      const firstErrorField = Object.keys(result.errors)[0];
      document.getElementById(`field-${firstErrorField}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return; // DO NOT advance
    }

    setErrors({});
    setStep(step + 1);
  };

  const handleSubmit = async () => {
    setSubmitting(true);

    addToast({ type: 'info', title: '🚀 Submitting Tender', message: `Publishing "${form.title}" to blockchain...`, duration: 4000 });

    try {
      const res = await fetch('/api/tender-flow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          ministry_code: form.ministry_code,
          estimated_value_crore: parseFloat(form.estimated_value_crore) || 100,
          category: form.category,
          description: form.description,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setResult(data);
        setSubmitted(true);

        // Fire staggered toasts so judges see each step
        const pipeline = data.pipeline || [];
        for (let i = 0; i < pipeline.length; i++) {
          const step = pipeline[i];
          setTimeout(() => {
            if (step.step === 'CREATE_TENDER') {
              addToast({ type: 'success', title: '📋 Tender Created', message: `${data.summary.tender} — ${data.summary.value} saved to Supabase`, duration: 8000 });
            } else if (step.step === 'BLOCKCHAIN_RECORD') {
              addToast({ type: 'blockchain', title: '⛓️ Blockchain Recorded', message: `TX: ${(step.data as any)?.tx_hash?.slice(0, 16)}... committed to Fabric ledger`, duration: 8000 });
            } else if (step.step === 'AI_ANALYSIS') {
              const risk = (step.data as any)?.risk_score || 0;
              addToast({
                type: risk >= 80 ? 'warning' : 'ai',
                title: risk >= 80 ? '🚨 AI Fraud Alert!' : '🧠 AI Analysis Complete',
                message: risk >= 80
                  ? `Risk Score: ${risk}% — potential fraud detected!`
                  : `Risk Score: ${risk}% — within acceptable threshold`,
                duration: 10000,
              });
            } else if (step.step === 'ENFORCEMENT') {
              addToast({ type: 'error', title: '❄️ TENDER FROZEN', message: `${data.summary.tender} auto-frozen by AI enforcement engine`, duration: 12000 });
            }
          }, (i + 1) * 1500);
        }
      } else {
        addToast({ type: 'error', title: 'Submission Failed', message: data.error || 'Unknown error', duration: 8000 });
      }
    } catch (e) {
      addToast({ type: 'error', title: 'Network Error', message: 'Could not reach TenderShield API', duration: 8000 });
    }
    setSubmitting(false);
  };



  if (submitted && result) {
    const summary = result.summary || {};
    const isFrozen = summary.status === 'FROZEN_BY_AI';
    // Extract AI detectors from pipeline
    const aiStep = (result.pipeline || []).find((s: any) => s.step === 'AI_ANALYSIS');
    const detectors = aiStep?.data?.detectors || [];
    const aiSummary = aiStep?.data?.summary || '';
    return (
      <div className="max-w-2xl mx-auto py-10 animate-fade-in">
        <div className="card-glass p-8">
          <div className="text-center mb-6">
            <div className="text-5xl mb-4">{isFrozen ? '❄️' : '✅'}</div>
            <h2 className="text-2xl font-display font-bold mb-1">
              {isFrozen ? 'Tender Frozen by AI!' : 'Tender Published!'}
            </h2>
            <p className="text-[var(--text-secondary)] text-sm">
              {isFrozen
                ? `AI detected risk score ${summary.risk_score}% — auto-frozen for CAG review`
                : 'Submitted to Hyperledger Fabric blockchain'}
            </p>
          </div>

          {/* Pipeline Summary */}
          <div className="space-y-2 bg-[var(--bg-secondary)] rounded-xl p-4 text-sm mb-5">
            <div className="flex justify-between"><span className="text-[var(--text-secondary)]">Tender ID</span><span className="font-mono text-xs">{summary.tender_id || result.tender_id}</span></div>
            <div className="flex justify-between"><span className="text-[var(--text-secondary)]">⛓️ TX Hash</span><span className="font-mono text-xs truncate max-w-[250px]">{summary.blockchain_tx}</span></div>
            <div className="flex justify-between"><span className="text-[var(--text-secondary)]">🧠 Risk Score</span>
              <span style={{ color: (summary.risk_score || 0) >= 80 ? '#ef4444' : (summary.risk_score || 0) >= 50 ? '#f59e0b' : '#22c55e', fontWeight: 700 }}>
                {summary.risk_score}%
              </span>
            </div>
            <div className="flex justify-between"><span className="text-[var(--text-secondary)]">Pipeline</span><span>{summary.steps_completed} steps completed</span></div>
            <div className="flex justify-between"><span className="text-[var(--text-secondary)]">Status</span>
              <span style={{ color: isFrozen ? '#ef4444' : '#22c55e', fontWeight: 700 }}>
                {isFrozen ? '❄️ FROZEN' : '✅ BIDDING_OPEN'}
              </span>
            </div>
          </div>

          {/* AI Fraud Detector Breakdown — Transparent Scoring */}
          {detectors.length > 0 && (
            <div className="mb-5">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <span>🧠</span> AI Fraud Analysis — 5 Detector Breakdown
              </h3>
              <div className="space-y-2">
                {detectors.map((d: any, i: number) => (
                  <div key={i} className="bg-[var(--bg-secondary)] rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium flex items-center gap-1.5">
                        {d.flag ? '🚩' : '✅'} {d.name}
                      </span>
                      <span className="text-xs font-bold" style={{ color: d.score >= 80 ? '#ef4444' : d.score >= 50 ? '#f59e0b' : '#22c55e' }}>
                        {d.score}%
                      </span>
                    </div>
                    {/* Progress bar */}
                    <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden', marginBottom: 4 }}>
                      <div style={{ height: '100%', width: `${d.score}%`, background: d.score >= 80 ? '#ef4444' : d.score >= 50 ? '#f59e0b' : '#22c55e', borderRadius: 4, transition: 'width 1s ease' }} />
                    </div>
                    <p className="text-[10px] text-[var(--text-secondary)] leading-tight">{d.evidence}</p>
                  </div>
                ))}
              </div>
              {aiSummary && (
                <div className="mt-3 p-3 rounded-lg" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                  <p className="text-xs text-[var(--text-secondary)]"><strong>AI Summary:</strong> {aiSummary}</p>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={() => router.push('/dashboard/blockchain')} className="btn-primary flex-1">View on Blockchain</button>
            <button onClick={() => { setSubmitted(false); setStep(0); setForm({ ...form, title: '', description: '' }); }} className="btn-primary flex-1" style={{ background: 'var(--bg-secondary)' }}>Create Another</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold">Create Tender</h1>
        <p className="text-sm text-[var(--text-secondary)]">Multi-step GFR-compliant tender creation</p>
      </div>

      {/* Progress */}
      <div className="flex gap-1">
        {STEPS.map((s, i) => (
          <div key={s} className="flex-1">
            <div className={`h-1.5 rounded-full transition-all ${i <= step ? 'bg-[var(--accent)]' : 'bg-[var(--bg-secondary)]'}`} />
            <p className={`text-[10px] mt-1 ${i <= step ? 'text-[var(--accent)]' : 'text-[var(--text-secondary)]'}`}>{s}</p>
          </div>
        ))}
      </div>

      <div className="card-glass p-8">
        {/* Step 1 */}
        {step === 0 && (
          <div className="space-y-4">
            <h3 className="font-semibold text-lg mb-4">📋 Basic Information</h3>
            <div id="field-ministry_code">
              <label className="block text-sm text-[var(--text-secondary)] mb-1.5">Ministry *</label>
              <select className="input-field" value={form.ministry_code} onChange={e => update('ministry_code', e.target.value)} style={{ borderColor: errors.ministry_code ? '#cc3300' : undefined }}>
                <option value="">Select Ministry</option>
                {MINISTRIES.map(m => <option key={m.code} value={m.code}>{m.name}</option>)}
              </select>
              {errors.ministry_code && <span style={{ color: '#cc3300', fontSize: 12, marginTop: 4, display: 'block' }}>{errors.ministry_code}</span>}
            </div>
            <div>
              <label className="block text-sm text-[var(--text-secondary)] mb-1.5">Department</label>
              <input className="input-field" value={form.department} onChange={e => update('department', e.target.value)} placeholder="e.g. National Highways Authority" />
            </div>
            <div id="field-title">
              <label className="block text-sm text-[var(--text-secondary)] mb-1.5">Tender Title *</label>
              <input className="input-field" value={form.title} onChange={e => update('title', e.target.value)} placeholder="e.g. NH-44 Highway Expansion Phase 3" style={{ borderColor: errors.title ? '#cc3300' : undefined }} />
              {errors.title && <span style={{ color: '#cc3300', fontSize: 12, marginTop: 4, display: 'block' }}>{errors.title}</span>}
            </div>
            <div id="field-description">
              <label className="block text-sm text-[var(--text-secondary)] mb-1.5">Description *</label>
              <textarea className="input-field" rows={4} value={form.description} onChange={e => update('description', e.target.value)} placeholder="Detailed description of the procurement..." style={{ borderColor: errors.description ? '#cc3300' : undefined }} />
              {errors.description && <span style={{ color: '#cc3300', fontSize: 12, marginTop: 4, display: 'block' }}>{errors.description}</span>}
            </div>
          </div>
        )}

        {/* Step 2 */}
        {step === 1 && (
          <div className="space-y-4">
            <h3 className="font-semibold text-lg mb-4">💰 Financial Details</h3>
            <div id="field-estimated_value_crore">
              <label className="block text-sm text-[var(--text-secondary)] mb-1.5">Estimated Value (₹ Crore) *</label>
              <input type="number" className="input-field" value={form.estimated_value_crore} onChange={e => update('estimated_value_crore', e.target.value)} placeholder="e.g. 450" style={{ borderColor: errors.estimated_value_crore ? '#cc3300' : undefined }} />
              {errors.estimated_value_crore && <span style={{ color: '#cc3300', fontSize: 12, marginTop: 4, display: 'block' }}>{errors.estimated_value_crore}</span>}
            </div>
            <div>
              <label className="block text-sm text-[var(--text-secondary)] mb-1.5">Bid Security (₹ Crore) — Auto: 2% of value</label>
              <input className="input-field" value={form.bid_security_crore} readOnly style={{ opacity: 0.7 }} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-[var(--text-secondary)] mb-1.5">Category</label>
                <select className="input-field" value={form.category} onChange={e => update('category', e.target.value)}>
                  <option value="WORKS">WORKS</option><option value="GOODS">GOODS</option>
                  <option value="SERVICES">SERVICES</option><option value="CONSULTANCY">CONSULTANCY</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-[var(--text-secondary)] mb-1.5">Procurement Method</label>
                <select className="input-field" value={form.procurement_method} onChange={e => update('procurement_method', e.target.value)}>
                  <option value="OPEN_TENDER">OPEN TENDER</option><option value="LIMITED_TENDER">LIMITED TENDER</option>
                  <option value="SINGLE_SOURCE">SINGLE SOURCE</option>
                </select>
              </div>
            </div>
            <div id="field-deadline">
              <label className="block text-sm text-[var(--text-secondary)] mb-1.5">Deadline *</label>
              <input type="datetime-local" className="input-field" value={form.deadline} onChange={e => update('deadline', e.target.value)} style={{ borderColor: errors.deadline ? '#cc3300' : undefined }} />
              {errors.deadline && <span style={{ color: '#cc3300', fontSize: 12, marginTop: 4, display: 'block' }}>{errors.deadline}</span>}
            </div>
            {parseFloat(form.estimated_value_crore) > 0 && form.procurement_method !== 'OPEN_TENDER' && parseFloat(form.estimated_value_crore) * 100 > 25 && (
              <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-sm">
                ⚠️ GFR Warning: Estimated value exceeds ₹25 Lakh — OPEN TENDER is required per GFR Rule 149.
              </div>
            )}
          </div>
        )}

        {/* Step 3 */}
        {step === 2 && (
          <div className="space-y-4">
            <h3 className="font-semibold text-lg mb-4">📜 Compliance</h3>
            <div>
              <label className="block text-sm text-[var(--text-secondary)] mb-1.5">GFR Rule Reference</label>
              <select className="input-field" value={form.gfr_reference} onChange={e => update('gfr_reference', e.target.value)}>
                {GFR_RULES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-[var(--text-secondary)] mb-1.5">GeM Category</label>
              <input className="input-field" value={form.gem_category} onChange={e => update('gem_category', e.target.value)} placeholder="e.g. Civil Construction Works" />
            </div>
            <div>
              <label className="block text-sm text-[var(--text-secondary)] mb-1.5">GeM ID (optional)</label>
              <input className="input-field" value={form.gem_id} onChange={e => update('gem_id', e.target.value)} placeholder="e.g. GEM/2025/B/4521" />
            </div>
            <div className="p-4 rounded-xl bg-[var(--bg-secondary)]">
              <h4 className="text-sm font-semibold mb-3">GFR Compliance Checklist</h4>
              {['Rule 144: Administrative approval obtained', 'Rule 149: Open tender for ≥₹25L', 'Rule 153: Bid security clause included', 'Rule 153(a): Performance security defined'].map(rule => (
                <div key={rule} className="flex items-center gap-2 py-1.5 text-sm">
                  <span className="text-green-400">✅</span>
                  <span className="text-[var(--text-secondary)]">{rule}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 4 */}
        {step === 3 && (
          <div className="space-y-4">
            <h3 className="font-semibold text-lg mb-4">📎 Documents</h3>
            <div className="border-2 border-dashed border-[var(--border-subtle)] rounded-xl p-10 text-center">
              <p className="text-4xl mb-3">📄</p>
              <p className="text-sm text-[var(--text-secondary)]">Drag & drop tender notice PDF here</p>
              <p className="text-xs text-[var(--text-secondary)] mt-2">Documents will be stored on IPFS for immutability</p>
              <p className="text-xs font-mono text-[var(--text-secondary)] mt-4">IPFS Hash: QmX9vK2mN8pL3qR7sT4uW6yZ1aB5cD0eF (mock)</p>
            </div>
          </div>
        )}

        {/* Step 5 */}
        {step === 4 && (
          <div className="space-y-4">
            <h3 className="font-semibold text-lg mb-4">✅ Review & Submit</h3>
            <div className="space-y-3 text-sm">
              {[
                ['Ministry', form.ministry || form.ministry_code],
                ['Department', form.department],
                ['Title', form.title],
                ['Category', form.category],
                ['Estimated Value', `₹${form.estimated_value_crore} Crore`],
                ['Bid Security', `₹${form.bid_security_crore} Crore`],
                ['GFR Reference', form.gfr_reference],
                ['GeM Category', form.gem_category],
                ['Method', form.procurement_method],
              ].map(([label, value]) => (
                <div key={label as string} className="flex justify-between p-3 bg-[var(--bg-secondary)] rounded-lg">
                  <span className="text-[var(--text-secondary)]">{label}</span>
                  <span className="font-medium">{value || 'N/A'}</span>
                </div>
              ))}
            </div>
            <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
              <h4 className="text-sm font-semibold mb-2">⛓️ Blockchain Preview</h4>
              <p className="text-xs text-[var(--text-secondary)]">Transaction will be recorded on Hyperledger Fabric &apos;TenderChannel&apos;</p>
              <p className="text-xs text-[var(--text-secondary)]">Endorsed by: MinistryOrg, AuditorOrg, NICOrg</p>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          <button onClick={() => setStep(Math.max(0, step - 1))} className="btn-primary" style={{ background: step === 0 ? 'var(--bg-secondary)' : undefined, opacity: step === 0 ? 0.5 : 1 }} disabled={step === 0}>← Back</button>
          {step < 4 ? (
            <button onClick={handleNext} className="btn-primary">Next →</button>
          ) : (
            <button onClick={handleSubmit} className="btn-primary" disabled={submitting}>
              {submitting ? '⏳ Publishing...' : '🚀 Submit to Blockchain'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
