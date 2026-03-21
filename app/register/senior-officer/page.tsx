// FILE: app/register/senior-officer/page.tsx
// PURPOSE: 5-step Senior Officer verification (inherits officer flow + seniority)
// INDIA API: Email domain + Aadhaar + Employee ID + Seniority proof
// MOCK MODE: YES — all steps accept demo data

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MINISTRY_OPTIONS, MINISTRY_DOMAINS } from '@/lib/verification/types';

const ACCENT = '#f59e0b';

const PAY_LEVELS = [
  'Level 10 (₹56,100)', 'Level 11 (₹67,700)', 'Level 12 (₹78,800)',
  'Level 13 (₹1,23,100)', 'Level 14 (₹1,44,200)', 'Level 15+ (₹1,82,200+)',
];

const APPROVAL_LIMITS = [
  'Up to ₹50 Crore', 'Up to ₹100 Crore', 'Up to ₹500 Crore', 'Above ₹500 Crore',
];

export default function SeniorOfficerVerification() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [email, setEmail] = useState('');
  const [emailValid, setEmailValid] = useState<boolean | null>(null);
  const [ministryName, setMinistryName] = useState('');

  const [aadhaar, setAadhaar] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [txnId, setTxnId] = useState('');
  const [aadhaarData, setAadhaarData] = useState<any>(null);

  const [empId, setEmpId] = useState('');
  const [ministry, setMinistry] = useState('');
  const [designation, setDesignation] = useState('');

  const [payLevel, setPayLevel] = useState('');
  const [approvalLimit, setApprovalLimit] = useState('');
  const [officeOrder, setOfficeOrder] = useState('');

  const [submitted, setSubmitted] = useState(false);

  async function callAPI(action: string, data: any) {
    const res = await fetch('/api/verify/officer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...data }),
    });
    return res.json();
  }

  function handleEmailChange(val: string) {
    setEmail(val);
    const domain = val.split('@')[1] || '';
    const isGov = domain.endsWith('.gov.in') || domain.endsWith('.nic.in');
    setEmailValid(val.includes('@') ? isGov : null);
    const m = Object.entries(MINISTRY_DOMAINS).find(([d]) => domain.includes(d));
    setMinistryName(m ? m[1] : isGov ? 'Government of India' : '');
  }

  const progress = (step / 5) * 100;

  if (submitted) {
    return (
      <Shell>
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <span style={{ fontSize: '64px', display: 'block', marginBottom: '20px' }}>🎉</span>
          <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'white' }}>Verification Submitted!</h2>
          <p style={{ color: '#888', fontSize: '14px', marginTop: '12px' }}>
            Senior Officer accounts require enhanced review. Expected: 24-48 hours.
          </p>
          <Link href="/" style={{ color: ACCENT, fontSize: '14px', textDecoration: 'none', display: 'block', marginTop: '24px' }}>
            ← Back to Sign In
          </Link>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <ProgressBar step={step} total={5} accent={ACCENT} />
      {error && <ErrorBox message={error} />}

      {step === 1 && (
        <Card title="Government Email" icon="📧">
          <p style={desc}>Your email must be a Government of India address.</p>
          <input value={email} onChange={e => handleEmailChange(e.target.value)}
            placeholder="firstname.lastname@morth.gov.in" style={inp} />
          {emailValid === true && <p style={{ color: '#4ade80', fontSize: '13px', marginTop: '8px' }}>✅ Valid — {ministryName}</p>}
          {emailValid === false && <p style={{ color: '#f87171', fontSize: '13px', marginTop: '8px' }}>❌ Only .gov.in or .nic.in accepted</p>}
          <button onClick={async () => {
            setLoading(true); setError('');
            const r = await callAPI('validate_email', { email });
            if (r.valid) { setStep(2); } else { setError(r.error); }
            setLoading(false);
          }} disabled={!emailValid || loading} style={{ ...btn, background: emailValid ? ACCENT : '#333', marginTop: '16px' }}>
            {loading ? 'Verifying...' : 'Verify Email →'}
          </button>
        </Card>
      )}

      {step === 2 && (
        <Card title="Aadhaar Verification" icon="🪪">
          <DemoHint />
          <input value={aadhaar} onChange={e => setAadhaar(e.target.value)} placeholder="XXXX-XXXX-XXXX" maxLength={14} style={inp} />
          {!otpSent ? (
            <button onClick={async () => {
              setLoading(true); setError('');
              const r = await callAPI('send_aadhaar_otp', { aadhaar_number: aadhaar.replace(/\D/g, '') });
              if (r.success) { setOtpSent(true); setTxnId(r.txnId); } else { setError(r.error); }
              setLoading(false);
            }} disabled={aadhaar.replace(/\D/g, '').length !== 12 || loading} style={{ ...btn, marginTop: '12px' }}>
              {loading ? 'Sending...' : 'Send OTP →'}
            </button>
          ) : (
            <>
              <input value={otp} onChange={e => setOtp(e.target.value)} placeholder="6-digit OTP" maxLength={6} style={{ ...inp, marginTop: '12px' }} />
              <button onClick={async () => {
                setLoading(true); setError('');
                const r = await callAPI('verify_aadhaar_otp', { aadhaar_number: aadhaar.replace(/\D/g, ''), otp, txn_id: txnId });
                if (r.success && r.data) { setAadhaarData(r.data); setStep(3); } else { setError(r.error); }
                setLoading(false);
              }} disabled={otp.length !== 6 || loading} style={{ ...btn, marginTop: '12px' }}>
                {loading ? 'Verifying...' : 'Verify OTP →'}
              </button>
            </>
          )}
          {aadhaarData && <VerifiedBlock data={aadhaarData} />}
        </Card>
      )}

      {step === 3 && (
        <Card title="Employee Details" icon="🏛️">
          <input value={empId} onChange={e => setEmpId(e.target.value)} placeholder="Employee ID" style={inp} />
          <select value={ministry} onChange={e => setMinistry(e.target.value)} style={{ ...inp, marginTop: '12px', appearance: 'auto' }}>
            <option value="">Select Ministry</option>
            {MINISTRY_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <input value={designation} onChange={e => setDesignation(e.target.value)} placeholder="Designation" style={{ ...inp, marginTop: '12px' }} />
          <button onClick={() => { if (empId.length >= 5 && designation.length >= 3 && ministry) setStep(4); else setError('Fill all fields'); }}
            style={{ ...btn, marginTop: '16px' }}>Continue →</button>
        </Card>
      )}

      {step === 4 && (
        <Card title="Seniority Confirmation" icon="⭐">
          <p style={desc}>Senior Officer roles require Level 12+ for tender approval authority.</p>
          <select value={payLevel} onChange={e => setPayLevel(e.target.value)} style={{ ...inp, appearance: 'auto' }}>
            <option value="">Select Pay Level</option>
            {PAY_LEVELS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <select value={approvalLimit} onChange={e => setApprovalLimit(e.target.value)} style={{ ...inp, marginTop: '12px', appearance: 'auto' }}>
            <option value="">Approval Authority Limit</option>
            {APPROVAL_LIMITS.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <input value={officeOrder} onChange={e => setOfficeOrder(e.target.value)}
            placeholder="Office Order Number (financial delegation)" style={{ ...inp, marginTop: '12px' }} />
          <button onClick={() => { if (payLevel && approvalLimit) setStep(5); else setError('Select pay level and approval limit'); }}
            style={{ ...btn, marginTop: '16px' }}>Continue →</button>
        </Card>
      )}

      {step === 5 && (
        <Card title="Review & Submit" icon="📋">
          <div style={{ padding: '20px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <Row icon="✅" label="Email" val={email} sub={ministryName} />
            <Row icon="✅" label="Aadhaar" val={`XXXX-XXXX-${aadhaarData?.aadhaar_number || '****'}`} sub={aadhaarData?.name} />
            <Row icon="✅" label="Employee ID" val={empId} sub={designation} />
            <Row icon="✅" label="Seniority" val={payLevel} sub={`Approval: ${approvalLimit}`} />
          </div>
          <button onClick={async () => {
            setLoading(true); setError('');
            const r = await callAPI('submit', {
              user_id: 'demo-senior-' + Date.now(), email, role: 'SENIOR_OFFICER',
              aadhaar_data: aadhaarData, employee_data: { employee_id: empId, ministry, designation },
              seniority_data: { payLevel, approvalLimit, officeOrder },
            });
            if (r.success) setSubmitted(true); else setError(r.error);
            setLoading(false);
          }} disabled={loading} style={{ ...btn, marginTop: '20px', background: '#22c55e' }}>
            {loading ? 'Submitting...' : '✅ Submit for Approval'}
          </button>
        </Card>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: '#080818', padding: '40px 20px', fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ maxWidth: '520px', margin: '0 auto' }}>
        <Link href="/register" style={{ color: '#666', fontSize: '13px', textDecoration: 'none', display: 'block', marginBottom: '24px' }}>← Back to role selection</Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
          <span style={{ fontSize: '24px' }}>⭐</span>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'white' }}>Senior Officer Verification</h1>
        </div>
        {children}
      </div>
    </div>
  );
}
function Card({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '28px' }}><h3 style={{ fontSize: '16px', fontWeight: 600, color: 'white', marginBottom: '16px' }}>{icon} {title}</h3>{children}</div>;
}
function ProgressBar({ step, total, accent }: { step: number; total: number; accent: string }) {
  return <div style={{ marginBottom: '32px' }}><div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}><span style={{ color: '#888', fontSize: '13px' }}>Step {step} of {total}</span><span style={{ color: accent, fontSize: '13px', fontWeight: 600 }}>{Math.round((step / total) * 100)}%</span></div><div style={{ height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px' }}><div style={{ height: '100%', width: `${(step / total) * 100}%`, background: accent, borderRadius: '2px', transition: 'width 300ms' }} /></div></div>;
}
function ErrorBox({ message }: { message: string }) {
  return <div style={{ padding: '12px 16px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', marginBottom: '20px', color: '#f87171', fontSize: '13px' }}>{message}</div>;
}
function DemoHint() {
  return <div style={{ padding: '10px 14px', background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: '8px', marginBottom: '16px', fontSize: '12px', color: '#fbbf24' }}>📱 Demo: Use any 12-digit number + OTP <strong>123456</strong></div>;
}
function VerifiedBlock({ data }: { data: any }) {
  return <div style={{ marginTop: '16px', padding: '16px', background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)', borderRadius: '10px' }}><p style={{ color: '#4ade80', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>✅ Aadhaar Verified</p><p style={{ color: '#aaa', fontSize: '12px' }}>Name: {data.name}</p><p style={{ color: '#aaa', fontSize: '12px' }}>DOB: {data.date_of_birth}</p></div>;
}
function Row({ icon, label, val, sub }: { icon: string; label: string; val: string; sub?: string }) {
  return <div style={{ marginBottom: '12px' }}><p style={{ fontSize: '13px', color: '#ccc' }}>{icon} <strong>{label}:</strong> {val}</p>{sub && <p style={{ fontSize: '12px', color: '#666', paddingLeft: '24px' }}>{sub}</p>}</div>;
}

const inp: React.CSSProperties = { width: '100%', padding: '12px 16px', borderRadius: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '14px', outline: 'none', boxSizing: 'border-box' };
const btn: React.CSSProperties = { width: '100%', padding: '12px 20px', borderRadius: '10px', background: '#f59e0b', color: 'white', border: 'none', fontWeight: 600, fontSize: '14px', cursor: 'pointer' };
const desc: React.CSSProperties = { color: '#888', fontSize: '13px', marginBottom: '16px' };
