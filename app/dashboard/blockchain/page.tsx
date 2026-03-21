'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { getBlockchainFeed, DEMO_TENDERS, DEMO_MODE } from '@/lib/dataLayer';
import { useBlockchainFeed } from '@/hooks/useRealtimeData';

export default function BlockchainPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const blockchainFeed = useBlockchainFeed();
  const [selectedBlock, setSelectedBlock] = useState<number | null>(null);

  useEffect(() => { if (!isAuthenticated) router.push('/'); }, [isAuthenticated, router]);

  const networkStats = DEMO_MODE ? {
    peers: 8, orgs: 4, blocks: 1338, channel: 'TenderChannel',
    chaincode: 'tendershield_cc', consensus: 'Raft', tps: 127,
    orgs_list: [
      { name: 'MinistryOrg', peers: 2, status: '🟢', role: 'Endorser' },
      { name: 'BidderOrg', peers: 2, status: '🟢', role: 'Endorser' },
      { name: 'AuditorOrg (CAG)', peers: 2, status: '🟢', role: 'Endorser + Auditor' },
      { name: 'NICOrg', peers: 2, status: '🟢', role: 'Orderer + Admin' },
    ]
  } : { peers: 0, orgs: 0, blocks: 0, channel: 'TenderChannel', chaincode: 'tendershield_cc', consensus: 'Raft', tps: 0, orgs_list: [] };

  const eventColor = (type: string) => type === 'danger' ? '#ef4444' : type === 'success' ? '#22c55e' : '#6366f1';

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold">⛓️ Blockchain Explorer</h1>
        <p className="text-sm text-[var(--text-secondary)]">Hyperledger Fabric network visualization</p>
      </div>

      {/* Network Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: '📦', label: 'Total Blocks', value: networkStats.blocks, color: '#6366f1' },
          { icon: '🖥️', label: 'Peers Online', value: networkStats.peers, color: '#22c55e' },
          { icon: '🏛️', label: 'Organizations', value: networkStats.orgs, color: '#f59e0b' },
          { icon: '⚡', label: 'Throughput', value: `${networkStats.tps} TPS`, color: '#ef4444' },
        ].map((s, i) => (
          <div key={i} className="stat-card">
            <div className="flex items-center gap-2 mb-2">
              <span>{s.icon}</span>
              <span className="text-xs text-[var(--text-secondary)] uppercase">{s.label}</span>
            </div>
            <p className="text-2xl font-display font-bold" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Block Chain Visualization */}
        <div className="lg:col-span-2 card-glass p-6">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" /> Live Block Chain
          </h2>
          <div className="flex gap-3 overflow-x-auto pb-4">
            {blockchainFeed.slice(0, 8).map((event: any, i: number) => (
              <button key={i} onClick={() => setSelectedBlock(event.block)}
                className={`shrink-0 w-32 p-4 rounded-xl border transition-all text-left ${
                  selectedBlock === event.block ? 'border-[var(--accent)] bg-[var(--accent)]/10' : 'border-[var(--border-subtle)] bg-[var(--bg-secondary)] hover:border-[var(--border-glow)]'
                }`}>
                <p className="text-xs font-mono text-[var(--text-secondary)]">Block</p>
                <p className="text-lg font-bold font-mono">#{event.block}</p>
                <div className="w-2 h-2 rounded-full mt-2" style={{ backgroundColor: eventColor(event.type) }} />
                <p className="text-[10px] text-[var(--text-secondary)] mt-1 truncate">{event.event}</p>
              </button>
            ))}
          </div>

          {selectedBlock && (() => {
            const block = blockchainFeed.find((e: any) => e.block === selectedBlock);
            if (!block) return null;
            return (
              <div className="mt-4 p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
                <h3 className="font-semibold mb-3">Block #{selectedBlock} Details</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-[var(--text-secondary)]">Event</span><span>{block.event}</span></div>
                  <div className="flex justify-between"><span className="text-[var(--text-secondary)]">Ministry</span><span>{block.ministry}</span></div>
                  <div className="flex justify-between"><span className="text-[var(--text-secondary)]">Amount</span><span>{block.amount}</span></div>
                  <div className="flex justify-between"><span className="text-[var(--text-secondary)]">Time</span><span>{block.time} IST</span></div>
                  <div className="flex justify-between"><span className="text-[var(--text-secondary)]">TX Hash</span><span className="font-mono">{block.tx}</span></div>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Organizations */}
        <div className="card-glass p-6">
          <h2 className="font-semibold mb-4">🏛️ Network Organizations</h2>
          <div className="space-y-3">
            {networkStats.orgs_list.map((org, i) => (
              <div key={i} className="p-3 rounded-lg bg-[var(--bg-secondary)]">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">{org.name}</span>
                  <span>{org.status}</span>
                </div>
                <p className="text-xs text-[var(--text-secondary)]">{org.role} · {org.peers} peers</p>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 rounded-lg bg-[var(--bg-secondary)]">
            <p className="text-xs text-[var(--text-secondary)]">Channel: <span className="font-mono">{networkStats.channel}</span></p>
            <p className="text-xs text-[var(--text-secondary)]">Chaincode: <span className="font-mono">{networkStats.chaincode}</span></p>
            <p className="text-xs text-[var(--text-secondary)]">Consensus: <span className="font-mono">{networkStats.consensus}</span></p>
          </div>
        </div>
      </div>

      {/* Transaction Log */}
      <div className="card-glass p-6">
        <h2 className="font-semibold mb-4">📝 Recent Transactions</h2>
        <table className="table-premium">
          <thead><tr><th>Block</th><th>Event</th><th>Ministry</th><th>Amount</th><th>Time</th><th>TX Hash</th></tr></thead>
          <tbody>
            {blockchainFeed.slice(0, 10).map((event: any, i: number) => (
              <tr key={i}>
                <td className="font-mono font-bold">#{event.block}</td>
                <td><span className="badge" style={{ background: `${eventColor(event.type)}22`, color: eventColor(event.type), border: `1px solid ${eventColor(event.type)}44` }}>{event.event}</span></td>
                <td>{event.ministry}</td>
                <td className="font-medium">{event.amount}</td>
                <td className="text-[var(--text-secondary)]">{event.time} IST</td>
                <td className="font-mono text-xs">{event.tx}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
