// FILE: app/register/auditor/page.tsx
// PURPOSE: 4-step CAG Auditor verification — strictest flow
// INDIA API: Aadhaar (Surepass), Access Code system
// MOCK MODE: YES — demo code format TS-AUD-XXXXXX accepted

'use client';

import { useState } from 'react';
import Link from 'next/link';

const ACCENT = '#ef4444';

export default function AuditorVerification() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [email, setEmail] = useState('');
  const [emailValid, setEmailValid] = useState<boolean | null>(null);

  const [aadhaar, setAadhaar] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [txnId, setTxnId] = useState('');
  const [aadhaarData, setAadhaarData] = useState<any>(null);

  const [empId, setEmpId] = useState('');
  const [designation, setDesignation] = useState('Audit Officer');

  const [accessCode, setAccessCode] = useState('');
  const [submitted, setSubmitted] = useState(false);

  async function callAPI(action: string, data: any) {
    const res = await fetch('/api/verify/auditor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...data }),
    });
    return res.json();
  }

  function handleEmailChange(val: string) {
    setEmail(val);
    const domain = val.split('@')[1] || '';
    setEmailValid(val.includes('@') ? domain === 'cag.gov.in' : null);
  }

  const progress = (step / 4) * 100;

  if (submitted) {
    return (
      <Shell>
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <span style={{ fontSize: '64px', display: 'block', marginBottom: '20px' }}>🎉</span>
          <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'white' }}>Account Created!</h2>
          <p style={{ color: '#4ade80', fontSize: '14px', marginTop: '12px', fontWeight: 600 }}>
            ✅ No admin approval needed — access code pre-authorized your registration
          </p>
          <p style={{ color: '#888', fontSize: '13px', marginTop: '8px' }}>
            You now have full CAG Auditor access to ALL tenders, bids, and fraud evidence.
          </p>
          <Link href="/" style={{ color: ACCENT, fontSize: '14px', textDecoration: 'none', display: 'block', marginTop: '24px' }}>
            ← Sign in to your account
          </Link>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <PBar step={step} total={4} accent={ACCENT} />
      {error && <Err msg={error} />}

      {/* Step 1: CAG Email */}
      {step === 1 && (
        <Card title="CAG Official Email" icon="📧">
          <p style={desc}>Only official Comptroller and Auditor General of India email addresses are accepted.</p>
          <input value={email} onChange={e => handleEmailChange(e.target.value)} placeholder="firstname@cag.gov.in" style={inp} />
          {emailValid === true && <p style={{ color: '#4ade80', fontSize: '13px', marginTop: '8px' }}>✅ Valid CAG email address</p>}
          {emailValid === false && <p style={{ color: '#f87171', fontSize: '13px', marginTop: '8px', lineHeight: 1.6 }}>❌ Only @cag.gov.in addresses accepted. CAG Auditor accounts cannot be self-registered with other domains.</p>}
          <button onClick={async () => {
            setLoading(true); setError('');
            const r = await callAPI('validate_email', { email });
            if (r.valid) setStep(2); else setError(r.error);
            setLoading(false);
          }} disabled={!emailValid || loading} style={{ ...btn, marginTop: '16px' }}>
            {loading ? 'Verifying...' : 'Continue →'}
          </button>
        </Card>
      )}

      {/* Step 2: Aadhaar */}
      {step === 2 && (
        <Card title="Aadhaar Verification" icon="🪪">
          <div style={demoBox}>📱 Demo: Use any 12-digit number + OTP <strong>123456</strong></div>
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
        </Card>
      )}

      {/* Step 3: CAG Employee */}
      {step === 3 && (
        <Card title="CAG Employee Details" icon="🔍">
          <input value={empId} onChange={e => setEmpId(e.target.value)} placeholder="CAG Employee ID (e.g. CAG-2015-004521)" style={inp} />
          <select value={designation} onChange={e => setDesignation(e.target.value)} style={{ ...inp, marginTop: '12px', appearance: 'auto' }}>
            <option value="Audit Officer">Audit Officer</option>
            <option value="Sr. Audit Officer">Sr. Audit Officer</option>
            <option value="IA&AS Officer">IA&AS Officer</option>
            <option value="Deputy Accountant General">Deputy Accountant General (DAG)</option>
            <option value="Accountant General">Accountant General (AG)</option>
          </select>
          <button onClick={() => { if (empId.length >= 5) setStep(4); else setError('Employee ID required'); }}
            style={{ ...btn, marginTop: '16px' }}>Continue →</button>
        </Card>
      )}

      {/* Step 4: Access Code */}
      {step === 4 && (
        <Card title="Special Access Code" icon="🔑">
          <div style={{ padding: '16px', background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: '10px', marginBottom: '16px' }}>
            <p style={{ color: '#a5b4fc', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Why is this code required?</p>
            <p style={{ color: '#888', fontSize: '12px', lineHeight: 1.7 }}>
              CAG Auditors have access to ALL tenders, ALL bids, and ALL fraud evidence. This level of access must be authorized by NIC Administration. Contact your NIC Admin to receive your access code.
            </p>
          </div>
          <div style={demoBox}>💡 Demo: Use format <strong>TS-AUD-XXXXXX</strong> (e.g. TS-AUD-ABC123)</div>
          <input value={accessCode} onChange={e => setAccessCode(e.target.value.toUpperCase())} placeholder="TS-AUD-XXXXXX" maxLength={14} style={inp} />
          <button onClick={async () => {
            setLoading(true); setError('');
            const r = await callAPI('verify_access_code', { access_code: accessCode, user_id: 'demo-auditor-' + Date.now() });
            if (r.valid) {
              // Submit everything
              const sub = await callAPI('submit', {
                user_id: 'demo-auditor-' + Date.now(), email,
                aadhaar_data: aadhaarData,
                employee_data: { employee_id: empId, designation },
                access_code: accessCode,
              });
              if (sub.success) setSubmitted(true); else setError(sub.error || sub.message);
            } else { setError(r.error); }
            setLoading(false);
          }} disabled={accessCode.length < 10 || loading} style={{ ...btn, marginTop: '16px' }}>
            {loading ? 'Verifying...' : '🔓 Verify Code & Create Account'}
          </button>
        </Card>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div style={{ minHeight: '100vh', background: '#080818', padding: '40px 20px', fontFamily: "'DM Sans', sans-serif" }}><div style={{ maxWidth: '520px', margin: '0 auto' }}><Link href="/register" style={{ color: '#666', fontSize: '13px', textDecoration: 'none', display: 'block', marginBottom: '24px' }}>← Back to role selection</Link><div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}><span style={{ fontSize: '24px' }}>🔍</span><h1 style={{ fontSize: '22px', fontWeight: 700, color: 'white' }}>CAG Auditor Verification</h1></div>{children}</div></div>;
}
function Card({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '28px' }}><h3 style={{ fontSize: '16px', fontWeight: 600, color: 'white', marginBottom: '16px' }}>{icon} {title}</h3>{children}</div>;
}
function PBar({ step, total, accent }: { step: number; total: number; accent: string }) {
  const p = (step / total) * 100;
  return <div style={{ marginBottom: '32px' }}><div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}><span style={{ color: '#888', fontSize: '13px' }}>Step {step} of {total}</span><span style={{ color: accent, fontSize: '13px', fontWeight: 600 }}>{Math.round(p)}%</span></div><div style={{ height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px' }}><div style={{ height: '100%', width: `${p}%`, background: accent, borderRadius: '2px', transition: 'width 300ms' }} /></div></div>;
}
function Err({ msg }: { msg: string }) {
  return <div style={{ padding: '12px 16px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', marginBottom: '20px', color: '#f87171', fontSize: '13px' }}>{msg}</div>;
}

const inp: React.CSSProperties = { width: '100%', padding: '12px 16px', borderRadius: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '14px', outline: 'none', boxSizing: 'border-box' };
const btn: React.CSSProperties = { width: '100%', padding: '12px 20px', borderRadius: '10px', background: '#ef4444', color: 'white', border: 'none', fontWeight: 600, fontSize: '14px', cursor: 'pointer' };
const desc: React.CSSProperties = { color: '#888', fontSize: '13px', marginBottom: '16px' };
const demoBox: React.CSSProperties = { padding: '10px 14px', background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: '8px', marginBottom: '16px', fontSize: '12px', color: '#fbbf24' };
