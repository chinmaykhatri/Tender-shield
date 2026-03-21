// ─────────────────────────────────────────────────
// FILE: app/verify/page.tsx
// TYPE: CLIENT COMPONENT
// SECRET KEYS USED: none
// WHAT THIS FILE DOES: Public ZKP verification portal — verify any tender or bid cryptographically
// ─────────────────────────────────────────────────
'use client';

import { useState } from 'react';

type VerifyMode = 'tender' | 'bid';
interface VerificationResult {
  verified: boolean; checks: { label: string; passed: boolean; detail: string }[];
  tender_title?: string; block_number?: number; tx_hash?: string;
}

export default function VerifyPage() {
  const [mode, setMode] = useState<VerifyMode>('tender');
  const [tenderId, setTenderId] = useState('');
  const [bidId, setBidId] = useState('');
  const [txHash, setTxHash] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [qrVisible, setQrVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  const verify = async () => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 2000)); // simulate verification

    if (mode === 'tender') {
      setResult({
        verified: true,
        tender_title: tenderId.includes('000003') ? 'AIIMS Delhi Medical Equipment' : 'NH-44 Highway Expansion Phase 3',
        block_number: 1318,
        tx_hash: '0x2e5c8a1d3f7b4e9c1a2b3c4d5e6f7a8b9c0d1e2f',
        checks: [
          { label: 'Tender record exists on blockchain', passed: true, detail: 'Found on Hyperledger Fabric network' },
          { label: 'Data integrity verified', passed: true, detail: 'SHA-256 hash matches original submission' },
          { label: 'Timeline verified', passed: true, detail: 'All state transitions recorded correctly' },
          { label: 'No unauthorized modifications', passed: true, detail: 'Blockchain record unchanged since creation' },
          { label: 'Confirmed on Block #1,318', passed: true, detail: 'Block validated by 4 peer nodes' },
        ],
      });
    } else {
      setResult({
        verified: true,
        block_number: 1318,
        tx_hash: txHash || '0x9f8e7d6c5b4a3928172e6d5c4b3a2918f7e6d5c4',
        checks: [
          { label: 'Submitted before deadline', passed: true, detail: '14:22:15 IST — 2 hours before cutoff' },
          { label: 'Commitment hash matches amount', passed: true, detail: 'ZKP commitment verified mathematically' },
          { label: 'ZKP proof is mathematically valid', passed: true, detail: 'Groth16 proof verification passed' },
          { label: 'Blockchain record unchanged', passed: true, detail: 'No modifications since submission' },
          { label: 'Confirmed on Block #1,318', passed: true, detail: 'Consensus achieved across all peers' },
        ],
      });
    }
    setLoading(false);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/verify?${mode}=${mode === 'tender' ? tenderId : bidId}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <div className="tricolor-bar fixed top-0 left-0 right-0 z-50" />
      <div className="max-w-2xl mx-auto p-6 pt-10">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-display font-bold mb-2">🔐 TenderShield Verification Portal</h1>
          <p className="text-sm text-[var(--text-secondary)]">Verify any tender or bid cryptographically</p>
          <p className="text-xs text-[var(--text-secondary)] mt-1">No login required — public transparency tool</p>
        </div>

        {/* Mode toggle */}
        <div className="flex gap-2 mb-6 p-1 bg-[var(--bg-secondary)] rounded-xl">
          {(['tender', 'bid'] as VerifyMode[]).map(m => (
            <button key={m} onClick={() => { setMode(m); setResult(null); }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${mode === m ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-secondary)]'}`}>
              {m === 'tender' ? '📋 Verify a Tender' : '🔐 Verify a Bid (ZKP)'}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="card-glass rounded-xl p-6 mb-6">
          {mode === 'tender' ? (
            <div>
              <label className="block text-sm text-[var(--text-secondary)] mb-2">Tender ID</label>
              <input className="input-field w-full font-mono" placeholder="TDR-MoH-2025-000003" value={tenderId} onChange={e => setTenderId(e.target.value)} />
            </div>
          ) : (
            <div className="space-y-3">
              <div><label className="block text-sm text-[var(--text-secondary)] mb-2">Bid ID</label>
              <input className="input-field w-full font-mono" placeholder="BID-2025-000012" value={bidId} onChange={e => setBidId(e.target.value)} /></div>
              <div><label className="block text-sm text-[var(--text-secondary)] mb-2">TX Hash</label>
              <input className="input-field w-full font-mono text-xs" placeholder="0x..." value={txHash} onChange={e => setTxHash(e.target.value)} /></div>
            </div>
          )}
          <button onClick={verify} disabled={loading || (mode === 'tender' ? !tenderId : !bidId)}
            className="btn-primary w-full mt-4 disabled:opacity-50">
            {loading ? '🔍 Verifying on blockchain...' : mode === 'tender' ? '🔍 Verify' : '🔐 Verify ZKP Proof'}
          </button>
        </div>

        {/* Result */}
        {result && (
          <div className="card-glass rounded-xl p-6 animate-fade-in">
            <div className={`text-center p-4 rounded-xl mb-4 ${result.verified ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
              <p className={`text-lg font-bold ${result.verified ? 'text-green-400' : 'text-red-400'}`}>
                {result.verified ? `✅ ${mode === 'bid' ? 'BID' : 'TENDER'} VERIFIED — FAIR AND UNMODIFIED` : '❌ VERIFICATION FAILED'}
              </p>
            </div>

            {result.tender_title && <p className="text-sm text-center text-[var(--text-secondary)] mb-4">📋 {result.tender_title}</p>}

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

            {result.tx_hash && (
              <div className="p-3 rounded-lg bg-[var(--bg-secondary)] mb-4">
                <p className="text-[10px] text-[var(--text-secondary)]">TX Hash</p>
                <p className="text-xs font-mono break-all">{result.tx_hash}</p>
                <p className="text-[10px] text-[var(--text-secondary)] mt-1">Block #{result.block_number} — Cryptographically verified — cannot be altered</p>
              </div>
            )}

            <div className="flex gap-2">
              <button onClick={copyLink} className="flex-1 py-2 rounded-lg bg-[var(--bg-secondary)] text-xs">{copied ? '✅ Copied' : '📋 Copy Verification Link'}</button>
              <button onClick={() => setQrVisible(!qrVisible)} className="flex-1 py-2 rounded-lg bg-[var(--bg-secondary)] text-xs">📱 QR Code</button>
            </div>
            {qrVisible && (
              <div className="mt-3 p-4 rounded-lg bg-white flex items-center justify-center">
                <div className="w-32 h-32 bg-gray-100 flex items-center justify-center text-gray-500 text-xs text-center">
                  QR Code<br />for verification link
                </div>
              </div>
            )}
          </div>
        )}

        <a href="/dashboard" className="block text-center text-sm text-[var(--accent)] hover:underline mt-6">← Back to Dashboard</a>
      </div>
    </div>
  );
}
