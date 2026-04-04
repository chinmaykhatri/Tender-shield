'use client';
import { useState, useEffect } from 'react';

interface Block {
  blockNumber: number;
  blockHash: string;
  previousHash: string;
  timestamp: string;
  txCount: number;
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
}

interface Peer {
  name: string;
  mspId: string;
  role: string;
  status: string;
  ledgerHeight: number;
  chaincodes: string[];
  stateDb: string;
}

interface NetworkData {
  network: { name: string; channel: string; chaincode: { name: string; version: string; language: string; functions: number; endorsementPolicy: string }; consensus: string; stateDb: string };
  channel: { name: string; height: number; currentBlockHash: string; previousBlockHash: string };
  peers: Peer[];
  orderers: { name: string; mspId: string; type: string; status: string }[];
  organizations: { name: string; mspId: string; domain: string; role: string; peers: number }[];
  blocks: Block[];
  stats: { totalBlocks: number; totalTransactions: number; chaincodeInvocations: number; frozenByAI: number; zkpBids: number; endorsementPolicyViolations: number };
}

export default function BlockchainExplorer() {
  const [data, setData] = useState<NetworkData | null>(null);
  const [selectedBlock, setSelectedBlock] = useState<Block | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/blockchain')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 48, height: 48, border: '4px solid rgba(99,102,241,0.3)', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
        <p style={{ color: '#94a3b8' }}>Connecting to Fabric Network...</p>
      </div>
    </div>
  );

  if (!data) return <div style={{ padding: 40, color: '#ef4444' }}>Failed to connect to blockchain network</div>;

  const fnColors: Record<string, string> = {
    CreateTender: '#22c55e', PublishTender: '#3b82f6', FreezeTender: '#ef4444',
    SubmitBid: '#a855f7', RevealBid: '#f59e0b', EvaluateBids: '#06b6d4',
    AwardTender: '#10b981', JoinChain: '#6b7280',
  };

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1400, margin: '0 auto' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes pulse { 0%, 100% { opacity: 1 } 50% { opacity: 0.5 } }
        .block-card:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(0,0,0,0.3) !important; }
        .tx-row:hover { background: rgba(99,102,241,0.1) !important; }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <span style={{ fontSize: 28 }}>⛓️</span>
          <h1 style={{ fontSize: 28, fontWeight: 800, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Blockchain Explorer
          </h1>
          <span style={{ background: '#22c55e', color: '#fff', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, animation: 'pulse 2s infinite' }}>
            🟢 LIVE
          </span>
        </div>
        <p style={{ color: '#94a3b8', fontSize: 14 }}>
          Hyperledger Fabric v2.5 • Channel: <strong>{data.channel.name}</strong> • Consensus: {data.network.consensus} • State DB: {data.network.stateDb}
        </p>
      </div>

      {/* Stats Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 32 }}>
        {[
          { label: 'Block Height', value: data.channel.height, icon: '📦', color: '#6366f1' },
          { label: 'Transactions', value: data.stats.totalTransactions, icon: '📝', color: '#3b82f6' },
          { label: 'Chaincode Calls', value: data.stats.chaincodeInvocations, icon: '⚡', color: '#22c55e' },
          { label: 'Frozen by AI', value: data.stats.frozenByAI, icon: '🚨', color: '#ef4444' },
          { label: 'Sealed Bids', value: data.stats.zkpBids, icon: '🔐', color: '#a855f7' },
          { label: 'Policy Violations', value: data.stats.endorsementPolicyViolations, icon: '✅', color: '#10b981' },
        ].map(stat => (
          <div key={stat.label} style={{ background: 'rgba(30,41,59,0.8)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 16, padding: '20px 16px', backdropFilter: 'blur(10px)' }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>{stat.icon}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: stat.color }}>{stat.value}</div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Network Topology */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32 }}>
        {/* Peers */}
        <div style={{ background: 'rgba(30,41,59,0.8)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 16, padding: 24, backdropFilter: 'blur(10px)' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, color: '#e2e8f0' }}>🖥️ Peer Nodes</h2>
          {data.peers.map(peer => (
            <div key={peer.name} style={{ padding: 12, borderRadius: 12, background: 'rgba(15,23,42,0.5)', marginBottom: 8, border: '1px solid rgba(34,197,94,0.3)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: '#e2e8f0' }}>{peer.name}</div>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>{peer.mspId} • {peer.role}</div>
                </div>
                <span style={{ background: peer.status === 'RUNNING' ? '#22c55e' : '#f59e0b', color: '#fff', padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
                  {peer.status}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 11, color: '#64748b' }}>
                <span>Height: {peer.ledgerHeight}</span>
                <span>CC: {peer.chaincodes[0]}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Organizations */}
        <div style={{ background: 'rgba(30,41,59,0.8)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 16, padding: 24, backdropFilter: 'blur(10px)' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, color: '#e2e8f0' }}>🏛️ Organizations</h2>
          {data.organizations.map(org => (
            <div key={org.name} style={{ padding: 12, borderRadius: 12, background: 'rgba(15,23,42,0.5)', marginBottom: 8, border: '1px solid rgba(99,102,241,0.2)' }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#e2e8f0' }}>{org.name}</div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{org.mspId} • {org.domain}</div>
              <div style={{ fontSize: 11, color: '#6366f1', marginTop: 4 }}>{org.role}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Channel Info */}
      <div style={{ background: 'rgba(30,41,59,0.8)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 16, padding: 24, marginBottom: 32, backdropFilter: 'blur(10px)' }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, color: '#e2e8f0' }}>📋 Channel: {data.channel.name}</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          <div><span style={{ color: '#64748b', fontSize: 12 }}>Current Block Hash</span><div style={{ fontFamily: 'monospace', fontSize: 12, color: '#22c55e', marginTop: 4, wordBreak: 'break-all' }}>{data.channel.currentBlockHash}</div></div>
          <div><span style={{ color: '#64748b', fontSize: 12 }}>Previous Block Hash</span><div style={{ fontFamily: 'monospace', fontSize: 12, color: '#f59e0b', marginTop: 4, wordBreak: 'break-all' }}>{data.channel.previousBlockHash}</div></div>
        </div>
        <div style={{ marginTop: 12, padding: '8px 16px', background: 'rgba(99,102,241,0.1)', borderRadius: 8, fontSize: 12, color: '#a5b4fc' }}>
          <strong>Endorsement Policy:</strong> {data.network.chaincode.endorsementPolicy}
          <br />
          <strong>Chaincode:</strong> {data.network.chaincode.name} v{data.network.chaincode.version} ({data.network.chaincode.language}) — {data.network.chaincode.functions} functions
        </div>
      </div>

      {/* Block List */}
      <div style={{ background: 'rgba(30,41,59,0.8)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 16, padding: 24, backdropFilter: 'blur(10px)' }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, color: '#e2e8f0' }}>📦 Blocks</h2>
        <div style={{ display: 'grid', gap: 8 }}>
          {data.blocks.map(block => (
            <div
              key={block.blockNumber}
              className="block-card"
              onClick={() => setSelectedBlock(selectedBlock?.blockNumber === block.blockNumber ? null : block)}
              style={{
                padding: 16, borderRadius: 12,
                background: selectedBlock?.blockNumber === block.blockNumber ? 'rgba(99,102,241,0.15)' : 'rgba(15,23,42,0.5)',
                border: `1px solid ${selectedBlock?.blockNumber === block.blockNumber ? 'rgba(99,102,241,0.5)' : 'rgba(51,65,85,0.5)'}`,
                cursor: 'pointer', transition: 'all 0.2s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 16, color: '#fff', flexShrink: 0 }}>
                  #{block.blockNumber}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    {block.transactions.map(tx => (
                      <span key={tx.txId} style={{ background: `${fnColors[tx.function] || '#6b7280'}22`, color: fnColors[tx.function] || '#6b7280', padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, border: `1px solid ${fnColors[tx.function] || '#6b7280'}44` }}>
                        {tx.function}({tx.args[0] ? tx.args[0].slice(0, 25) : ''})
                      </span>
                    ))}
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 4, display: 'flex', gap: 16 }}>
                    <span>🕐 {new Date(block.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</span>
                    <span>TX: {block.txCount}</span>
                    <span style={{ fontFamily: 'monospace' }}>Hash: {block.blockHash.slice(0, 16)}...</span>
                  </div>
                </div>
              </div>

              {/* Expanded Transaction Details */}
              {selectedBlock?.blockNumber === block.blockNumber && (
                <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(99,102,241,0.2)' }}>
                  {block.transactions.map(tx => (
                    <div key={tx.txId} className="tx-row" style={{ padding: 12, borderRadius: 8, background: 'rgba(15,23,42,0.8)', marginBottom: 8 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '4px 16px', fontSize: 12 }}>
                        <span style={{ color: '#64748b' }}>TX ID</span>
                        <span style={{ fontFamily: 'monospace', color: '#a5b4fc', wordBreak: 'break-all' }}>{tx.txId}</span>
                        <span style={{ color: '#64748b' }}>Type</span>
                        <span style={{ color: '#e2e8f0' }}>{tx.type}</span>
                        <span style={{ color: '#64748b' }}>Chaincode</span>
                        <span style={{ color: '#22c55e' }}>{tx.chaincode}::{tx.function}</span>
                        <span style={{ color: '#64748b' }}>Creator</span>
                        <span style={{ color: '#f59e0b' }}>{tx.creator.mspId} ({tx.creator.org})</span>
                        <span style={{ color: '#64748b' }}>Endorsers</span>
                        <span style={{ color: '#a855f7' }}>{tx.endorsers.join(', ')}</span>
                        <span style={{ color: '#64748b' }}>Status</span>
                        <span style={{ color: tx.status === 'VALID' ? '#22c55e' : '#ef4444', fontWeight: 700 }}>{tx.status}</span>
                      </div>
                    </div>
                  ))}
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 8 }}>
                    <span>Previous Hash: </span>
                    <span style={{ fontFamily: 'monospace', color: '#f59e0b' }}>{block.previousHash.slice(0, 32)}...</span>
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
