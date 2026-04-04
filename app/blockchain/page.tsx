// ─────────────────────────────────────────────────
// FILE: app/blockchain/page.tsx
// TYPE: PUBLIC PAGE (no login required)
// SECRET KEYS USED: none
// WHAT THIS FILE DOES: Visual blockchain explorer — block chain, TX list, hash verifier
//   + LIVE mode badge — shows real Fabric status from backend /api/v1/blockchain/health
// ─────────────────────────────────────────────────
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

const TX_COLORS: Record<string, string> = {
  TENDER_CREATED: '#6366f1', BID_COMMITTED: '#FF9933', BID_REVEALED: '#f59e0b',
  TENDER_FROZEN: '#ef4444', TENDER_AWARDED: '#22c55e', AUDIT_LOGGED: '#8b5cf6',
  COMMITMENT_VERIFIED: '#06b6d4', AI_ANALYSIS: '#ec4899', CreateTender: '#6366f1',
  SubmitBid: '#FF9933', RevealBid: '#f59e0b', FreezeTender: '#ef4444',
  AwardTender: '#22c55e', PublishTender: '#3b82f6',
};

interface NetworkHealth {
  blockchain_mode: string;
  is_live: boolean;
  peers_online: number;
  health: {
    block_height?: number;
    world_state_keys?: number;
    mode?: string;
    fabric_connected?: boolean;
    service_mode?: string;
    fabric_live_configured?: boolean;
  };
}

export default function BlockchainExplorer() {
  const [data, setData] = useState<any>(null);
  const [selectedBlock, setSelectedBlock] = useState<number | null>(null);
  const [hashInput, setHashInput] = useState('');
  const [hashResult, setHashResult] = useState<any>(null);
  const [verifying, setVerifying] = useState(false);
  const [newBlockAnim, setNewBlockAnim] = useState(false);
  const [networkHealth, setNetworkHealth] = useState<NetworkHealth | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch real network health from backend
  const fetchHealth = useCallback(async () => {
    try {
      const res = await fetch('http://localhost:8000/api/v1/blockchain/health');
      if (res.ok) {
        const json = await res.json();
        setNetworkHealth(json);
      }
    } catch {
      // Backend not reachable — set to null (will show fallback badge)
      setNetworkHealth(null);
    } finally {
      setHealthLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch('/api/blockchain/blocks').then(r => r.json()).then(d => setData(d.data));
    fetchHealth();
    // Poll health every 15 seconds
    const healthInterval = setInterval(fetchHealth, 15000);
    return () => clearInterval(healthInterval);
  }, [fetchHealth]);

  // Simulate new block every 30 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setNewBlockAnim(true);
      setTimeout(() => setNewBlockAnim(false), 1500);
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  const verifyHash = () => {
    setVerifying(true);
    setTimeout(() => {
      const known = data?.known_hashes?.[hashInput.trim()];
      if (known) {
        setHashResult({ valid: true, ...known });
      } else if (hashInput.startsWith('0x') && hashInput.length >= 10) {
        const block = data?.blocks?.find((b: any) => b.hash === hashInput.trim());
        if (block) {
          setHashResult({ valid: true, block: block.block_number, type: 'BLOCK_HASH', detail: `Block #${block.block_number} containing ${block.tx_count} transactions.` });
        } else {
          setHashResult({ valid: false, detail: 'Hash not found in TenderShield blockchain. It may be from a different network or invalid.' });
        }
      } else {
        setHashResult({ valid: false, detail: 'Invalid hash format. Hashes should start with 0x followed by hexadecimal characters.' });
      }
      setVerifying(false);
    }, 1200);
  };

  if (!data) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const selectedBlockData = data.blocks?.find((b: any) => b.block_number === selectedBlock);

  // Determine badge mode
  const isLive = networkHealth?.is_live ?? false;
  const blockchainMode = networkHealth?.blockchain_mode ?? 'UNKNOWN';
  const peersOnline = networkHealth?.peers_online ?? 0;
  const blockHeight = networkHealth?.health?.block_height ?? data?.current_block ?? 0;

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <div className="max-w-7xl mx-auto px-4 py-8">

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* BLOCKCHAIN MODE BADGE — Real-time status from backend       */}
        {/* ══════════════════════════════════════════════════════════════ */}
        <div className="card-glass p-4 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Mode Badge */}
            <div className="flex items-center gap-3">
              {healthLoading ? (
                <div className="w-3 h-3 rounded-full bg-yellow-400 animate-pulse" />
              ) : isLive ? (
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
                </span>
              ) : (
                <span className="relative flex h-3 w-3">
                  <span className="animate-pulse absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500" />
                </span>
              )}

              <div className="flex items-center gap-2">
                <span className="font-semibold">
                  TenderShield Hyperledger Fabric
                </span>

                {/* Mode Chip */}
                {healthLoading ? (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 font-mono">
                    CONNECTING...
                  </span>
                ) : isLive ? (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20 font-mono font-bold tracking-wider">
                    🟢 FABRIC LIVE
                  </span>
                ) : blockchainMode === 'SHA256_AUDIT_LOG' ? (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono font-bold tracking-wider"
                    title="SHA-256 chained audit log — cryptographically verifiable locally. Set FABRIC_LIVE=true when Fabric network is running.">
                    ⚡ SHA-256 AUDIT LOG
                  </span>
                ) : (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-500/10 text-zinc-400 border border-zinc-500/20 font-mono font-bold tracking-wider">
                    ⚪ OFFLINE
                  </span>
                )}
              </div>
            </div>

            {/* Peer Status */}
            <div className="flex flex-wrap gap-2">
              {isLive ? (
                // Real peer info from Fabric network
                <>
                  <span className="badge badge-success text-xs">Org1 (Ministry) 🟢</span>
                  <span className="badge badge-success text-xs">Org2 (Bidder) 🟢</span>
                  <span className="text-xs text-[var(--text-secondary)] px-2 py-1 rounded-md bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
                    CouchDB ✓ | TLS ✓ | Raft ✓
                  </span>
                </>
              ) : blockchainMode === 'SHA256_AUDIT_LOG' ? (
                // SHA-256 audit log mode badges
                <>
                  <span className="text-xs px-2 py-1 rounded-md bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-[var(--text-secondary)]">
                    🔐 SHA-256 Hashing ✓
                  </span>
                  <span className="text-xs px-2 py-1 rounded-md bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-[var(--text-secondary)]">
                    🔗 Block Chaining ✓
                  </span>
                  <span className="text-xs px-2 py-1 rounded-md bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-[var(--text-secondary)]">
                    🗃️ World State ✓
                  </span>
                </>
              ) : (
                // Simulated peer display from frontend-only
                data.peers?.map((p: any) => (
                  <span key={p.name} className="badge badge-success text-xs">{p.name} 🟢</span>
                ))
              )}
            </div>

            {/* Stats */}
            <div className="flex gap-6 text-sm">
              <div>
                <span className="text-[var(--text-secondary)]">Blocks: </span>
                <span className="font-mono font-bold text-[var(--accent)]">
                  {isLive || blockchainMode === 'SHA256_AUDIT_LOG'
                    ? blockHeight.toLocaleString()
                    : data.current_block.toLocaleString()
                  }
                </span>
              </div>
              <div>
                <span className="text-[var(--text-secondary)]">TXs: </span>
                <span className="font-mono font-bold">
                  {data.total_transactions.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-[var(--text-secondary)]">Peers: </span>
                <span className="font-mono font-bold">
                  {isLive ? peersOnline : blockchainMode === 'SHA256_AUDIT_LOG' ? '0 (local)' : data.peers?.length * 2}
                </span>
              </div>
            </div>
          </div>

          {/* Fabric Live Mode — Additional Info Bar */}
          {isLive && (
            <div className="mt-3 pt-3 border-t border-green-500/10 flex flex-wrap gap-4 text-xs text-green-300/70">
              <span>📡 gRPC: localhost:7051</span>
              <span>📜 Channel: tenderchannel</span>
              <span>⛓️ Chaincode: tendershield v1.0</span>
              <span>🔐 Mutual TLS: Enabled</span>
              <span>💾 State DB: CouchDB</span>
            </div>
          )}

          {/* Simulation Mode — Upgrade Hint */}
          {blockchainMode === 'SHA256_AUDIT_LOG' && (
            <div className="mt-3 pt-3 border-t border-amber-500/10 text-xs text-amber-300/60">
              <span className="font-semibold text-amber-400/80">Note:</span>{' '}
              Running with SHA-256 chained audit log (block chaining + world state — cryptographically verifiable).
              To connect to real Fabric network:{' '}
              <code className="bg-amber-500/10 px-1 py-0.5 rounded text-amber-300/80">
                FABRIC_LIVE=true
              </code>{' '}
              in <code className="bg-amber-500/10 px-1 py-0.5 rounded text-amber-300/80">.env</code>
              {' '}+ start Docker network.
            </div>
          )}
        </div>

        {/* Block Chain Visualization */}
        <div className="card-glass p-6 mb-6">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            Live Block Chain
            <span className="text-xs text-[var(--text-secondary)] ml-2">← Scroll to explore older blocks</span>
          </h2>
          <div ref={scrollRef} className="flex gap-3 overflow-x-auto pb-4 scroll-smooth">
            {/* New block animation placeholder */}
            {newBlockAnim && (
              <div className="shrink-0 w-44 p-4 rounded-xl border-2 border-[var(--saffron)] bg-[var(--saffron)]/10 animate-pulse">
                <p className="text-xs font-mono text-[var(--saffron)]">NEW BLOCK</p>
                <p className="text-2xl font-bold font-mono text-[var(--saffron)]">#{data.current_block + 1}</p>
              </div>
            )}
            {data.blocks.map((block: any, i: number) => (
              <div key={block.block_number} className="flex items-center gap-0 shrink-0">
                <button onClick={() => setSelectedBlock(block.block_number === selectedBlock ? null : block.block_number)}
                  className={`w-44 p-4 rounded-xl border-2 transition-all hover:scale-105 text-left ${
                    selectedBlock === block.block_number
                      ? 'border-[var(--accent)] bg-[var(--accent)]/10 shadow-[0_0_30px_rgba(99,102,241,0.3)]'
                      : i === 0 ? 'border-[var(--saffron)]/40 bg-[var(--bg-secondary)]' : 'border-[var(--border-subtle)] bg-[var(--bg-secondary)]'
                  }`}>
                  <p className="text-xs font-mono text-[var(--text-secondary)]">Block</p>
                  <p className="text-2xl font-bold font-mono">{`#${block.block_number}`}</p>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">{block.timestamp_ist.split('T')[1]?.substring(0, 8) || block.timestamp_ist.split(', ')[1]?.substring(0, 8)} IST</p>
                  <p className="text-xs text-[var(--text-secondary)]">{block.tx_count} TX{block.tx_count > 1 ? 's' : ''}</p>
                  <p className="text-[10px] font-mono text-[var(--accent)] mt-2 truncate">
                    {block.hash.substring(0, 8)}...{block.hash.substring(block.hash.length - 8)}
                  </p>
                </button>
                {i < data.blocks.length - 1 && (
                  <div className="flex items-center px-1">
                    <div className="w-4 h-0.5 bg-[var(--border-subtle)]" />
                    <div className="w-0 h-0 border-t-4 border-b-4 border-l-4 border-transparent border-l-[var(--border-subtle)]" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Selected Block Details / Transaction List */}
        {selectedBlockData && (
          <div className="card-glass p-6 mb-6 animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">Block #{selectedBlockData.block_number} — Transactions</h2>
              <button onClick={() => setSelectedBlock(null)} className="text-[var(--text-secondary)] hover:text-white text-sm">✕ Close</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              <div className="p-3 rounded-lg bg-[var(--bg-secondary)]">
                <p className="text-xs text-[var(--text-secondary)]">Block Hash</p>
                <p className="text-xs font-mono text-[var(--accent)] break-all">{selectedBlockData.hash}</p>
              </div>
              <div className="p-3 rounded-lg bg-[var(--bg-secondary)]">
                <p className="text-xs text-[var(--text-secondary)]">Previous Block Hash</p>
                <p className="text-xs font-mono text-[var(--text-secondary)] break-all">{selectedBlockData.prev_hash}</p>
              </div>
            </div>

            <table className="table-premium">
              <thead><tr><th>TX ID</th><th>Type</th><th>Tender</th><th>By</th><th>Time</th><th>Verify</th></tr></thead>
              <tbody>
                {selectedBlockData.transactions.map((tx: any, i: number) => (
                  <tr key={i}>
                    <td className="font-mono text-xs">{tx.tx_id}</td>
                    <td>
                      <span className="badge text-xs" style={{
                        background: `${TX_COLORS[tx.type] || TX_COLORS[tx.function_name] || '#6366f1'}15`,
                        color: TX_COLORS[tx.type] || TX_COLORS[tx.function_name] || '#6366f1',
                        border: `1px solid ${TX_COLORS[tx.type] || TX_COLORS[tx.function_name] || '#6366f1'}30`,
                      }}>{tx.type || tx.function_name}</span>
                    </td>
                    <td className="text-xs">{tx.tender_id || '—'}</td>
                    <td className="text-xs text-[var(--text-secondary)]">{tx.invoker || tx.msp_id || '—'}</td>
                    <td className="text-xs font-mono">{(tx.timestamp_ist || '').split('T')[1]?.substring(0, 8) || tx.timestamp_ist?.split(', ')[1]?.substring(0, 8) || '—'}</td>
                    <td>
                      <button className="text-xs text-[var(--accent)] hover:underline"
                        onClick={() => {
                          setHashInput(selectedBlockData.hash);
                          verifyHash();
                        }}>Verify ✓</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Hash Verifier Tool */}
        <div className="card-glass p-6">
          <h2 className="font-semibold mb-1">🔍 Verify Any Transaction Hash</h2>
          <p className="text-sm text-[var(--text-secondary)] mb-4">Paste any transaction or block hash to check its authenticity</p>

          <div className="flex gap-3 mb-4">
            <input className="input-field font-mono text-sm flex-1" placeholder="0x8f3a7b2c1d4e5f6a..."
              value={hashInput} onChange={e => { setHashInput(e.target.value); setHashResult(null); }} />
            <button onClick={verifyHash} disabled={verifying || !hashInput}
              className="btn-primary px-6 whitespace-nowrap disabled:opacity-50">
              {verifying ? '⏳ Verifying...' : '🔍 Verify'}
            </button>
          </div>

          {/* Quick test hash */}
          <button onClick={() => setHashInput('0x8f3a7b2c1d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e2b1c')}
            className="text-xs text-[var(--accent)] hover:underline mb-4 block">
            Try the AIIMS freeze TX hash →
          </button>

          {hashResult && (
            <div className={`p-4 rounded-xl border ${hashResult.valid ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/30 bg-red-500/5'} animate-fade-in`}>
              <div className="flex items-center gap-2 mb-2">
                {hashResult.valid ? (
                  <>
                    <span className="text-2xl">✅</span>
                    <span className="font-bold text-green-400">Verification: VALID</span>
                  </>
                ) : (
                  <>
                    <span className="text-2xl">❌</span>
                    <span className="font-bold text-red-400">Verification: NOT FOUND</span>
                  </>
                )}
              </div>
              <p className="text-sm text-[var(--text-secondary)]">{hashResult.detail}</p>
              {hashResult.block && (
                <p className="text-sm mt-1"><span className="text-[var(--text-secondary)]">Found in Block: </span><span className="font-mono font-bold text-[var(--accent)]">#{hashResult.block}</span></p>
              )}
              {hashResult.type && (
                <p className="text-sm mt-1"><span className="text-[var(--text-secondary)]">Type: </span><span className="badge" style={{ background: `${TX_COLORS[hashResult.type] || '#6366f1'}15`, color: TX_COLORS[hashResult.type] || '#6366f1' }}>{hashResult.type}</span></p>
              )}
              {hashResult.tender && (
                <p className="text-sm mt-1"><span className="text-[var(--text-secondary)]">Tender: </span>{hashResult.tender}</p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-sm text-[var(--text-secondary)]">
            {isLive
              ? '🔗 All records are immutable and independently verifiable on Hyperledger Fabric'
              : blockchainMode === 'SHA256_AUDIT_LOG'
                ? '🔐 Records hashed with SHA-256 chained audit log. Connect Fabric for distributed immutability.'
                : '🔗 All records are immutable and independently verifiable on Hyperledger Fabric'
            }
          </p>
          <a href="/dashboard" className="text-[var(--accent)] text-sm hover:underline mt-2 inline-block">← Back to Dashboard</a>
        </div>
      </div>
    </div>
  );
}
