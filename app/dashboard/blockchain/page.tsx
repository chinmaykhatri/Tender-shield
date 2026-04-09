'use client';
import { useState, useEffect, useCallback } from 'react';

interface Block {
  blockNumber: number;
  blockHash: string;
  previousHash: string;
  timestamp: string;
  txCount: number;
  dataHash: string;
  description?: string;
  transactions: Transaction[];
}

interface Transaction {
  txId: string;
  type: string;
  chaincode: string;
  function: string;
  args: string[];
  creator: { mspId: string; org: string };
  endorsers: string[];
  timestamp: string;
  status: string;
  rawEventType?: string;
  rawEventId?: string;
}

interface BlockchainData {
  dataIntegrity: {
    chainValid: boolean;
    totalBlocks: number;
    hashAlgorithm: string;
    dataSource: string;
    verificationMethod: string;
    lastVerified: string;
  };
  channel: {
    name: string;
    height: number;
    currentBlockHash: string;
    previousBlockHash: string;
  };
  blocks: Block[];
  stats: {
    totalBlocks: number;
    totalTransactions: number;
    chaincodeInvocations: number;
    frozenByAI: number;
    zkpBids: number;
    chainIntegrity: string;
  };
  architecture: {
    _note: string;
    designedOrganizations: { name: string; role: string; peers: number }[];
    designedConsensus: string;
    designedEndorsementPolicy: string;
  };
}

interface VerificationResult {
  verified: boolean;
  timestamp: string;
  verificationTimeMs: number;
  totalBlocks: number;
  totalAuditEvents: number;
  latestBlockHash: string;
  genesisHash: string;
  brokenAtBlock: number | null;
  hashAlgorithm: string;
  method: string;
  _howToVerify: string[];
}

export default function BlockchainExplorer() {
  const [data, setData] = useState<BlockchainData | null>(null);
  const [selectedBlock, setSelectedBlock] = useState<Block | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verification, setVerification] = useState<VerificationResult | null>(null);
  const [lastRefresh, setLastRefresh] = useState<string>('');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [showArchitecture, setShowArchitecture] = useState(false);
  const [blockVerification, setBlockVerification] = useState<{ blockNumber: number; valid: boolean; computed: string; expected: string } | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/blockchain', { signal: AbortSignal.timeout(15_000) });
      const d = await res.json();
      setData(d);
      setLastRefresh(new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' }));
      setError(null);
    } catch (e: any) {
      setError(e?.name === 'AbortError' ? 'Request timed out' : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Auto-refresh every 10 seconds when enabled
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchData, 10_000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchData]);

  // Live verification — hits the verify API
  async function runVerification() {
    setVerifying(true);
    setVerification(null);
    try {
      const res = await fetch('/api/blockchain/verify', { signal: AbortSignal.timeout(10_000) });
      const result = await res.json();
      setVerification(result);
    } catch {
      setVerification({ verified: false, timestamp: new Date().toISOString(), verificationTimeMs: 0, totalBlocks: 0, totalAuditEvents: 0, latestBlockHash: '', genesisHash: '', brokenAtBlock: null, hashAlgorithm: '', method: '', _howToVerify: [] });
    }
    setVerifying(false);
  }

  // Client-side block chain-link verification
  function verifyBlockClientSide(block: Block) {
    // Verify the hash chain link: does this block's previousHash match the prior block?
    const blocks = data?.blocks || [];
    // Blocks are newest-first, so prior block in chain is the one with blockNumber - 1
    const priorBlock = blocks.find((b: Block) => b.blockNumber === block.blockNumber - 1);
    const chainLinkValid = priorBlock
      ? block.previousHash === priorBlock.blockHash
      : block.blockNumber === 0; // Genesis block has no prior

    setBlockVerification({
      blockNumber: block.blockNumber,
      valid: chainLinkValid,
      computed: block.blockHash,
      expected: block.previousHash,
    });
  }

  const fnColors: Record<string, string> = {
    CreateTender: '#22c55e', PublishTender: '#3b82f6', FreezeTender: '#ef4444',
    SubmitBid: '#a855f7', RevealBid: '#f59e0b', EvaluateBids: '#06b6d4',
    AwardTender: '#10b981', GenesisBlock: '#6b7280', AnalyzeTender: '#f97316',
    LifecycleState: '#8b5cf6', FraudEvaluation: '#ef4444', NotifyCAG: '#dc2626',
    VerifyCommitment: '#14b8a6',
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 48, height: 48, border: '4px solid rgba(99,102,241,0.3)', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
        <p style={{ color: '#94a3b8' }}>Loading audit ledger...</p>
      </div>
    </div>
  );

  if (error || !data) return (
    <div style={{ padding: 40, textAlign: 'center' }}>
      <p style={{ color: '#ef4444', fontSize: 18, marginBottom: 12 }}>⚠️ {error || 'Failed to load'}</p>
      <button onClick={fetchData} style={{ padding: '8px 20px', borderRadius: 12, background: '#6366f1', color: '#fff', border: 'none', cursor: 'pointer' }}>Retry</button>
    </div>
  );

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1400, margin: '0 auto' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes pulse { 0%, 100% { opacity: 1 } 50% { opacity: 0.5 } }
        .block-card:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(0,0,0,0.3) !important; }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 28 }}>⛓️</span>
          <h1 style={{ fontSize: 28, fontWeight: 800, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>
            Audit Ledger Explorer
          </h1>
          <span style={{
            background: data.stats.chainIntegrity === 'VERIFIED' ? '#22c55e' : '#ef4444',
            color: '#fff', padding: '4px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700,
          }}>
            {data.stats.chainIntegrity === 'VERIFIED' ? '✅ Chain Intact' : '❌ Chain Broken'}
          </span>
        </div>
        <p style={{ color: '#94a3b8', fontSize: 13, margin: 0 }}>
          Real SHA-256 hash chain from <strong style={{ color: '#22c55e' }}>live Supabase audit_events</strong> • {data.stats.totalBlocks} blocks • Updated: {lastRefresh}
        </p>
      </div>

      {/* Action Bar */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
        <button onClick={runVerification} disabled={verifying}
          style={{
            padding: '10px 20px', borderRadius: 12, fontWeight: 700, fontSize: 13, cursor: 'pointer', border: 'none',
            background: verifying ? '#334155' : 'linear-gradient(135deg, #22c55e, #16a34a)', color: '#fff', display: 'flex', alignItems: 'center', gap: 8,
          }}>
          {verifying ? (<><div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 1s linear infinite' }} /> Verifying...</>) : '🔍 Verify Chain Now'}
        </button>
        <button onClick={fetchData}
          style={{ padding: '10px 20px', borderRadius: 12, fontWeight: 700, fontSize: 13, cursor: 'pointer', border: '1px solid rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.1)', color: '#a5b4fc' }}>
          🔄 Refresh
        </button>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#94a3b8', cursor: 'pointer' }}>
          <input type="checkbox" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)} style={{ accentColor: '#6366f1' }} />
          Auto-refresh (10s)
        </label>
        <button onClick={() => setShowArchitecture(!showArchitecture)}
          style={{ padding: '10px 20px', borderRadius: 12, fontWeight: 700, fontSize: 13, cursor: 'pointer', border: '1px solid rgba(139,92,246,0.3)', background: 'rgba(139,92,246,0.1)', color: '#c4b5fd', marginLeft: 'auto' }}>
          🏗️ {showArchitecture ? 'Hide' : 'Show'} Designed Architecture
        </button>
      </div>

      {/* Verification Result */}
      {verification && (
        <div style={{
          background: verification.verified ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
          border: `1px solid ${verification.verified ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
          borderRadius: 16, padding: 20, marginBottom: 24,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <span style={{ fontSize: 32 }}>{verification.verified ? '✅' : '❌'}</span>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: verification.verified ? '#22c55e' : '#ef4444' }}>
                {verification.verified ? 'Chain Integrity VERIFIED' : 'Chain Integrity BROKEN'}
              </div>
              <div style={{ fontSize: 12, color: '#94a3b8' }}>
                Verified {verification.totalBlocks} blocks in {verification.verificationTimeMs}ms at {new Date(verification.timestamp).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })} IST
              </div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            <div style={{ padding: 12, borderRadius: 8, background: 'rgba(15,23,42,0.5)' }}>
              <div style={{ fontSize: 10, color: '#64748b', marginBottom: 4 }}>Algorithm</div>
              <div style={{ fontSize: 12, color: '#e2e8f0', fontFamily: 'monospace' }}>{verification.hashAlgorithm}</div>
            </div>
            <div style={{ padding: 12, borderRadius: 8, background: 'rgba(15,23,42,0.5)' }}>
              <div style={{ fontSize: 10, color: '#64748b', marginBottom: 4 }}>Method</div>
              <div style={{ fontSize: 12, color: '#e2e8f0' }}>{verification.method}</div>
            </div>
            <div style={{ padding: 12, borderRadius: 8, background: 'rgba(15,23,42,0.5)' }}>
              <div style={{ fontSize: 10, color: '#64748b', marginBottom: 4 }}>Latest Block Hash</div>
              <div style={{ fontSize: 11, color: '#22c55e', fontFamily: 'monospace', wordBreak: 'break-all' }}>{verification.latestBlockHash?.slice(0, 32)}...</div>
            </div>
          </div>
          {verification._howToVerify && verification._howToVerify.length > 0 && (
            <div style={{ marginTop: 12, padding: 12, borderRadius: 8, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#a5b4fc', marginBottom: 6 }}>🔬 How to independently verify:</div>
              {verification._howToVerify.map((step, i) => (
                <div key={i} style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'monospace', lineHeight: 1.8 }}>{step}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Stats Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Block Height', value: data.channel.height, icon: '📦', color: '#6366f1' },
          { label: 'Audit Events', value: data.stats.totalTransactions, icon: '📝', color: '#3b82f6' },
          { label: 'Frozen by AI', value: data.stats.frozenByAI, icon: '🚨', color: '#ef4444' },
          { label: 'Sealed Bids', value: data.stats.zkpBids, icon: '🔐', color: '#a855f7' },
          { label: 'Chain Status', value: data.stats.chainIntegrity, icon: '🔗', color: data.stats.chainIntegrity === 'VERIFIED' ? '#22c55e' : '#ef4444' },
        ].map(stat => (
          <div key={stat.label} style={{ background: 'rgba(30,41,59,0.8)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 16, padding: '16px 14px', backdropFilter: 'blur(10px)' }}>
            <div style={{ fontSize: 20, marginBottom: 6 }}>{stat.icon}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: stat.color }}>{stat.value}</div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Channel Info — Real Data */}
      <div style={{ background: 'rgba(30,41,59,0.8)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 16, padding: 20, marginBottom: 24, backdropFilter: 'blur(10px)' }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, color: '#e2e8f0', margin: '0 0 12px' }}>🔗 Hash Chain State (Live)</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 12 }}>
          <div>
            <span style={{ color: '#64748b', fontSize: 11 }}>Current Block Hash</span>
            <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#22c55e', marginTop: 4, wordBreak: 'break-all' }}>{data.channel.currentBlockHash}</div>
          </div>
          <div>
            <span style={{ color: '#64748b', fontSize: 11 }}>Previous Block Hash</span>
            <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#f59e0b', marginTop: 4, wordBreak: 'break-all' }}>{data.channel.previousBlockHash}</div>
          </div>
        </div>
        <div style={{ marginTop: 10, padding: '6px 12px', background: 'rgba(34,197,94,0.08)', borderRadius: 8, fontSize: 11, color: '#94a3b8' }}>
          <strong style={{ color: '#22c55e' }}>Data source:</strong> {data.dataIntegrity.dataSource} • <strong>{data.dataIntegrity.hashAlgorithm}</strong>
        </div>
      </div>

      {/* Architecture Section (toggled) */}
      {showArchitecture && (
        <div style={{ background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 16, padding: 20, marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 18 }}>🏗️</span>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#c4b5fd', margin: 0 }}>Designed Fabric Architecture</h2>
            <span style={{ background: 'rgba(139,92,246,0.2)', color: '#a78bfa', padding: '2px 10px', borderRadius: 12, fontSize: 10, fontWeight: 600 }}>DESIGN SPEC</span>
          </div>
          <p style={{ fontSize: 12, color: '#94a3b8', margin: '0 0 16px', lineHeight: 1.6 }}>
            {data.architecture._note}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            {data.architecture.designedOrganizations.map(org => (
              <div key={org.name} style={{ padding: 12, borderRadius: 10, background: 'rgba(15,23,42,0.5)', border: '1px solid rgba(139,92,246,0.15)' }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#e2e8f0' }}>{org.name}</div>
                <div style={{ fontSize: 11, color: '#a78bfa', marginTop: 4 }}>{org.role}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 12, fontSize: 12, color: '#94a3b8' }}>
            <strong>Consensus:</strong> {data.architecture.designedConsensus} • <strong>Endorsement:</strong> <code style={{ color: '#a78bfa' }}>{data.architecture.designedEndorsementPolicy}</code>
          </div>
        </div>
      )}

      {/* Block List */}
      <div style={{ background: 'rgba(30,41,59,0.8)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 16, padding: 20, backdropFilter: 'blur(10px)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#e2e8f0', margin: 0 }}>📦 Blocks ({data.blocks.length})</h2>
          <span style={{ fontSize: 11, color: '#64748b' }}>Click a block to expand transaction details</span>
        </div>
        <div style={{ display: 'grid', gap: 8 }}>
          {data.blocks.map(block => (
            <div
              key={block.blockNumber}
              className="block-card"
              onClick={() => setSelectedBlock(selectedBlock?.blockNumber === block.blockNumber ? null : block)}
              style={{
                padding: 14, borderRadius: 12,
                background: selectedBlock?.blockNumber === block.blockNumber ? 'rgba(99,102,241,0.15)' : 'rgba(15,23,42,0.5)',
                border: `1px solid ${selectedBlock?.blockNumber === block.blockNumber ? 'rgba(99,102,241,0.5)' : 'rgba(51,65,85,0.5)'}`,
                cursor: 'pointer', transition: 'all 0.2s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14, color: '#fff', flexShrink: 0 }}>
                  #{block.blockNumber}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    {block.transactions.map(tx => (
                      <span key={tx.txId} style={{
                        background: `${fnColors[tx.function] || '#6b7280'}22`,
                        color: fnColors[tx.function] || '#6b7280',
                        padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                        border: `1px solid ${fnColors[tx.function] || '#6b7280'}44`,
                      }}>
                        {tx.function}({tx.args[0] ? tx.args[0].slice(0, 22) : ''})
                      </span>
                    ))}
                  </div>
                  <div style={{ fontSize: 10, color: '#64748b', marginTop: 4, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    <span>🕐 {new Date(block.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</span>
                    <span style={{ fontFamily: 'monospace' }}>Hash: {block.blockHash.slice(0, 16)}...</span>
                  </div>
                </div>
              </div>

              {/* Expanded Details */}
              {selectedBlock?.blockNumber === block.blockNumber && (
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(99,102,241,0.2)' }}>
                  {block.transactions.map(tx => (
                    <div key={tx.txId} style={{ padding: 12, borderRadius: 8, background: 'rgba(15,23,42,0.8)', marginBottom: 6 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: '3px 14px', fontSize: 11 }}>
                        <span style={{ color: '#64748b' }}>TX Hash</span>
                        <span style={{ fontFamily: 'monospace', color: '#a5b4fc', wordBreak: 'break-all' }}>{tx.txId}</span>
                        <span style={{ color: '#64748b' }}>Function</span>
                        <span style={{ color: '#22c55e', fontWeight: 600 }}>{tx.chaincode}::{tx.function}</span>
                        <span style={{ color: '#64748b' }}>Actor</span>
                        <span style={{ color: '#f59e0b' }}>{tx.creator.org} ({tx.creator.mspId})</span>
                        <span style={{ color: '#64748b' }}>Data Hash</span>
                        <span style={{ fontFamily: 'monospace', color: '#94a3b8', wordBreak: 'break-all' }}>{block.dataHash}</span>
                        <span style={{ color: '#64748b' }}>Status</span>
                        <span style={{ color: tx.status === 'VALID' ? '#22c55e' : '#ef4444', fontWeight: 700 }}>{tx.status}</span>
                      </div>
                    </div>
                  ))}
                  <div style={{ fontSize: 10, color: '#64748b', marginTop: 6 }}>
                    <span>Previous Hash: </span>
                    <span style={{ fontFamily: 'monospace', color: '#f59e0b', wordBreak: 'break-all' }}>{block.previousHash}</span>
                  </div>
                  {/* Client-side chain link verification */}
                  <div style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => verifyBlockClientSide(block)}
                      style={{
                        padding: '6px 14px', borderRadius: 8, fontSize: 11, fontWeight: 600,
                        background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)',
                        color: '#4ade80', cursor: 'pointer',
                      }}
                    >
                      🔍 Verify Chain Link
                    </button>
                    {blockVerification?.blockNumber === block.blockNumber && (
                      <span style={{
                        fontSize: 11, padding: '6px 12px', borderRadius: 8,
                        background: blockVerification.valid ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
                        color: blockVerification.valid ? '#4ade80' : '#ef4444',
                        border: `1px solid ${blockVerification.valid ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
                      }}>
                        {blockVerification.valid ? '✅ Chain link valid — previousHash matches prior block' : '❌ Chain link BROKEN'}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
