// FILE: app/dashboard/procurement/page.tsx
// Full Procurement Lifecycle: Create → Bid → Reveal → Evaluate → Award
'use client';

import { useState, useEffect, useRef } from 'react';

// ─── Types ─────────────────────────────────────────────
interface Bid {
  bidder: string;
  company: string;
  commitment: string;
  zkpValid: boolean;
  revealedAmount?: number;
  revealValid?: boolean;
  mlPrediction?: string;
  mlProbability?: number;
  submittedAt: string;
}

interface TenderState {
  id: string;
  title: string;
  ministry: string;
  estimatedValue: number;
  category: string;
  phase: string;
  bids: Bid[];
  winner?: string;
  winnerAmount?: number;
  createdAt: string;
  blockchainTx?: string;
  events: { time: string; phase: string; detail: string; icon: string; source?: string }[];
}

// ─── Phase Configuration ───────────────────────────────
const PHASES = [
  { key: 'CREATED', label: 'Create', icon: '📝', color: '#6366f1' },
  { key: 'BIDDING_OPEN', label: 'Bidding', icon: '🔐', color: '#8b5cf6' },
  { key: 'REVEAL', label: 'Reveal', icon: '🔓', color: '#f59e0b' },
  { key: 'EVALUATION', label: 'Evaluate', icon: '🤖', color: '#ef4444' },
  { key: 'AWARDED', label: 'Award', icon: '🏆', color: '#22c55e' },
];

const DEMO_BIDDERS = [
  { name: 'Rajesh Patel', company: 'MedTech Solutions Pvt Ltd', amount: 115.5 },
  { name: 'Priya Sharma', company: 'BioMed Corp', amount: 118.2 },
  { name: 'Amit Singh', company: 'PharmaCare Industries', amount: 112.8 },
];

// ─── Component ─────────────────────────────────────────
export default function ProcurementLifecyclePage() {
  const [tender, setTender] = useState<TenderState | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentAction, setCurrentAction] = useState('');
  const [evalResult, setEvalResult] = useState<any>(null);
  const [awardResult, setAwardResult] = useState<any>(null);
  const eventLogRef = useRef<HTMLDivElement>(null);

  // Check if there's an active tender
  useEffect(() => {
    fetch('/api/procurement-lifecycle')
      .then(r => r.json())
      .then(d => { if (d.tender) setTender(d.tender); });
  }, []);

  useEffect(() => {
    // Auto-scroll event log
    if (eventLogRef.current) {
      eventLogRef.current.scrollTop = eventLogRef.current.scrollHeight;
    }
  }, [tender?.events?.length]);

  async function apiCall(body: any) {
    setLoading(true);
    setCurrentAction(body.action);
    try {
      const res = await fetch('/api/procurement-lifecycle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.tender) setTender(data.tender);
      return data;
    } finally {
      setLoading(false);
      setCurrentAction('');
    }
  }

  // ─── Actions ─────────────────────────────────────────
  async function createTender() {
    await apiCall({
      action: 'create',
      title: 'AIIMS Delhi — Advanced Medical Imaging Equipment Procurement',
      ministry: 'MoHFW',
      estimatedValue: 120,
      category: 'GOODS',
    });
  }

  async function submitBid(bidder: typeof DEMO_BIDDERS[0]) {
    await apiCall({
      action: 'submit-bid',
      bidder: bidder.name,
      company: bidder.company,
      amount: bidder.amount,
    });
  }

  async function closeBidding() {
    await apiCall({ action: 'close-bidding' });
  }

  async function revealBids() {
    await apiCall({ action: 'reveal' });
  }

  async function evaluate() {
    const data = await apiCall({ action: 'evaluate' });
    setEvalResult(data);
  }

  async function awardTender() {
    const data = await apiCall({ action: 'award' });
    setAwardResult(data);
  }

  async function resetLifecycle() {
    await apiCall({ action: 'reset' });
    setTender(null);
    setEvalResult(null);
    setAwardResult(null);
  }

  // ─── Run Full Demo ───────────────────────────────────
  async function runFullDemo() {
    setEvalResult(null);
    setAwardResult(null);

    // Step 1: Create
    await apiCall({
      action: 'create',
      title: 'AIIMS Delhi — Advanced Medical Imaging Equipment Procurement',
      ministry: 'MoHFW',
      estimatedValue: 120,
      category: 'GOODS',
    });
    await delay(600);

    // Step 2: Submit bids
    for (const bidder of DEMO_BIDDERS) {
      await apiCall({
        action: 'submit-bid',
        bidder: bidder.name,
        company: bidder.company,
        amount: bidder.amount,
      });
      await delay(400);
    }

    // Step 3: Close bidding
    await apiCall({ action: 'close-bidding' });
    await delay(500);

    // Step 4: Reveal
    await apiCall({ action: 'reveal' });
    await delay(500);

    // Step 5: Evaluate
    const evalData = await apiCall({ action: 'evaluate' });
    setEvalResult(evalData);
    await delay(500);

    // Step 6: Award
    const awardData = await apiCall({ action: 'award' });
    setAwardResult(awardData);
  }

  const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

  const phaseIndex = PHASES.findIndex(p => p.key === tender?.phase);
  const currentPhaseIdx = tender ? Math.max(phaseIndex, 0) : -1;

  const bidsSubmitted = tender?.bids?.length || 0;
  const biddersPending = DEMO_BIDDERS.length - bidsSubmitted;

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 16px' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.08), rgba(34,197,94,0.08))',
        border: '1px solid rgba(99,102,241,0.25)',
        borderRadius: 20, padding: '28px 36px', marginBottom: 24,
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: -40, right: -40, width: 200, height: 200,
          background: 'radial-gradient(circle, rgba(34,197,94,0.1), transparent)',
          borderRadius: '50%',
        }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: '#e2e8f0', marginBottom: 4 }}>
              📦 Full Procurement Lifecycle
            </h1>
            <p style={{ color: '#94a3b8', fontSize: 13 }}>
              End-to-end flow: Create Tender → ZKP-Sealed Bids → Reveal → ML Evaluation → Award
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={runFullDemo}
              disabled={loading}
              style={{
                padding: '12px 28px', borderRadius: 12, border: 'none',
                background: loading ? '#374151' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                color: '#fff', fontWeight: 700, fontSize: 13,
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: loading ? 'none' : '0 4px 20px rgba(99,102,241,0.4)',
              }}
            >
              {loading ? '⏳ Running...' : '▶ Run Full Demo'}
            </button>
            {tender && (
              <button
                onClick={resetLifecycle}
                disabled={loading}
                style={{
                  padding: '12px 20px', borderRadius: 12, border: '1px solid rgba(239,68,68,0.3)',
                  background: 'rgba(239,68,68,0.1)', color: '#f87171',
                  fontWeight: 600, fontSize: 12, cursor: loading ? 'not-allowed' : 'pointer',
                }}
              >
                🔄 Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Phase Progress Bar */}
      <div style={{
        background: 'rgba(30,41,59,0.6)', border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 16, padding: '20px 24px', marginBottom: 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {PHASES.map((phase, i) => {
            const isActive = i === currentPhaseIdx;
            const isDone = i < currentPhaseIdx;
            const isPending = i > currentPhaseIdx;
            return (
              <div key={phase.key} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: '0 0 auto' }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 20,
                    background: isDone ? `${phase.color}30` : isActive ? `${phase.color}20` : 'rgba(255,255,255,0.04)',
                    border: `2px solid ${isDone ? phase.color : isActive ? phase.color : 'rgba(255,255,255,0.08)'}`,
                    boxShadow: isActive ? `0 0 16px ${phase.color}40` : 'none',
                    transition: 'all 0.5s',
                  }}>
                    {isDone ? '✅' : phase.icon}
                  </div>
                  <span style={{
                    fontSize: 10, fontWeight: 700, marginTop: 4,
                    color: isDone ? '#22c55e' : isActive ? phase.color : '#475569',
                    letterSpacing: '0.05em',
                  }}>
                    {phase.label}
                  </span>
                </div>
                {i < PHASES.length - 1 && (
                  <div style={{
                    flex: 1, height: 2, margin: '0 8px',
                    background: isDone ? '#22c55e50' : 'rgba(255,255,255,0.06)',
                    borderRadius: 1, marginBottom: 16,
                    transition: 'background 0.5s',
                  }} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Grid: Controls + Event Log */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 16 }}>
        {/* Left: Phase Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Phase 1: Create Tender */}
          {!tender && (
            <PhaseCard title="Phase 1 — Create Tender" icon="📝" color="#6366f1"
              description="Officer creates a new tender. Details are recorded on Hyperledger Fabric with 2-org endorsement.">
              <button onClick={createTender} disabled={loading} style={btnStyle('#6366f1', loading)}>
                {loading && currentAction === 'create' ? '⏳ Creating...' : '📝 Create Tender'}
              </button>
            </PhaseCard>
          )}

          {/* Phase 2: Submit Bids */}
          {tender && tender.phase === 'BIDDING_OPEN' && (
            <PhaseCard title="Phase 2 — Submit ZKP-Sealed Bids" icon="🔐" color="#8b5cf6"
              description={`Bidders submit encrypted bids using Pedersen commitments (C = g^v · h^r mod p). ${bidsSubmitted} of ${DEMO_BIDDERS.length} submitted.`}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {DEMO_BIDDERS.map((bidder, i) => {
                  const alreadySubmitted = i < bidsSubmitted;
                  return (
                    <div key={bidder.name} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 14px', borderRadius: 10,
                      background: alreadySubmitted ? 'rgba(34,197,94,0.08)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${alreadySubmitted ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.05)'}`,
                    }}>
                      <div>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>{bidder.company}</span>
                        <span style={{ fontSize: 11, color: '#64748b', marginLeft: 8 }}>{bidder.name}</span>
                      </div>
                      {alreadySubmitted ? (
                        <span style={{ fontSize: 11, color: '#22c55e', fontWeight: 600 }}>✅ Sealed</span>
                      ) : (
                        <button onClick={() => submitBid(bidder)} disabled={loading}
                          style={{ ...btnStyle('#8b5cf6', loading), padding: '6px 14px', fontSize: 11 }}>
                          🔐 Submit ₹{bidder.amount} Cr
                        </button>
                      )}
                    </div>
                  );
                })}
                {bidsSubmitted >= 2 && (
                  <button onClick={closeBidding} disabled={loading} style={btnStyle('#f59e0b', loading)}>
                    🔒 Close Bidding Phase
                  </button>
                )}
              </div>
            </PhaseCard>
          )}

          {/* Phase 3: Reveal */}
          {tender && tender.phase === 'REVEAL' && (
            <PhaseCard title="Phase 3 — Reveal Bids" icon="🔓" color="#f59e0b"
              description="Bidders reveal their bid amounts. Each commitment is verified: C = g^v · h^r mod p. If C matches, the bid is valid.">
              <button onClick={revealBids} disabled={loading} style={btnStyle('#f59e0b', loading)}>
                {loading ? '⏳ Revealing...' : '🔓 Reveal All Bids'}
              </button>
            </PhaseCard>
          )}

          {/* Phase 4: Evaluate */}
          {tender && tender.phase === 'EVALUATION' && !evalResult && (
            <PhaseCard title="Phase 4 — ML + AI Evaluation" icon="🤖" color="#ef4444"
              description="Random Forest model analyzes bid patterns for fraud. ZKP proofs are independently verified.">
              <button onClick={evaluate} disabled={loading} style={btnStyle('#ef4444', loading)}>
                {loading ? '⏳ Analyzing...' : '🤖 Run ML Evaluation'}
              </button>
            </PhaseCard>
          )}

          {/* Evaluation Results */}
          {evalResult && tender?.phase === 'EVALUATION' && (
            <PhaseCard title="Phase 4 — Evaluation Results" icon="📊" color="#ef4444" description="">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* ML Result */}
                <div style={{
                  padding: '12px 16px', borderRadius: 10,
                  background: evalResult.mlResult?.prediction === 'FRAUD'
                    ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)',
                  border: `1px solid ${evalResult.mlResult?.prediction === 'FRAUD'
                    ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)'}`,
                }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: evalResult.mlResult?.prediction === 'FRAUD' ? '#ef4444' : '#22c55e' }}>
                    ML Model: {evalResult.mlResult?.prediction} ({(evalResult.mlResult?.probability * 100).toFixed(1)}%)
                  </div>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                    Risk Level: {evalResult.riskLevel} • Source: <span style={{ color: '#a5b4fc', fontWeight: 600 }}>{evalResult.mlResult?.source || 'REAL_RANDOM_FOREST'}</span> • 100 trees
                  </div>
                </div>

                {/* ZKP Verification */}
                {evalResult.proofResults?.map((pr: any, i: number) => (
                  <div key={i} style={{
                    padding: '8px 12px', borderRadius: 8,
                    background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)',
                    fontSize: 12,
                  }}>
                    <span style={{ color: pr.zkpValid ? '#22c55e' : '#ef4444', fontWeight: 600 }}>
                      {pr.zkpValid ? '✅' : '❌'} {pr.bidder}
                    </span>
                    <span style={{ color: '#64748b', marginLeft: 8 }}>
                      ZKP Schnorr proof: {pr.zkpValid ? 'VALID' : 'INVALID'}
                    </span>
                  </div>
                ))}

                <button onClick={awardTender} disabled={loading} style={btnStyle('#22c55e', loading)}>
                  🏆 Award Tender to Lowest Valid Bidder
                </button>
              </div>
            </PhaseCard>
          )}

          {/* Phase 5: Award */}
          {tender?.phase === 'AWARDED' && (
            <PhaseCard title="Phase 5 — Tender Awarded" icon="🏆" color="#22c55e" description="">
              <div style={{
                padding: '20px', borderRadius: 14, textAlign: 'center',
                background: 'linear-gradient(135deg, rgba(34,197,94,0.12), rgba(34,197,94,0.05))',
                border: '1px solid rgba(34,197,94,0.3)',
              }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>🏆</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#22c55e' }}>
                  CONTRACT AWARDED
                </div>
                <div style={{ fontSize: 16, fontWeight: 600, color: '#e2e8f0', marginTop: 8 }}>
                  {tender.winner}
                </div>
                <div style={{ fontSize: 24, fontWeight: 800, color: '#f59e0b', marginTop: 4 }}>
                  ₹{tender.winnerAmount} Crore
                </div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 8 }}>
                  Savings: ₹{((tender.estimatedValue - (tender.winnerAmount || 0))).toFixed(1)} Cr
                  ({((tender.estimatedValue - (tender.winnerAmount || 0)) / tender.estimatedValue * 100).toFixed(1)}% below estimate)
                </div>
                <div style={{ fontSize: 10, color: '#475569', marginTop: 8, fontFamily: 'monospace' }}>
                  TX: {(awardResult?.blockchain?.txHash || awardResult?.blockchainTx || '').slice(0, 32)}...
                </div>
                {awardResult?.blockchain?.source && (
                  <div style={{ marginTop: 6 }}>
                    <span style={{
                      fontSize: 9, padding: '2px 8px', borderRadius: 6,
                      background: awardResult.blockchain.source === 'REAL_FABRIC_PEER' ? 'rgba(34,197,94,0.15)' : 'rgba(99,102,241,0.15)',
                      color: awardResult.blockchain.source === 'REAL_FABRIC_PEER' ? '#22c55e' : '#a5b4fc',
                      fontWeight: 600,
                    }}>
                      {awardResult.blockchain.source}
                    </span>
                  </div>
                )}
              </div>
            </PhaseCard>
          )}

          {/* Bid Comparison Table (after reveal) */}
          {tender && tender.bids.some(b => b.revealedAmount) && (
            <div style={{
              background: 'rgba(30,41,59,0.6)', border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 16, padding: 20,
            }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#e2e8f0', marginBottom: 12 }}>
                📊 Bid Comparison
              </h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                    <th style={{ textAlign: 'left', padding: '8px 4px', color: '#94a3b8', fontWeight: 600, fontSize: 11 }}>Company</th>
                    <th style={{ textAlign: 'center', padding: '8px 4px', color: '#94a3b8', fontWeight: 600, fontSize: 11 }}>Amount (₹ Cr)</th>
                    <th style={{ textAlign: 'center', padding: '8px 4px', color: '#94a3b8', fontWeight: 600, fontSize: 11 }}>Commitment Valid</th>
                    <th style={{ textAlign: 'center', padding: '8px 4px', color: '#94a3b8', fontWeight: 600, fontSize: 11 }}>ZKP Proof</th>
                    <th style={{ textAlign: 'center', padding: '8px 4px', color: '#94a3b8', fontWeight: 600, fontSize: 11 }}>Rank</th>
                  </tr>
                </thead>
                <tbody>
                  {[...tender.bids]
                    .filter(b => b.revealedAmount)
                    .sort((a, b) => (a.revealedAmount || 0) - (b.revealedAmount || 0))
                    .map((bid, i) => {
                      const isWinner = tender.winner === bid.company;
                      return (
                        <tr key={i} style={{
                          background: isWinner ? 'rgba(34,197,94,0.08)' : 'transparent',
                          borderBottom: '1px solid rgba(255,255,255,0.04)',
                        }}>
                          <td style={{ padding: '10px 4px', color: isWinner ? '#4ade80' : '#e2e8f0', fontWeight: isWinner ? 700 : 400 }}>
                            {isWinner ? '🏆 ' : ''}{bid.company}
                          </td>
                          <td style={{ textAlign: 'center', padding: '10px 4px', color: '#f59e0b', fontWeight: 700 }}>
                            ₹{bid.revealedAmount}
                          </td>
                          <td style={{ textAlign: 'center', padding: '10px 4px' }}>
                            <span style={{ color: bid.revealValid ? '#22c55e' : '#ef4444' }}>
                              {bid.revealValid ? '✅ Valid' : '❌ Invalid'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center', padding: '10px 4px' }}>
                            <span style={{ color: bid.zkpValid ? '#22c55e' : '#ef4444' }}>
                              {bid.zkpValid ? '✅' : '❌'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center', padding: '10px 4px', color: i === 0 ? '#22c55e' : '#94a3b8', fontWeight: 700 }}>
                            #{i + 1}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right: Event Log + Tender Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Tender Info */}
          {tender && (
            <div style={{
              background: 'rgba(30,41,59,0.6)', border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 16, padding: 16,
            }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0', marginBottom: 10 }}>📋 Active Tender</h3>
              <div style={{ fontSize: 12, color: '#94a3b8', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div><strong style={{ color: '#e2e8f0' }}>ID:</strong> <span style={{ fontFamily: 'monospace', fontSize: 11 }}>{tender.id}</span></div>
                <div><strong style={{ color: '#e2e8f0' }}>Title:</strong> {tender.title}</div>
                <div><strong style={{ color: '#e2e8f0' }}>Ministry:</strong> {tender.ministry}</div>
                <div><strong style={{ color: '#e2e8f0' }}>Estimate:</strong> <span style={{ color: '#f59e0b', fontWeight: 700 }}>₹{tender.estimatedValue} Cr</span></div>
                <div><strong style={{ color: '#e2e8f0' }}>Phase:</strong> <span style={{
                  color: PHASES.find(p => p.key === tender.phase)?.color || '#6366f1',
                  fontWeight: 700,
                }}>{tender.phase}</span></div>
                <div><strong style={{ color: '#e2e8f0' }}>Bids:</strong> {tender.bids.length}</div>
                {tender.blockchainTx && (
                  <div style={{ fontSize: 10, fontFamily: 'monospace', color: '#475569', marginTop: 4 }}>
                    TX: {tender.blockchainTx.slice(0, 24)}...
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Event Log */}
          <div style={{
            background: 'rgba(30,41,59,0.6)', border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 16, padding: 16, flex: 1,
          }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0', marginBottom: 10 }}>
              📜 Event Timeline
            </h3>
            <div ref={eventLogRef} style={{
              maxHeight: 420, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8,
            }}>
              {!tender?.events?.length ? (
                <div style={{ fontSize: 12, color: '#475569', textAlign: 'center', padding: 20 }}>
                  No events yet. Create a tender to begin.
                </div>
              ) : (
                tender.events.map((evt, i) => (
                  <div key={i} style={{
                    padding: '8px 10px', borderRadius: 8,
                    background: 'rgba(255,255,255,0.03)',
                    borderLeft: `3px solid ${
                      evt.phase === 'AWARDED' ? '#22c55e' :
                      evt.phase === 'EVALUATION' ? '#ef4444' :
                      evt.phase === 'REVEAL' ? '#f59e0b' :
                      evt.phase.includes('BID') ? '#8b5cf6' : '#6366f1'
                    }`,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#6366f1', letterSpacing: '0.05em' }}>
                        {evt.icon} {evt.phase}
                      </span>
                      <span style={{ fontSize: 9, color: '#475569', fontFamily: 'monospace' }}>
                        {new Date(evt.time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>
                    <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 2, lineHeight: 1.4 }}>{evt.detail}</p>
                    {evt.source && (
                      <span style={{
                        fontSize: 8, padding: '1px 6px', borderRadius: 4, marginTop: 3, display: 'inline-block',
                        background: evt.source.includes('REAL') || evt.source === 'SUPABASE'
                          ? 'rgba(34,197,94,0.12)' : 'rgba(99,102,241,0.12)',
                        color: evt.source.includes('REAL') || evt.source === 'SUPABASE'
                          ? '#4ade80' : '#a5b4fc',
                        fontWeight: 600, letterSpacing: '0.03em',
                      }}>
                        {evt.source}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Crypto Legend */}
          <div style={{
            background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.2)',
            borderRadius: 12, padding: 14,
          }}>
            <h4 style={{ fontSize: 12, fontWeight: 700, color: '#a78bfa', marginBottom: 8 }}>🔑 Cryptographic Primitives</h4>
            <div style={{ fontSize: 10, color: '#94a3b8', lineHeight: 1.6 }}>
              <div><strong style={{ color: '#e2e8f0' }}>Pedersen:</strong> C = g<sup>v</sup> · h<sup>r</sup> mod p (1024-bit safe prime)</div>
              <div><strong style={{ color: '#e2e8f0' }}>ZKP:</strong> Schnorr + Fiat-Shamir (proves knowledge of v,r)</div>
              <div><strong style={{ color: '#e2e8f0' }}>Reveal:</strong> Bidder opens (v, r) → verifier checks C</div>
              <div><strong style={{ color: '#e2e8f0' }}>ML:</strong> Random Forest (100 trees, 14 features, F1=99.5%)</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Reusable Components ───────────────────────────────

function PhaseCard({ title, icon, color, description, children }: {
  title: string; icon: string; color: string; description: string; children: React.ReactNode;
}) {
  return (
    <div style={{
      background: `linear-gradient(135deg, ${color}08, ${color}04)`,
      border: `1px solid ${color}30`,
      borderRadius: 16, padding: 20,
    }}>
      <h3 style={{ fontSize: 16, fontWeight: 700, color: '#e2e8f0', marginBottom: 4 }}>
        {icon} {title}
      </h3>
      {description && <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 14 }}>{description}</p>}
      {children}
    </div>
  );
}

function btnStyle(color: string, disabled: boolean): React.CSSProperties {
  return {
    padding: '10px 20px', borderRadius: 10, border: 'none',
    background: disabled ? '#374151' : `linear-gradient(135deg, ${color}, ${color}cc)`,
    color: '#fff', fontWeight: 700, fontSize: 13, width: '100%',
    cursor: disabled ? 'not-allowed' : 'pointer',
    boxShadow: disabled ? 'none' : `0 4px 15px ${color}30`,
    transition: 'all 0.2s',
  };
}
