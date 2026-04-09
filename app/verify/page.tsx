'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

// ============================================================================
// TenderShield — Public Verification Portal
// ============================================================================
// REAL verification — calls /api/verify/tender which rebuilds the SHA-256
// hash chain from live Supabase audit_events. No fake setTimeout.
// ============================================================================

type VerifyMode = 'tender' | 'bid';
interface VerificationResult {
  verified: boolean;
  tender_id?: string;
  tender_title?: string;
  tender_status?: string;
  tender_ministry?: string;
  tender_value_crore?: number;
  chain_integrity?: boolean;
  tender_event_count?: number;
  total_chain_blocks?: number;
  verification_time_ms?: number;
  algorithm?: string;
  checks: { label: string; passed: boolean; detail: string }[];
  tender_blocks?: { block: number; hash: string; event: string; timestamp: string }[];
  error?: string;
}

function VerifyContent() {
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<VerifyMode>('tender');
  const [tenderId, setTenderId] = useState('');
  const [bidId, setBidId] = useState('');
  const [expectedHash, setExpectedHash] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [qrVisible, setQrVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const [fromQR, setFromQR] = useState(false);

  // Auto-fill from URL params (from QR scan)
  useEffect(() => {
    const t = searchParams.get('tender') || searchParams.get('tender_id') || '';
    const h = searchParams.get('hash') || searchParams.get('tx') || '';
    const source = searchParams.get('source') || '';
    if (t) { setTenderId(t); setMode('tender'); }
    if (h) setExpectedHash(h);
    if (source === 'qr') setFromQR(true);
    // Auto-verify if coming from QR
    if (t && source === 'qr') {
      verifyTender(t, h);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const verifyTender = async (id?: string, hash?: string) => {
    const tid = id || tenderId;
    if (!tid) return;
    setLoading(true);
    setResult(null);
    try {
      const params = new URLSearchParams({ tender_id: tid });
      if (hash || expectedHash) params.set('hash', hash || expectedHash);
      const res = await fetch(`/api/verify/tender?${params.toString()}`);
      const data = await res.json();
      setResult(data);
    } catch {
      setResult({
        verified: false,
        checks: [{ label: 'API Reachable', passed: false, detail: 'Could not reach verification API. Please try again.' }],
        error: 'Network error — verification API unreachable',
      });
    }
    setLoading(false);
  };

  const verify = async () => {
    if (mode === 'tender') {
      await verifyTender();
    } else {
      // Bid verification — verify the tender chain with the bid's commitment hash
      setLoading(true);
      setResult(null);
      try {
        const tid = tenderId || bidId.split('-').slice(0, 4).join('-');
        const params = new URLSearchParams({ tender_id: tid });
        if (expectedHash) params.set('hash', expectedHash);
        const res = await fetch(`/api/verify/tender?${params.toString()}`);
        const data = await res.json();
        setResult(data);
      } catch {
        setResult({ verified: false, checks: [{ label: 'API Reachable', passed: false, detail: 'Network error' }] });
      }
      setLoading(false);
    }
  };

  const copyLink = () => {
    const url = `${window.location.origin}/verify?tender=${tenderId}${expectedHash ? `&hash=${expectedHash}` : ''}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const qrUrl = tenderId
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`${typeof window !== 'undefined' ? window.location.origin : ''}/verify?tender=${tenderId}&source=qr`)}&bgcolor=0a0a1a&color=4ade80`
    : '';

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <div className="tricolor-bar fixed top-0 left-0 right-0 z-50" />
      <div className="max-w-2xl mx-auto p-6 pt-10">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-display font-bold mb-2">🔐 TenderShield Verification Portal</h1>
          <p className="text-sm text-[var(--text-secondary)]">Verify any tender cryptographically — real SHA-256 hash chain verification</p>
          <p className="text-xs text-[var(--text-secondary)] mt-1">No login required — public transparency tool</p>
          {fromQR && (
            <p className="text-xs text-green-400 mt-2 bg-green-500/10 inline-block px-3 py-1 rounded-full">
              📱 Scanned from QR code — auto-verifying...
            </p>
          )}
        </div>

        {/* Mode toggle */}
        <div className="flex gap-2 mb-6 p-1 bg-[var(--bg-secondary)] rounded-xl">
          {(['tender', 'bid'] as VerifyMode[]).map(m => (
            <button key={m} onClick={() => { setMode(m); setResult(null); }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${mode === m ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-secondary)]'}`}>
              {m === 'tender' ? '📋 Verify a Tender' : '🔐 Verify a Sealed Bid'}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="card-glass rounded-xl p-6 mb-6">
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-[var(--text-secondary)] mb-2">
                {mode === 'tender' ? 'Tender ID' : 'Bid ID / Tender ID'}
              </label>
              <input className="input-field w-full font-mono" placeholder="TDR-MoH-2026-000003"
                value={mode === 'tender' ? tenderId : bidId}
                onChange={e => mode === 'tender' ? setTenderId(e.target.value) : setBidId(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm text-[var(--text-secondary)] mb-2">Expected Hash (optional)</label>
              <input className="input-field w-full font-mono text-xs" placeholder="0x... or leave empty for full chain verification"
                value={expectedHash} onChange={e => setExpectedHash(e.target.value)} />
            </div>
          </div>
          <button onClick={verify} disabled={loading || (mode === 'tender' ? !tenderId : !bidId)}
            className="btn-primary w-full mt-4 disabled:opacity-50">
            {loading ? '🔍 Verifying on blockchain (recomputing SHA-256 chain)...' : '🔍 Verify'}
          </button>
          {/* Quick test buttons */}
          <div className="flex gap-2 mt-3">
            {['TDR-MoH-2026-000003', 'TDR-MoRTH-2026-000001'].map(id => (
              <button key={id} onClick={() => { setTenderId(id); setMode('tender'); }}
                className="text-xs text-[var(--accent)] hover:underline">
                Try {id.split('-')[1]} →
              </button>
            ))}
          </div>
        </div>

        {/* Result */}
        {result && (
          <div className="card-glass rounded-xl p-6 animate-fade-in">
            <div className={`text-center p-4 rounded-xl mb-4 ${result.verified ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
              <p className={`text-lg font-bold ${result.verified ? 'text-green-400' : 'text-red-400'}`}>
                {result.verified ? '✅ TENDER VERIFIED — INTEGRITY INTACT' : '❌ VERIFICATION FAILED'}
              </p>
              {result.verification_time_ms !== undefined && (
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  Verified in {result.verification_time_ms}ms using {result.algorithm || 'SHA-256'}
                </p>
              )}
            </div>

            {result.tender_title && (
              <div className="p-3 rounded-lg bg-[var(--bg-secondary)] mb-4">
                <p className="text-sm font-medium">📋 {result.tender_title}</p>
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  {result.tender_ministry} · ₹{result.tender_value_crore} Cr · Status: {result.tender_status}
                </p>
              </div>
            )}

            {result.error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 mb-4">
                <p className="text-xs text-red-400">{result.error}</p>
              </div>
            )}

            <div className="space-y-2 mb-4">
              {result.checks.map((c, i) => (
                <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-[var(--bg-secondary)]">
                  <span className={c.passed ? 'text-green-400' : 'text-red-400'}>{c.passed ? '✅' : '❌'}</span>
                  <div>
                    <p className="text-xs font-medium">{c.label}</p>
                    <p className="text-[10px] text-[var(--text-secondary)]">{c.detail}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Chain stats */}
            {result.total_chain_blocks && (
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="p-2 rounded-lg bg-[var(--bg-secondary)] text-center">
                  <p className="text-lg font-bold font-mono text-[var(--accent)]">{result.total_chain_blocks}</p>
                  <p className="text-[10px] text-[var(--text-secondary)]">Chain Blocks</p>
                </div>
                <div className="p-2 rounded-lg bg-[var(--bg-secondary)] text-center">
                  <p className="text-lg font-bold font-mono text-green-400">{result.tender_event_count}</p>
                  <p className="text-[10px] text-[var(--text-secondary)]">Tender Events</p>
                </div>
                <div className="p-2 rounded-lg bg-[var(--bg-secondary)] text-center">
                  <p className="text-lg font-bold font-mono text-[var(--accent)]">{result.verification_time_ms}ms</p>
                  <p className="text-[10px] text-[var(--text-secondary)]">Verify Time</p>
                </div>
              </div>
            )}

            {/* Tender blocks timeline */}
            {result.tender_blocks && result.tender_blocks.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-medium mb-2">📦 Blockchain Events for this Tender</p>
                <div className="space-y-1">
                  {result.tender_blocks.map((b, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 rounded bg-[var(--bg-secondary)] text-xs">
                      <span className="font-mono text-[var(--accent)]">#{b.block}</span>
                      <span className="badge badge-info text-[10px]">{b.event}</span>
                      <span className="font-mono text-[var(--text-secondary)] text-[10px] ml-auto">{b.hash}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button onClick={copyLink} className="flex-1 py-2 rounded-lg bg-[var(--bg-secondary)] text-xs">{copied ? '✅ Copied' : '📋 Copy Verification Link'}</button>
              <button onClick={() => setQrVisible(!qrVisible)} className="flex-1 py-2 rounded-lg bg-[var(--bg-secondary)] text-xs">📱 QR Code</button>
            </div>
            {qrVisible && qrUrl && (
              <div className="mt-3 p-4 rounded-lg bg-[#0a0a1a] flex flex-col items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrUrl} alt="Verification QR" width={160} height={160} style={{ borderRadius: '8px' }} />
                <p className="text-[10px] text-[var(--text-secondary)]">Scan to verify this tender</p>
              </div>
            )}
          </div>
        )}

        <a href="/dashboard" className="block text-center text-sm text-[var(--accent)] hover:underline mt-6">← Back to Dashboard</a>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <p className="text-[var(--text-secondary)]">Loading verification portal...</p>
      </div>
    }>
      <VerifyContent />
    </Suspense>
  );
}
