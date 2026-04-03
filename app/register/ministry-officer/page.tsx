// FILE: app/register/ministry-officer/page.tsx
// PURPOSE: 4-step Ministry Officer verification flow
// INDIA API: Email domain check + Aadhaar + Employee ID
// MOCK MODE: YES — demo data accepted, OTP 123456
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MINISTRY_OPTIONS, MINISTRY_DOMAINS } from '@/lib/verification/types';

const ACCENT = '#6366f1';

export default function MinistryOfficerVerification() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 1: Email
  const [email, setEmail] = useState('');
  const [emailValid, setEmailValid] = useState<boolean | null>(null);
  const [ministryName, setMinistryName] = useState('');
  const [emailVerified, setEmailVerified] = useState(false);

  // Step 2: Aadhaar
  const [aadhaar, setAadhaar] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [txnId, setTxnId] = useState('');
  const [aadhaarData, setAadhaarData] = useState<any>(null);

  // Step 3: Employee
  const [empId, setEmpId] = useState('');
  const [ministry, setMinistry] = useState('');
  const [designation, setDesignation] = useState('');
  const [employeeValid, setEmployeeValid] = useState(false);

  // Step 4: submitted
  const [submitted, setSubmitted] = useState(false);

  async function callAPI(action: string, data: any) {
    const res = await fetch('/api/verify/officer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...data }),
    });
    return res.json();
  }

  // Email validation (live)
  function handleEmailChange(val: string) {
    setEmail(val);
    const domain = val.split('@')[1] || '';
    const isGov = domain.endsWith('.gov.in') || domain.endsWith('.nic.in');
    setEmailValid(val.includes('@') ? isGov : null);
    const m = Object.entries(MINISTRY_DOMAINS).find(([d]) => domain.includes(d));
    setMinistryName(m ? m[1] : isGov ? 'Government of India' : '');
  }

  async function sendEmailOTP() {
    setLoading(true); setError('');
    const result = await callAPI('validate_email', { email });
    if (result.valid) {
      setEmailVerified(true);
      setStep(2);
    } else {
      setError(result.error || 'Invalid email');
    }
    setLoading(false);
  }

  async function sendAadhaarOTP() {
    setLoading(true); setError('');
    const result = await callAPI('send_aadhaar_otp', { aadhaar_number: aadhaar.replace(/\D/g, '') });
    if (result.success) {
      setOtpSent(true);
      setTxnId(result.txnId || '');
    } else {
      setError(result.error || 'Failed to send OTP');
    }
    setLoading(false);
  }

  async function verifyOTP() {
    setLoading(true); setError('');
    const result = await callAPI('verify_aadhaar_otp', {
      aadhaar_number: aadhaar.replace(/\D/g, ''),
      otp,
      txn_id: txnId,
    });
    if (result.success && result.data) {
      setAadhaarData(result.data);
      setStep(3);
    } else {
      setError(result.error || 'OTP verification failed');
    }
    setLoading(false);
  }

  function validateEmployee() {
    if (empId.length >= 5 && designation.length >= 3 && ministry) {
      setEmployeeValid(true);
      setStep(4);
    } else {
      setError('Please fill all employee fields correctly');
    }
  }

  async function submitForm() {
    setLoading(true); setError('');
    const result = await callAPI('submit', {
      user_id: 'demo-user-' + Date.now(),
      email,
      role: 'MINISTRY_OFFICER',
      aadhaar_data: aadhaarData,
      employee_data: { employee_id: empId, ministry, designation },
    });
    if (result.success) setSubmitted(true);
    else setError(result.error || 'Submission failed');
    setLoading(false);
  }

  const progress = (step / 4) * 100;

  if (submitted) {
    return (
      <PageShell>
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <span style={{ fontSize: '64px', display: 'block', marginBottom: '20px' }}>🎉</span>
          <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'white', marginBottom: '12px' }}>
            Verification Submitted!
          </h2>
          <p style={{ color: '#888', fontSize: '14px', lineHeight: 1.7, maxWidth: '400px', margin: '0 auto 24px' }}>
            Your account is under review. A NIC Admin will verify your credentials within 24-48 hours.
            You will receive an email notification.
          </p>
          <Link href="/" style={{ color: ACCENT, fontSize: '14px', textDecoration: 'none' }}>
            ← Back to Sign In
          </Link>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      {/* Progress */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ color: '#888', fontSize: '13px' }}>Step {step} of 4</span>
          <span style={{ color: ACCENT, fontSize: '13px', fontWeight: 600 }}>{Math.round(progress)}%</span>
        </div>
        <div style={{ height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px' }}>
          <div style={{ height: '100%', width: `${progress}%`, background: ACCENT, borderRadius: '2px', transition: 'width 300ms' }} />
        </div>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', marginBottom: '20px', color: '#f87171', fontSize: '13px' }}>
          {error}
        </div>
      )}

      {/* Step 1: Email */}
      {step === 1 && (
        <StepCard title="Government Email" icon="📧">
          <p style={{ color: '#888', fontSize: '13px', marginBottom: '16px' }}>
            Your email must be a Government of India address. Personal emails are not accepted.
          </p>
          <input value={email} onChange={e => handleEmailChange(e.target.value)}
            placeholder="firstname.lastname@morth.gov.in"
            style={inputStyle} />
          {emailValid === true && <p style={{ color: '#4ade80', fontSize: '13px', marginTop: '8px' }}>✅ Valid government domain{ministryName && ` — ${ministryName}`}</p>}
          {emailValid === false && <p style={{ color: '#f87171', fontSize: '13px', marginTop: '8px' }}>❌ Only .gov.in or .nic.in addresses accepted</p>}
          <button onClick={sendEmailOTP} disabled={!emailValid || loading}
            style={{ ...btnStyle, background: emailValid ? ACCENT : '#333', marginTop: '16px' }}>
            {loading ? 'Verifying...' : 'Verify Email →'}
          </button>
        </StepCard>
      )}

      {/* Step 2: Aadhaar */}
      {step === 2 && (
        <StepCard title="Aadhaar Verification" icon="🪪">
          <div style={{ padding: '12px 16px', background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: '10px', marginBottom: '16px', fontSize: '12px', color: '#a5b4fc' }}>
            🔒 Only last 4 digits stored. Full number never saved. (Aadhaar Act 2016 §29)
          </div>
          {process.env.NEXT_PUBLIC_DEMO_MODE === 'true' && (
            <div style={{ padding: '10px 14px', background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: '8px', marginBottom: '16px', fontSize: '12px', color: '#fbbf24' }}>
              📱 Demo: Use any 12-digit number + OTP <strong>123456</strong>
            </div>
          )}
          <input value={aadhaar} onChange={e => setAadhaar(e.target.value)} placeholder="XXXX-XXXX-XXXX"
            maxLength={14} style={inputStyle} />
          {!otpSent ? (
            <button onClick={sendAadhaarOTP} disabled={aadhaar.replace(/\D/g, '').length !== 12 || loading}
              style={{ ...btnStyle, marginTop: '12px' }}>
              {loading ? 'Sending OTP...' : 'Send OTP →'}
            </button>
          ) : (
            <>
              <input value={otp} onChange={e => setOtp(e.target.value)} placeholder="Enter 6-digit OTP"
                maxLength={6} style={{ ...inputStyle, marginTop: '12px' }} />
              <button onClick={verifyOTP} disabled={otp.length !== 6 || loading}
                style={{ ...btnStyle, marginTop: '12px' }}>
                {loading ? 'Verifying...' : 'Verify OTP →'}
              </button>
            </>
          )}
          {aadhaarData && (
            <div style={{ marginTop: '16px', padding: '16px', background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)', borderRadius: '10px' }}>
              <p style={{ color: '#4ade80', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>✅ Aadhaar Verified</p>
              <p style={detailStyle}>Name: {aadhaarData.name}</p>
              <p style={detailStyle}>DOB: {aadhaarData.date_of_birth}</p>
              <p style={detailStyle}>Address: {aadhaarData.address}</p>
            </div>
          )}
        </StepCard>
      )}

      {/* Step 3: Employee */}
      {step === 3 && (
        <StepCard title="Employee Details" icon="🏛️">
          <input value={empId} onChange={e => setEmpId(e.target.value)}
            placeholder="Employee ID (e.g. MoRTH-EMP-2019-4521)" style={inputStyle} />
          <select value={ministry} onChange={e => setMinistry(e.target.value)}
            style={{ ...inputStyle, marginTop: '12px', appearance: 'auto' }}>
            <option value="">Select Ministry / Department</option>
            {MINISTRY_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <input value={designation} onChange={e => setDesignation(e.target.value)}
            placeholder="Designation (e.g. Deputy Director)" style={{ ...inputStyle, marginTop: '12px' }} />
          <button onClick={validateEmployee} disabled={loading}
            style={{ ...btnStyle, marginTop: '16px' }}>
            Continue →
          </button>
        </StepCard>
      )}

      {/* Step 4: Review */}
      {step === 4 && (
        <StepCard title="Review & Submit" icon="📋">
          <div style={{ padding: '20px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <h4 style={{ color: 'white', fontSize: '14px', fontWeight: 600, marginBottom: '16px' }}>YOUR VERIFICATION SUMMARY</h4>
            <SummaryRow icon="✅" label="Email" value={email} sub={ministryName} />
            <SummaryRow icon="✅" label="Aadhaar" value={`XXXX-XXXX-${aadhaarData?.aadhaar_number || '****'}`} sub={aadhaarData?.name} />
            <SummaryRow icon="✅" label="Employee ID" value={empId} sub={designation} />
            <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(251,191,36,0.08)', borderRadius: '8px' }}>
              <p style={{ color: '#fbbf24', fontSize: '13px' }}>⏳ Status: Pending Admin Approval</p>
              <p style={{ color: '#666', fontSize: '12px' }}>A NIC Admin will review within 24-48 hours</p>
            </div>
          </div>
          <button onClick={submitForm} disabled={loading}
            style={{ ...btnStyle, marginTop: '20px', background: '#22c55e' }}>
            {loading ? 'Submitting...' : '✅ Submit for Approval'}
          </button>
        </StepCard>
      )}
    </PageShell>
  );
}

// Shared UI components
function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: '#080818', padding: '40px 20px', fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ maxWidth: '520px', margin: '0 auto' }}>
        <Link href="/register" style={{ color: '#666', fontSize: '13px', textDecoration: 'none', display: 'block', marginBottom: '24px' }}>
          ← Back to role selection
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
          <span style={{ fontSize: '24px' }}>🏛️</span>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'white' }}>Ministry Officer Verification</h1>
        </div>
        {children}
      </div>
    </div>
  );
}

function StepCard({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '28px' }}>
      <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'white', marginBottom: '16px' }}>
        {icon} {title}
      </h3>
      {children}
    </div>
  );
}

function SummaryRow({ icon, label, value, sub }: { icon: string; label: string; value: string; sub?: string }) {
  return (
    <div style={{ marginBottom: '12px' }}>
      <p style={{ fontSize: '13px', color: '#ccc' }}>{icon} <strong>{label}:</strong> {value}</p>
      {sub && <p style={{ fontSize: '12px', color: '#666', paddingLeft: '24px' }}>{sub}</p>}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '12px 16px', borderRadius: '10px',
  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
  color: 'white', fontSize: '14px', outline: 'none', boxSizing: 'border-box',
};

const btnStyle: React.CSSProperties = {
  width: '100%', padding: '12px 20px', borderRadius: '10px',
  background: '#6366f1', color: 'white', border: 'none',
  fontWeight: 600, fontSize: '14px', cursor: 'pointer',
};

const detailStyle: React.CSSProperties = { color: '#aaa', fontSize: '12px', lineHeight: 1.7 };
