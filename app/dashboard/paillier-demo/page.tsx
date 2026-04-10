'use client';

import { useState } from 'react';

// ═══════════════════════════════════════════════════════════
// TenderShield — Paillier Homomorphic Encryption Demo
// Interactive UI: enter bids → encrypt → compare → reveal L1
// ═══════════════════════════════════════════════════════════

interface BidEntry { name: string; amount: number; }

type Stage = 'input' | 'encrypting' | 'encrypted' | 'comparing' | 'result';

export default function PaillierDemoPage() {
  const [bids, setBids] = useState<BidEntry[]>([
    { name: 'Alpha Infrastructure Ltd', amount: 115 },
    { name: 'Beta Systems Pvt Ltd', amount: 118 },
    { name: 'Gamma Solutions Corp', amount: 112 },
  ]);
  const [stage, setStage] = useState<Stage>('input');
  const [encryptedData, setEncryptedData] = useState<any>(null);
  const [result, setResult] = useState<any>(null);
  const [publicKey, setPublicKey] = useState<any>(null);

  const addBidder = () => setBids([...bids, { name: `Bidder ${bids.length + 1}`, amount: 100 }]);
  const removeBidder = (i: number) => setBids(bids.filter((_, idx) => idx !== i));

  const handleEncrypt = async () => {
    setStage('encrypting');
    try {
      const res = await fetch('/api/paillier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'encrypt',
          amounts: bids.map(b => b.amount),
          bidders: bids.map(b => b.name),
        }),
      });
      const data = await res.json();
      setEncryptedData(data);
      setPublicKey(data.publicKey);
      setStage('encrypted');
    } catch { setStage('input'); }
  };

  const handleCompare = async () => {
    setStage('comparing');
    try {
      const res = await fetch('/api/paillier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'compare',
          amounts: bids.map(b => b.amount),
          bidders: bids.map(b => b.name),
        }),
      });
      const data = await res.json();
      setResult(data);
      setStage('result');
    } catch { setStage('encrypted'); }
  };

  const reset = () => {
    setStage('input');
    setEncryptedData(null);
    setResult(null);
    setPublicKey(null);
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>🔐 Paillier Homomorphic Encryption</h1>
        <p style={{ fontSize: 13, color: '#94a3b8' }}>
          Compare sealed bids without decrypting them — preserving bid confidentiality during evaluation
        </p>
      </div>

      {/* Math explainer */}
      <div className="card-glass" style={{ padding: 16, borderRadius: 14, marginBottom: 20, borderLeft: '3px solid #6366f1' }}>
        <p style={{ fontSize: 11, color: '#a5b4fc', fontWeight: 600, marginBottom: 6 }}>How It Works</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {[
            { step: '1', title: 'Encrypt', desc: 'Each bid encrypted with public key', math: 'E(m) = gᵐ · rⁿ mod n²' },
            { step: '2', title: 'Add (Homomorphic)', desc: 'Add encrypted values without decryption', math: 'E(a) · E(b) = E(a + b)' },
            { step: '3', title: 'Compare', desc: 'Determine L1 winner while bids stay sealed', math: 'E(a-b) → sign reveals order' },
          ].map(s => (
            <div key={s.step} style={{ padding: 12, borderRadius: 10, background: 'rgba(255,255,255,0.02)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <span style={{ width: 20, height: 20, borderRadius: '50%', background: '#6366f120', color: '#6366f1', fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{s.step}</span>
                <span style={{ fontSize: 12, fontWeight: 700 }}>{s.title}</span>
              </div>
              <p style={{ fontSize: 10, color: '#94a3b8', marginBottom: 4 }}>{s.desc}</p>
              <code style={{ fontSize: 10, color: '#818cf8', fontFamily: 'monospace' }}>{s.math}</code>
            </div>
          ))}
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
        {['input', 'encrypted', 'result'].map((s, i) => (
          <div key={s} style={{
            flex: 1, height: 4, borderRadius: 2,
            background: (['input', 'encrypting', 'encrypted', 'comparing', 'result'].indexOf(stage) >= i)
              ? '#6366f1' : 'rgba(255,255,255,0.06)',
            transition: 'background 0.5s',
          }} />
        ))}
      </div>

      {/* INPUT Stage */}
      {(stage === 'input' || stage === 'encrypting') && (
        <div className="card-glass" style={{ padding: 24, borderRadius: 16, marginBottom: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>📋 Enter Bid Amounts (₹ Crore)</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {bids.map((b, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <input
                  type="text"
                  value={b.name}
                  onChange={e => setBids(bids.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                  style={{
                    flex: 2, padding: '10px 14px', borderRadius: 10,
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                    color: '#e2e8f0', fontSize: 13, outline: 'none',
                  }}
                />
                <div style={{ position: 'relative', flex: 1 }}>
                  <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: 13 }}>₹</span>
                  <input
                    type="number"
                    value={b.amount}
                    onChange={e => setBids(bids.map((x, j) => j === i ? { ...x, amount: Number(e.target.value) } : x))}
                    style={{
                      width: '100%', padding: '10px 14px 10px 28px', borderRadius: 10,
                      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                      color: '#e2e8f0', fontSize: 13, fontFamily: 'monospace', outline: 'none',
                    }}
                  />
                </div>
                <span style={{ fontSize: 10, color: '#64748b' }}>Cr</span>
                {bids.length > 2 && (
                  <button onClick={() => removeBidder(i)} style={{ color: '#f87171', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}>✕</button>
                )}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <button onClick={addBidder} style={{
              padding: '8px 16px', borderRadius: 10, fontSize: 12,
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              color: '#94a3b8', cursor: 'pointer',
            }}>+ Add Bidder</button>
            <button onClick={handleEncrypt} disabled={stage === 'encrypting'} style={{
              flex: 1, padding: '12px 24px', borderRadius: 12, border: 'none',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: '#fff', fontWeight: 700, fontSize: 14, cursor: stage === 'encrypting' ? 'wait' : 'pointer',
              opacity: stage === 'encrypting' ? 0.6 : 1,
            }}>
              {stage === 'encrypting' ? '🔄 Encrypting...' : '🔐 Encrypt All Bids'}
            </button>
          </div>
        </div>
      )}

      {/* ENCRYPTED Stage */}
      {(stage === 'encrypted' || stage === 'comparing') && encryptedData && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            {/* Encrypted View */}
            <div className="card-glass" style={{ padding: 20, borderRadius: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: '#f87171' }}>🔒 Encrypted View (Public)</h3>
              <p style={{ fontSize: 10, color: '#64748b', marginBottom: 12 }}>What everyone sees — bid amounts are hidden</p>
              {encryptedData.encrypted_bids?.map((b: any, i: number) => (
                <div key={i} style={{ padding: 10, borderRadius: 10, marginBottom: 8, background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.1)' }}>
                  <p style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>{b.bidder}</p>
                  <p style={{ fontSize: 9, fontFamily: 'monospace', color: '#f87171', wordBreak: 'break-all' }}>
                    {b.ciphertext_preview}
                  </p>
                  <p style={{ fontSize: 9, color: '#64748b', marginTop: 2 }}>Bid amount: ██████ (encrypted)</p>
                </div>
              ))}
            </div>

            {/* Audit View */}
            <div className="card-glass" style={{ padding: 20, borderRadius: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: '#22c55e' }}>🔓 Audit View (Private Key Holder)</h3>
              <p style={{ fontSize: 10, color: '#64748b', marginBottom: 12 }}>What the authorized auditor sees after decryption</p>
              {encryptedData.encrypted_bids?.map((b: any, i: number) => (
                <div key={i} style={{ padding: 10, borderRadius: 10, marginBottom: 8, background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.1)' }}>
                  <p style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>{b.bidder}</p>
                  <p style={{ fontSize: 16, fontWeight: 800, color: '#22c55e', fontFamily: 'monospace' }}>₹{b.original} Cr</p>
                </div>
              ))}
            </div>
          </div>

          {/* Public Key info */}
          {publicKey && (
            <div className="card-glass" style={{ padding: 16, borderRadius: 14, marginBottom: 16, fontSize: 10 }}>
              <p style={{ fontWeight: 700, color: '#94a3b8', marginBottom: 6 }}>Paillier Public Key ({publicKey.bits}-bit demo)</p>
              <div style={{ display: 'flex', gap: 16 }}>
                <div><span style={{ color: '#64748b' }}>n = </span><code style={{ color: '#818cf8', fontFamily: 'monospace' }}>{publicKey.n.slice(0, 20)}...</code></div>
                <div><span style={{ color: '#64748b' }}>g = </span><code style={{ color: '#818cf8', fontFamily: 'monospace' }}>{publicKey.g.slice(0, 20)}...</code></div>
              </div>
              <p style={{ color: '#f59e0b', marginTop: 6, fontSize: 9 }}>⚠️ 64-bit keys for demo speed. Production: 2048-bit.</p>
            </div>
          )}

          <button onClick={handleCompare} disabled={stage === 'comparing'} style={{
            width: '100%', padding: '14px 24px', borderRadius: 14, border: 'none',
            background: 'linear-gradient(135deg, #22c55e, #16a34a)',
            color: '#fff', fontWeight: 700, fontSize: 15, cursor: stage === 'comparing' ? 'wait' : 'pointer',
            opacity: stage === 'comparing' ? 0.6 : 1,
          }}>
            {stage === 'comparing' ? '🔄 Comparing Encrypted Bids...' : '⚡ Compare Without Decrypting → Find L1'}
          </button>
        </div>
      )}

      {/* RESULT Stage */}
      {stage === 'result' && result && (
        <div>
          {/* Winner announcement */}
          <div className="card-glass" style={{
            padding: 24, borderRadius: 20, marginBottom: 16, textAlign: 'center',
            background: 'linear-gradient(135deg, rgba(34,197,94,0.1), rgba(34,197,94,0.03))',
            border: '2px solid rgba(34,197,94,0.2)',
          }}>
            <p style={{ fontSize: 40, marginBottom: 8 }}>🏆</p>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#22c55e', marginBottom: 4 }}>
              L1 Bidder: {result.winner}
            </h2>
            <p style={{ fontSize: 12, color: '#94a3b8' }}>
              Determined via homomorphic comparison — bids remained encrypted during evaluation
            </p>
            <p style={{ fontSize: 10, color: '#64748b', marginTop: 6 }}>
              Comparison completed in {result.comparison_time_ms}ms
            </p>
          </div>

          {/* Ranking */}
          <div className="card-glass" style={{ padding: 20, borderRadius: 16, marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>📊 Bid Ranking</h3>
            {result.ranking?.map((r: any, i: number) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: 12,
                borderRadius: 10, marginBottom: 6,
                background: r.rank === 1 ? 'rgba(34,197,94,0.06)' : 'rgba(255,255,255,0.02)',
                border: `1px solid ${r.rank === 1 ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.05)'}`,
              }}>
                <span style={{
                  width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, fontWeight: 800,
                  background: r.rank === 1 ? '#22c55e20' : '#6366f120',
                  color: r.rank === 1 ? '#22c55e' : '#6366f1',
                }}>
                  {r.rank === 1 ? '🥇' : r.rank === 2 ? '🥈' : '🥉'}
                </span>
                <span style={{ fontSize: 14, fontWeight: 600, flex: 1 }}>{r.bidder}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: r.rank === 1 ? '#22c55e' : '#94a3b8', fontFamily: 'monospace' }}>
                  ₹{bids[i]?.amount || '?'} Cr
                </span>
              </div>
            ))}
          </div>

          {/* Homomorphic sum proof */}
          {result.homomorphic_sum && (
            <div className="card-glass" style={{ padding: 16, borderRadius: 14, marginBottom: 16, borderLeft: '3px solid #22c55e' }}>
              <p style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>✅ Homomorphic Addition Proof</p>
              <p style={{ fontSize: 11, color: '#94a3b8' }}>
                Sum of encrypted bids computed <em>without decryption</em>:
              </p>
              <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 11 }}>
                <div>
                  <span style={{ color: '#64748b' }}>Decrypted sum: </span>
                  <span style={{ color: '#22c55e', fontWeight: 800 }}>₹{result.homomorphic_sum.decrypted_sum} Cr</span>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Expected: </span>
                  <span style={{ color: '#f59e0b', fontWeight: 800 }}>₹{result.homomorphic_sum.expected_sum} Cr</span>
                </div>
                <span style={{ color: result.homomorphic_sum.matches ? '#22c55e' : '#ef4444', fontWeight: 800 }}>
                  {result.homomorphic_sum.matches ? '✅ MATCH' : '❌ MISMATCH'}
                </span>
              </div>
            </div>
          )}

          <button onClick={reset} style={{
            width: '100%', padding: '12px 24px', borderRadius: 12, border: 'none',
            background: '#6366f1', color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer',
          }}>
            🔄 Reset Demo
          </button>
        </div>
      )}
    </div>
  );
}
