'use client';

import { useState } from 'react';

type FraudType = 'BID_RIGGING' | 'SHELL_COMPANY' | 'BRIBERY' | 'SPEC_MANIPULATION' | 'INSIDER_INFO' | 'POST_AWARD' | 'OTHER';

interface SubmissionResult {
  submission_id: string;
  evidence_hash: string;
  blockchain_tx: string;
}

const FRAUD_TYPES: { value: FraudType; label: string }[] = [
  { value: 'BID_RIGGING', label: 'Bid Rigging / Cartel' },
  { value: 'SHELL_COMPANY', label: 'Shell Company / Front Entity' },
  { value: 'BRIBERY', label: 'Bribery / Kickbacks' },
  { value: 'SPEC_MANIPULATION', label: 'Specification Manipulation' },
  { value: 'INSIDER_INFO', label: 'Insider Information Leak' },
  { value: 'POST_AWARD', label: 'Post-Award Fraud' },
  { value: 'OTHER', label: 'Other' },
];

export default function WhistleblowerPage() {
  const [tenderId, setTenderId] = useState('');
  const [fraudType, setFraudType] = useState<FraudType>('BID_RIGGING');
  const [evidence, setEvidence] = useState('');
  const [contactToken, setContactToken] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmissionResult | null>(null);
  const [copied, setCopied] = useState(false);

  const generateToken = () => {
    const token = crypto.randomUUID();
    setContactToken(token);
  };

  const handleSubmit = async () => {
    if (evidence.trim().length < 100) return;
    setSubmitting(true);

    try {
      const res = await fetch('/api/whistleblower/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tender_id: tenderId || undefined,
          fraud_type: fraudType,
          evidence_text: evidence.trim(),
          contact_token: contactToken || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setResult(data);
      }
    } catch {
      // silent
    } finally {
      setSubmitting(false);
    }
  };

  const copyReceipt = () => {
    if (!result) return;
    navigator.clipboard.writeText(
      `TenderShield Whistleblower Receipt\nSubmission ID: ${result.submission_id}\nEvidence Hash: ${result.evidence_hash}\nBlockchain TX: ${result.blockchain_tx}\nContact Token: ${contactToken || 'Not provided'}\n\nKeep this safe. Present to CAG to claim reward if fraud is confirmed.`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a1a' }}>
      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '40px 24px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>🛡️</div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 8px', background: 'linear-gradient(135deg, #a78bfa, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            TenderShield Whistleblower Portal
          </h1>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>
            Your identity is never recorded. Evidence is hashed on blockchain.
          </p>
        </div>

        {/* Privacy Guarantee */}
        <div style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)', borderRadius: '16px', padding: '20px', marginBottom: '24px' }}>
          <p style={{ fontSize: '13px', fontWeight: 600, color: '#22c55e', marginBottom: '10px' }}>🔒 HOW YOUR ANONYMITY IS PROTECTED</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {[
              'IP address is NEVER logged',
              'Browser data is NEVER stored',
              'Only your evidence text is recorded',
              'Evidence is hashed using SHA-256',
              'Hash is recorded on Hyperledger blockchain',
              'Even the TenderShield team cannot identify you',
            ].map((item, i) => (
              <p key={i} style={{ fontSize: '12px', color: 'rgba(34,197,94,0.8)', margin: 0 }}>
                ✓ {item}
              </p>
            ))}
          </div>
        </div>

        {!result ? (
          <>
            {/* Submission Form */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Tender ID */}
              <div>
                <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: '6px' }}>
                  Tender ID (optional)
                </label>
                <input
                  type="text" value={tenderId} onChange={(e) => setTenderId(e.target.value)}
                  placeholder="e.g. TDR-MoH-2025-000003"
                  style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', color: '#fff', fontSize: '13px', outline: 'none', fontFamily: 'monospace' }}
                />
              </div>

              {/* Fraud Type */}
              <div>
                <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: '6px' }}>
                  Type of Fraud
                </label>
                <select
                  value={fraudType} onChange={(e) => setFraudType(e.target.value as FraudType)}
                  style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)', background: '#0d0d1e', color: '#fff', fontSize: '13px', outline: 'none' }}
                >
                  {FRAUD_TYPES.map((ft) => (
                    <option key={ft.value} value={ft.value}>{ft.label}</option>
                  ))}
                </select>
              </div>

              {/* Evidence */}
              <div>
                <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: '6px' }}>
                  Evidence Description (required, min 100 characters)
                </label>
                <textarea
                  value={evidence} onChange={(e) => setEvidence(e.target.value)}
                  placeholder="Describe what you know. Include dates, amounts, names, and any documents you can reference. Be as specific as possible..."
                  style={{ width: '100%', minHeight: '160px', padding: '14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', color: '#fff', fontSize: '13px', resize: 'vertical', outline: 'none', fontFamily: 'inherit' }}
                />
                <p style={{ fontSize: '11px', color: evidence.trim().length >= 100 ? '#22c55e' : 'rgba(255,255,255,0.3)', marginTop: '4px' }}>
                  {evidence.trim().length}/100 characters minimum
                </p>
              </div>

              {/* Contact Token */}
              <div>
                <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: '6px' }}>
                  Contact Token (optional — for reward claims)
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text" value={contactToken} onChange={(e) => setContactToken(e.target.value)}
                    placeholder="Generate or enter your secret token"
                    style={{ flex: 1, padding: '12px 14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', color: '#fff', fontSize: '13px', outline: 'none', fontFamily: 'monospace' }}
                  />
                  <button onClick={generateToken} style={{ padding: '12px 16px', borderRadius: '10px', border: '1px solid rgba(168,139,250,0.3)', background: 'rgba(168,139,250,0.1)', color: '#a78bfa', fontSize: '12px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    🎲 Generate
                  </button>
                </div>
                <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginTop: '4px' }}>
                  Keep this safe — we do NOT store it. Only a hash is recorded.
                </p>
              </div>

              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={evidence.trim().length < 100 || submitting}
                style={{
                  width: '100%', padding: '16px', borderRadius: '14px', border: 'none', fontSize: '15px', fontWeight: 700, cursor: evidence.trim().length >= 100 ? 'pointer' : 'not-allowed',
                  background: evidence.trim().length >= 100 ? 'linear-gradient(135deg, #a78bfa, #818cf8)' : 'rgba(255,255,255,0.05)',
                  color: evidence.trim().length >= 100 ? '#fff' : 'rgba(255,255,255,0.3)',
                  opacity: submitting ? 0.6 : 1,
                }}
              >
                {submitting ? 'Encrypting & Submitting...' : '🛡️ Submit Anonymously'}
              </button>
            </div>
          </>
        ) : (
          /* Success Receipt */
          <div style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '20px', padding: '32px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>✅</div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#22c55e', marginBottom: '8px' }}>
              REPORT SUBMITTED SUCCESSFULLY
            </h2>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginBottom: '24px' }}>
              Your evidence has been hashed and recorded on blockchain.
            </p>

            <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '14px', padding: '20px', textAlign: 'left', marginBottom: '20px' }}>
              {[
                { label: 'Submission ID', value: result.submission_id },
                { label: 'Evidence Hash', value: result.evidence_hash.slice(0, 24) + '...' },
                { label: 'Blockchain TX', value: result.blockchain_tx.slice(0, 24) + '...' },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < 2 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                  <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>{item.label}</span>
                  <span style={{ fontSize: '12px', fontFamily: 'monospace', color: '#a78bfa' }}>{item.value}</span>
                </div>
              ))}
            </div>

            <p style={{ fontSize: '12px', color: '#f97316', marginBottom: '20px' }}>
              ⚠️ SAVE THESE NOW — they cannot be recovered
            </p>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={copyReceipt} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid rgba(34,197,94,0.3)', background: 'rgba(34,197,94,0.1)', color: '#22c55e', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                {copied ? '✓ Copied!' : '📋 Copy Receipt'}
              </button>
              <button
                onClick={() => { setResult(null); setEvidence(''); setTenderId(''); setContactToken(''); }}
                style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.5)', fontSize: '13px', cursor: 'pointer' }}
              >
                Submit Another
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop: '40px', textAlign: 'center' }}>
          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)' }}>
            Evidence is permanently recorded on Hyperledger Fabric • Zero identifying data stored
          </p>
        </div>
      </div>
    </div>
  );
}
