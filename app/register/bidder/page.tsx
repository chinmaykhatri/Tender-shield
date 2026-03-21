// FILE: app/register/bidder/page.tsx
// PURPOSE: 5-step Bidder/Company verification with shell company detection
// INDIA API: GSTIN (API Setu), PAN (API Setu), Aadhaar (Surepass)
// MOCK MODE: YES — demo companies + OTP 123456

'use client';

import { useState } from 'react';
import Link from 'next/link';

const ACCENT = '#22c55e';

export default function BidderVerification() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [gstin, setGstin] = useState('');
  const [gstinData, setGstinData] = useState<any>(null);
  const [pan, setPan] = useState('');
  const [panData, setPanData] = useState<any>(null);
  const [sharedPan, setSharedPan] = useState<any>(null);
  const [aadhaar, setAadhaar] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [txnId, setTxnId] = useState('');
  const [aadhaarData, setAadhaarData] = useState<any>(null);
  const [signatoryName, setSignatoryName] = useState('');
  const [signatoryDesig, setSignatoryDesig] = useState('Director');
  const [gemId, setGemId] = useState('');
  const [gemValid, setGemValid] = useState(false);
  const [udyam, setUdyam] = useState('');
  const [udyamValid, setUdyamValid] = useState(false);
  const [isMsme, setIsMsme] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function callAPI(action: string, data: any) {
    const res = await fetch('/api/verify/bidder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...data }),
    });
    return res.json();
  }

  const trustScore =
    (gstinData ? 20 : 0) +
    (gstinData && !gstinData.is_shell_company_risk ? 15 : 0) +
    (panData ? 20 : 0) +
    (aadhaarData ? 25 : 0) +
    (gemValid ? 10 : 0) +
    (udyamValid ? 10 : 0);

  const progress = (step / 5) * 100;

  if (submitted) {
    return (
      <Shell>
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <span style={{ fontSize: '64px', display: 'block', marginBottom: '20px' }}>🎉</span>
          <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'white' }}>Registration Submitted!</h2>
          <p style={{ color: '#888', fontSize: '14px', marginTop: '12px' }}>Trust Score: <strong style={{ color: ACCENT }}>{trustScore}/100</strong></p>
          <p style={{ color: '#666', fontSize: '13px', marginTop: '8px' }}>
            {gstinData?.is_shell_company_risk
              ? '⚠️ Shell company flag detected — enhanced review required.'
              : 'A NIC Admin will review within 24-48 hours.'}
          </p>
          <Link href="/" style={{ color: ACCENT, fontSize: '14px', textDecoration: 'none', display: 'block', marginTop: '24px' }}>← Back to Sign In</Link>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <PBar step={step} total={5} />
      {error && <Err msg={error} />}

      {/* Step 1: GSTIN */}
      {step === 1 && (
        <Card title="Company GST Verification" icon="🏢">
          <p style={desc}>Enter your company&apos;s 15-character GSTIN to verify legal registration.</p>
          <div style={{ padding: '10px 14px', background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: '8px', marginBottom: '16px', fontSize: '12px', color: '#fbbf24' }}>
            💡 Demo GSTINs: <strong>07AABCM1234A1ZK</strong> (clean) or <strong>07AABCB5678B1ZP</strong> (shell company)
          </div>
          <input value={gstin} onChange={e => setGstin(e.target.value.toUpperCase())} placeholder="e.g. 07AABCM1234A1ZK" maxLength={15} style={inp} />
          <button onClick={async () => {
            setLoading(true); setError('');
            const r = await callAPI('verify_gstin', { gstin });
            if (r.success && r.data) { setGstinData(r.data); } else if (r.error) { setError(r.error); }
            setLoading(false);
          }} disabled={gstin.length < 15 || loading} style={{ ...btn, marginTop: '12px' }}>
            {loading ? 'Checking GST database...' : 'Verify GSTIN →'}
          </button>
          {gstinData && (
            <div style={{ marginTop: '16px', padding: '16px', background: gstinData.is_shell_company_risk ? 'rgba(239,68,68,0.06)' : 'rgba(34,197,94,0.06)', border: `1px solid ${gstinData.is_shell_company_risk ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)'}`, borderRadius: '10px' }}>
              <p style={{ color: gstinData.is_shell_company_risk ? '#f87171' : '#4ade80', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>
                {gstinData.is_shell_company_risk ? '⚠️ SHELL COMPANY RISK DETECTED' : '✅ GSTIN VERIFIED'}
              </p>
              <p style={det}>Company: {gstinData.legal_name}</p>
              <p style={det}>Status: {gstinData.status} | Registered: {gstinData.registration_date} ({gstinData.age_months} months)</p>
              <p style={det}>State: {gstinData.state} | Type: {gstinData.business_type}</p>
              {gstinData.is_shell_company_risk && (
                <p style={{ color: '#f87171', fontSize: '12px', marginTop: '8px' }}>
                  🚨 Company registered less than 6 months ago. Enhanced review required.
                </p>
              )}
              <button onClick={() => setStep(2)} style={{ ...btn, marginTop: '12px', background: '#6366f1' }}>
                Continue →
              </button>
            </div>
          )}
        </Card>
      )}

      {/* Step 2: PAN */}
      {step === 2 && (
        <Card title="PAN Verification" icon="💳">
          <p style={desc}>Enter your company&apos;s PAN number for director identity check.</p>
          <div style={{ padding: '10px 14px', background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: '8px', marginBottom: '16px', fontSize: '12px', color: '#fbbf24' }}>
            💡 Demo PAN: <strong>ABCDE1234F</strong> (shared director — triggers collusion flag)
          </div>
          <input value={pan} onChange={e => setPan(e.target.value.toUpperCase())} placeholder="e.g. ABCDE1234F" maxLength={10} style={inp} />
          <button onClick={async () => {
            setLoading(true); setError('');
            const r = await callAPI('verify_pan', { pan, user_id: 'demo-bidder' });
            if (r.success || r.data?.is_valid) {
              setPanData(r.data || r);
              if (r.shared_pan_detected) setSharedPan(r.shared_with_companies);
            } else { setError(r.error || 'PAN verification failed'); }
            setLoading(false);
          }} disabled={pan.length < 10 || loading} style={{ ...btn, marginTop: '12px' }}>
            {loading ? 'Verifying...' : 'Verify PAN →'}
          </button>
          {panData && (
            <div style={{ marginTop: '16px' }}>
              <div style={{ padding: '16px', background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)', borderRadius: '10px' }}>
                <p style={{ color: '#4ade80', fontSize: '14px', fontWeight: 600 }}>✅ PAN Verified — {panData.name || panData.pan}</p>
              </div>
              {sharedPan && (
                <div style={{ padding: '16px', marginTop: '8px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: '10px' }}>
                  <p style={{ color: '#f87171', fontSize: '14px', fontWeight: 600 }}>🚨 DUPLICATE PAN DETECTED</p>
                  <p style={{ color: '#888', fontSize: '12px', marginTop: '4px' }}>
                    This PAN is already linked to: {sharedPan.join(', ')}. Potential collusion will be flagged.
                  </p>
                </div>
              )}
              <button onClick={() => setStep(3)} style={{ ...btn, marginTop: '12px', background: '#6366f1' }}>Continue →</button>
            </div>
          )}
        </Card>
      )}

      {/* Step 3: Signatory Aadhaar */}
      {step === 3 && (
        <Card title="Authorized Signatory Identity" icon="🪪">
          <p style={desc}>The person authorized to submit bids must verify their personal identity.</p>
          <input value={signatoryName} onChange={e => setSignatoryName(e.target.value)} placeholder="Signatory Full Name" style={inp} />
          <select value={signatoryDesig} onChange={e => setSignatoryDesig(e.target.value)} style={{ ...inp, marginTop: '12px', appearance: 'auto' }}>
            <option value="Director">Director</option>
            <option value="Partner">Partner</option>
            <option value="Authorized Representative">Authorized Representative</option>
          </select>
          <input value={aadhaar} onChange={e => setAadhaar(e.target.value)} placeholder="Aadhaar Number (12 digits)" maxLength={14} style={{ ...inp, marginTop: '12px' }} />
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
              <input value={otp} onChange={e => setOtp(e.target.value)} placeholder="6-digit OTP (demo: 123456)" maxLength={6} style={{ ...inp, marginTop: '12px' }} />
              <button onClick={async () => {
                setLoading(true); setError('');
                const r = await callAPI('verify_aadhaar_otp', { aadhaar_number: aadhaar.replace(/\D/g, ''), otp, txn_id: txnId });
                if (r.success && r.data) { setAadhaarData(r.data); setStep(4); } else { setError(r.error); }
                setLoading(false);
              }} disabled={otp.length !== 6 || loading} style={{ ...btn, marginTop: '12px' }}>
                {loading ? 'Verifying...' : 'Verify OTP →'}
              </button>
            </>
          )}
        </Card>
      )}

      {/* Step 4: Optional Credentials */}
      {step === 4 && (
        <Card title="Additional Credentials (Optional)" icon="📄">
          <p style={desc}>Adding these increases your Trust Score and speeds up approval.</p>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ color: '#aaa', fontSize: '13px', fontWeight: 600 }}>GeM Seller ID</label>
            <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
              <input value={gemId} onChange={e => setGemId(e.target.value)} placeholder="GeM-1-2020-1234567" style={{ ...inp, flex: 1 }} />
              <button onClick={async () => {
                const r = await callAPI('verify_gem', { gem_seller_id: gemId });
                setGemValid(r.valid);
              }} style={{ ...btn, width: 'auto', padding: '10px 16px', fontSize: '13px' }}>Verify</button>
            </div>
            {gemValid && <p style={{ color: '#4ade80', fontSize: '12px', marginTop: '4px' }}>✅ GeM Verified Vendor</p>}
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#aaa', fontSize: '13px', fontWeight: 600 }}>
              <input type="checkbox" checked={isMsme} onChange={e => setIsMsme(e.target.checked)} />
              MSME Registered Company
            </label>
            {isMsme && (
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <input value={udyam} onChange={e => setUdyam(e.target.value.toUpperCase())} placeholder="UDYAM-XX-00-XXXXXXX" style={{ ...inp, flex: 1 }} />
                <button onClick={async () => {
                  const r = await callAPI('verify_udyam', { udyam_number: udyam });
                  setUdyamValid(r.valid);
                }} style={{ ...btn, width: 'auto', padding: '10px 16px', fontSize: '13px' }}>Verify</button>
              </div>
            )}
            {udyamValid && <p style={{ color: '#4ade80', fontSize: '12px', marginTop: '4px' }}>✅ MSME Verified — Price Preference Eligible (GFR 153A)</p>}
          </div>

          <button onClick={() => setStep(5)} style={{ ...btn, marginTop: '8px' }}>
            Continue {gemId || udyam ? '→' : 'without these →'}
          </button>
        </Card>
      )}

      {/* Step 5: Review */}
      {step === 5 && (
        <Card title="Review & Submit" icon="📋">
          {/* Trust Score */}
          <div style={{ padding: '20px', background: 'rgba(34,197,94,0.04)', border: '1px solid rgba(34,197,94,0.12)', borderRadius: '12px', marginBottom: '20px', textAlign: 'center' }}>
            <p style={{ color: '#888', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>🏆 Trust Score</p>
            <p style={{ fontSize: '36px', fontWeight: 800, color: trustScore >= 60 ? '#4ade80' : trustScore >= 40 ? '#fbbf24' : '#f87171', fontFamily: "'Outfit', sans-serif" }}>
              {trustScore} / 100
            </p>
            <p style={{ color: '#888', fontSize: '13px' }}>
              {trustScore >= 80 ? 'STRONG' : trustScore >= 60 ? 'GOOD' : trustScore >= 40 ? 'FAIR' : 'NEEDS IMPROVEMENT'}
            </p>
          </div>
          <div style={{ padding: '20px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p style={{ fontSize: '13px', color: '#ccc', marginBottom: '8px' }}>{gstinData?.is_shell_company_risk ? '⚠️' : '✅'} <strong>GSTIN:</strong> {gstinData?.gstin} — {gstinData?.legal_name}</p>
            <p style={{ fontSize: '13px', color: '#ccc', marginBottom: '8px' }}>{sharedPan ? '🚨' : '✅'} <strong>PAN:</strong> {panData?.pan} — {panData?.name}</p>
            <p style={{ fontSize: '13px', color: '#ccc', marginBottom: '8px' }}>✅ <strong>Aadhaar:</strong> Signatory verified — {aadhaarData?.name}</p>
            <p style={{ fontSize: '13px', color: '#ccc', marginBottom: '8px' }}>{gemValid ? '✅' : '⬜'} <strong>GeM:</strong> {gemValid ? 'Registered' : 'Not provided'}</p>
            <p style={{ fontSize: '13px', color: '#ccc' }}>{udyamValid ? '✅' : '⬜'} <strong>MSME:</strong> {udyamValid ? 'Verified' : 'Not applicable'}</p>
          </div>
          <button onClick={async () => {
            setLoading(true); setError('');
            const r = await callAPI('submit', {
              user_id: 'demo-bidder-' + Date.now(), email: '', gstin_data: gstinData,
              pan_data: panData, aadhaar_data: aadhaarData,
              gem_data: gemValid ? { gem_seller_id: gemId, valid: true } : null,
              udyam_data: udyamValid ? { udyam_number: udyam, valid: true, category: 'SMALL', is_msme: true } : null,
              trust_score: trustScore,
            });
            if (r.success) setSubmitted(true); else setError(r.error);
            setLoading(false);
          }} disabled={loading} style={{ ...btn, marginTop: '20px' }}>
            {loading ? 'Submitting...' : '✅ Submit for Approval'}
          </button>
        </Card>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div style={{ minHeight: '100vh', background: '#080818', padding: '40px 20px', fontFamily: "'DM Sans', sans-serif" }}><div style={{ maxWidth: '520px', margin: '0 auto' }}><Link href="/register" style={{ color: '#666', fontSize: '13px', textDecoration: 'none', display: 'block', marginBottom: '24px' }}>← Back to role selection</Link><div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}><span style={{ fontSize: '24px' }}>🏢</span><h1 style={{ fontSize: '22px', fontWeight: 700, color: 'white' }}>Company / Bidder Verification</h1></div>{children}</div></div>;
}
function Card({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '28px' }}><h3 style={{ fontSize: '16px', fontWeight: 600, color: 'white', marginBottom: '16px' }}>{icon} {title}</h3>{children}</div>;
}
function PBar({ step, total }: { step: number; total: number }) {
  const p = (step / total) * 100;
  return <div style={{ marginBottom: '32px' }}><div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}><span style={{ color: '#888', fontSize: '13px' }}>Step {step} of {total}</span><span style={{ color: '#22c55e', fontSize: '13px', fontWeight: 600 }}>{Math.round(p)}%</span></div><div style={{ height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px' }}><div style={{ height: '100%', width: `${p}%`, background: '#22c55e', borderRadius: '2px', transition: 'width 300ms' }} /></div></div>;
}
function Err({ msg }: { msg: string }) {
  return <div style={{ padding: '12px 16px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', marginBottom: '20px', color: '#f87171', fontSize: '13px' }}>{msg}</div>;
}

const inp: React.CSSProperties = { width: '100%', padding: '12px 16px', borderRadius: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '14px', outline: 'none', boxSizing: 'border-box' };
const btn: React.CSSProperties = { width: '100%', padding: '12px 20px', borderRadius: '10px', background: '#22c55e', color: 'white', border: 'none', fontWeight: 600, fontSize: '14px', cursor: 'pointer' };
const desc: React.CSSProperties = { color: '#888', fontSize: '13px', marginBottom: '16px' };
const det: React.CSSProperties = { color: '#aaa', fontSize: '12px', lineHeight: 1.7 };
