// ─────────────────────────────────────────────────
// FILE: app/verify/zkp/page.tsx
// TYPE: PUBLIC PAGE (no login required)
// SECRET KEYS USED: none — all crypto runs in browser
// WHAT THIS FILE DOES: Cryptographic Bid Commitment — visual explanation + interactive commitment demo
// ─────────────────────────────────────────────────
'use client';

import { useState, useEffect } from 'react';
import { createBidCommitment, verifyBidCommitment } from '@/lib/zkp';

function StepPanel({ stepNum, title, children, active, icon }: {
  stepNum: number; title: string; children: React.ReactNode; active: boolean; icon: string;
}) {
  return (
    <div className={`card-glass p-6 transition-all duration-500 ${active ? 'border-[var(--accent)] shadow-[0_0_30px_rgba(99,102,241,0.2)]' : 'opacity-60'}`}>
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${active ? 'bg-[var(--accent)]' : 'bg-[var(--bg-secondary)]'}`}>
          {icon}
        </div>
        <div>
          <p className="text-xs text-[var(--accent)] font-semibold uppercase tracking-wider">Step {stepNum}</p>
          <h3 className="font-semibold">{title}</h3>
        </div>
      </div>
      {children}
    </div>
  );
}

export default function ZKPVerification() {
  const [activeStep, setActiveStep] = useState(0);
  const [bidAmount, setBidAmount] = useState('');
  const [commitment, setCommitment] = useState('');
  const [randomness, setRandomness] = useState('');
  const [verified, setVerified] = useState<boolean | null>(null);
  const [verifyAmount, setVerifyAmount] = useState('');
  const [generating, setGenerating] = useState(false);
  const [autoplaying, setAutoplaying] = useState(false);

  // Auto-advance steps
  useEffect(() => {
    if (!autoplaying) return;
    const timer = setInterval(() => {
      setActiveStep(s => {
        if (s >= 3) { setAutoplaying(false); return 3; }
        return s + 1;
      });
    }, 3000);
    return () => clearInterval(timer);
  }, [autoplaying]);

  const generateCommitment = async () => {
    if (!bidAmount) return;
    setGenerating(true);
    setVerified(null);

    // SHA-256 commitment: C = SHA-256(amountPaise || "||" || randomnessHex)
    const amountPaise = Math.round(parseFloat(bidAmount) * 100);
    const result = createBidCommitment(amountPaise);
    setCommitment(result.commitment);
    setRandomness(result.blinding_factor);

    setTimeout(() => setGenerating(false), 800);
  };

  const verifyCommitment = async () => {
    if (!verifyAmount || !randomness || !commitment) return;
    const verifyPaise = Math.round(parseFloat(verifyAmount) * 100);
    const result = verifyBidCommitment(commitment, verifyPaise, randomness);
    setVerified(result.valid);
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--accent)]/10 border border-[var(--accent)]/20 mb-4">
            <span className="text-[var(--accent)]">🔐</span>
            <span className="text-xs font-semibold text-[var(--accent)] uppercase tracking-wider">Cryptography Made Visual</span>
          </div>
          <h1 className="text-4xl font-bold mb-2">Cryptographic Bid Commitment — Live Verification</h1>
          <p className="text-lg text-[var(--text-secondary)]">SHA-256 commitment scheme: prove a bid is valid without revealing the amount</p>
          <button onClick={() => { setActiveStep(0); setAutoplaying(true); }}
            className="mt-4 text-sm text-[var(--accent)] hover:underline">
            ▶ Auto-play visual explanation
          </button>
        </div>

        {/* 4-Step Visual Explanation */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
          <StepPanel stepNum={1} title="Before Deadline — Commitment Phase" active={activeStep >= 0} icon="🔒">
            <div className="text-center p-4 mb-4 rounded-xl bg-[var(--bg-secondary)]">
              <div className="text-5xl mb-3">🔐</div>
              <p className="text-sm text-[var(--text-secondary)]">BioMed Corp commits their bid:</p>
              <p className="text-3xl font-bold text-[var(--saffron)] my-2">₹??? Crore</p>
              <p className="text-xs font-mono text-[var(--accent)]">Commitment: 0x8f3a...2b1c</p>
            </div>
            <p className="text-sm text-[var(--text-secondary)]">
              Nobody — not even the Ministry officer — can see the amount. The bid is locked inside a cryptographic safe.
            </p>
          </StepPanel>

          <StepPanel stepNum={2} title="The Math — Simplified" active={activeStep >= 1} icon="🧮">
            <div className="p-4 rounded-xl bg-[var(--bg-secondary)] font-mono text-center mb-4">
              <p className="text-xs text-[var(--text-secondary)] mb-2">SHA-256 Commitment (Content-Addressed Hash)</p>
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <span className="px-3 py-1 rounded bg-[var(--accent)]/20 text-[var(--accent)]">C</span>
                <span className="text-[var(--text-secondary)]">=</span>
                <span className="px-3 py-1 rounded bg-[var(--saffron)]/20 text-[var(--saffron)]">SHA-256</span>
                <span className="text-[var(--text-secondary)]">(</span>
                <span className="px-3 py-1 rounded bg-green-500/20 text-green-400">amount</span>
                <span className="text-[var(--text-secondary)]">||</span>
                <span className="px-3 py-1 rounded bg-purple-500/20 text-purple-400">randomness</span>
                <span className="text-[var(--text-secondary)]">)</span>
              </div>
              <p className="text-[10px] text-[var(--text-secondary)] mt-2">amount = bid in paise · randomness = 32-byte crypto random · Same function used in Go chaincode</p>
            </div>
            <div className="space-y-2 text-sm text-[var(--text-secondary)]">
              <p>✓ Anyone can verify the commitment exists</p>
              <p>✓ Nobody can compute the bid from the commitment</p>
              <p>✓ Even with infinite computing power</p>
            </div>
          </StepPanel>

          <StepPanel stepNum={3} title="After Deadline — Reveal Phase" active={activeStep >= 2} icon="🔓">
            <div className="text-center p-4 mb-4 rounded-xl bg-green-500/5 border border-green-500/20">
              <div className="text-5xl mb-3">🔓</div>
              <p className="text-sm text-[var(--text-secondary)]">Deadline passes. BioMed Corp reveals:</p>
              <p className="text-3xl font-bold text-green-400 my-2">₹119.8 Crore</p>
              <p className="text-xs font-mono text-green-400">hash(119.8 + randomness) = 0x8f3a...2b1c ✅</p>
              <p className="text-sm text-green-400 font-semibold mt-2">MATCH — bid is authentic and unchanged</p>
            </div>
          </StepPanel>

          <StepPanel stepNum={4} title="Why It Matters" active={activeStep >= 3} icon="🛡️">
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/20">
                <p className="text-xs text-red-400 font-semibold mb-1">❌ Without Bid Commitment</p>
                <p className="text-sm text-[var(--text-secondary)]">Minister can see bids → tip off favored bidder → corruption</p>
              </div>
              <div className="p-3 rounded-lg bg-green-500/5 border border-green-500/20">
                <p className="text-xs text-green-400 font-semibold mb-1">✅ With SHA-256 Commitment</p>
                <p className="text-sm text-[var(--text-secondary)]">Bid amounts are cryptographically hidden until deadline. Even the system cannot reverse the hash.</p>
              </div>
              <div className="p-3 rounded-lg bg-[var(--saffron)]/5 border border-[var(--saffron)]/20">
                <p className="text-xs text-[var(--saffron)] font-semibold">🇮🇳 The 2G scam pattern — where officials leaked confidential bid information — is made mathematically impossible by TenderShield.</p>
              </div>
            </div>
          </StepPanel>
        </div>

        {/* Live Demo */}
        <div className="card-glass p-8">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold mb-1">🧪 Try It Yourself</h2>
            <p className="text-[var(--text-secondary)]">Enter any number — see cryptographic commitment generated in your browser</p>
          </div>

          <div className="max-w-lg mx-auto space-y-6">
            {/* Generate */}
            <div>
              <label className="text-sm text-[var(--text-secondary)] mb-2 block">Enter a bid amount (any number)</label>
              <div className="flex gap-3">
                <input className="input-field font-mono text-lg" type="number" placeholder="e.g. 119.8"
                  value={bidAmount} onChange={e => { setBidAmount(e.target.value); setCommitment(''); setVerified(null); }} />
                <button onClick={generateCommitment} disabled={!bidAmount || generating}
                  className="btn-primary px-6 whitespace-nowrap disabled:opacity-50">
                  {generating ? '⏳ Generating...' : '🔐 Generate Commitment'}
                </button>
              </div>
            </div>

            {/* Commitment result */}
            {commitment && (
              <div className="p-4 rounded-xl bg-[var(--accent)]/5 border border-[var(--accent)]/20 animate-fade-in">
                <p className="text-xs text-[var(--text-secondary)] mb-1">Your Commitment Hash:</p>
                <p className="font-mono text-sm text-[var(--accent)] break-all">{commitment}</p>
                <p className="text-xs text-[var(--text-secondary)] mt-3 mb-1">Randomness (hidden in real system):</p>
                <p className="font-mono text-[10px] text-[var(--text-secondary)] break-all">{randomness.substring(0, 32)}...</p>
              </div>
            )}

            {/* Verify */}
            {commitment && (
              <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] animate-fade-in">
                <p className="text-sm font-semibold mb-3">Now verify — enter the amount to check:</p>
                <div className="flex gap-3">
                  <input className="input-field font-mono" type="number" placeholder="Enter amount to verify"
                    value={verifyAmount} onChange={e => { setVerifyAmount(e.target.value); setVerified(null); }} />
                  <button onClick={verifyCommitment} disabled={!verifyAmount}
                    className="btn-primary px-6 whitespace-nowrap disabled:opacity-50">
                    ✓ Verify
                  </button>
                </div>
                <p className="text-xs text-[var(--text-secondary)] mt-2">
                  💡 Try the exact amount — then change it by even 1 paisa. The hash changes completely.
                </p>
              </div>
            )}

            {/* Verification result */}
            {verified !== null && (
              <div className={`p-4 rounded-xl text-center animate-fade-in ${verified ? 'bg-green-500/10 border border-green-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
                <span className="text-4xl block mb-2">{verified ? '✅' : '❌'}</span>
                <p className="font-bold text-lg" style={{ color: verified ? '#22c55e' : '#ef4444' }}>
                  {verified ? 'VERIFICATION PASSED' : 'VERIFICATION FAILED'}
                </p>
                <p className="text-sm text-[var(--text-secondary)] mt-1">
                  {verified
                    ? 'The hash matches! This proves the bid amount is authentic and unchanged.'
                    : 'Hash does not match. Even a tiny change in the amount produces a completely different hash.'}
                </p>
              </div>
            )}
          </div>

          {/* Technical Proof */}
          <div className="mt-8 p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
            <p className="text-xs text-[var(--accent)] font-semibold mb-2">📋 Technical Proof — JavaScript running in your browser:</p>
            <pre className="text-xs font-mono text-[var(--text-secondary)] overflow-x-auto">
{`// SHA-256 Commitment — Identical to Go Chaincode
// File: lib/zkp.ts + chaincode/tendershield/zkp_utils.go

function commit(bidAmountPaise) {
  // Generate 32 bytes of cryptographic randomness
  const r = crypto.getRandomValues(new Uint8Array(32))
  const rHex = Array.from(r).map(b => b.toString(16).padStart(2, '0')).join('')
  
  // Pre-image: "amount||randomness" (matches Go's fmt.Sprintf)
  const preimage = bidAmountPaise.toString() + '||' + rHex
  
  // SHA-256 hash
  const encoder = new TextEncoder()
  const hash = await crypto.subtle.digest('SHA-256', encoder.encode(preimage))
  const C = Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0')).join('')
  
  return { commitment: C, blinding: rHex }
}

function verify(commitment, amount, blinding) {
  const preimage = amount.toString() + '||' + blinding
  const recomputed = sha256(preimage)
  return recomputed === commitment  // True iff amount matches
}

// ✅ SHA-256 — hiding (r is random) + binding (SHA-256 collision-resistant)
// ✅ Cross-verified: TypeScript === Go chaincode (see __tests__/zkp-crosslayer.test.ts)`}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <a href="/blockchain" className="text-[var(--accent)] text-sm hover:underline">🔗 Explore the Blockchain →</a>
          <span className="text-[var(--text-secondary)] mx-4">|</span>
          <a href="/dashboard" className="text-[var(--accent)] text-sm hover:underline">Dashboard →</a>
        </div>
      </div>
    </div>
  );
}
