'use client';

import { useState } from 'react';

/**
 * TenderShield — Blockchain Explorer Component
 * Visual transaction explorer showing blocks, transactions,
 * organization participation, and immutable audit trail.
 */

interface BlockData {
  block_number: number;
  timestamp: string;
  tx_count: number;
  transactions: TransactionData[];
  hash: string;
  prev_hash: string;
}

interface TransactionData {
  tx_id: string;
  type: string;
  channel: string;
  creator_org: string;
  endorsers: string[];
  timestamp: string;
  details: Record<string, any>;
}

// Demo blockchain data for competition
const DEMO_BLOCKS: BlockData[] = [
  {
    block_number: 47,
    timestamp: '2025-03-19T14:30:15+05:30',
    tx_count: 2,
    hash: '0x7a8b9c...3d4e5f',
    prev_hash: '0x1a2b3c...9d0e1f',
    transactions: [
      {
        tx_id: 'TX-7a8b9c3d',
        type: 'TENDER_CREATED',
        channel: 'tenderchannel',
        creator_org: 'MinistryOrgMSP',
        endorsers: ['MinistryOrgMSP', 'NICOrgMSP'],
        timestamp: '14:30:15 IST',
        details: { tender_id: 'TDR-MoH-2025-000001', value: '₹120 Cr', category: 'GOODS' },
      },
      {
        tx_id: 'TX-4e5f6a7b',
        type: 'COMPLIANCE_CHECK',
        channel: 'tenderchannel',
        creator_org: 'NICOrgMSP',
        endorsers: ['NICOrgMSP'],
        timestamp: '14:30:16 IST',
        details: { gfr_rule: 'Rule 149', result: 'COMPLIANT' },
      },
    ],
  },
  {
    block_number: 46,
    timestamp: '2025-03-19T14:25:00+05:30',
    tx_count: 1,
    hash: '0x1a2b3c...9d0e1f',
    prev_hash: '0x5f6a7b...2c3d4e',
    transactions: [
      {
        tx_id: 'TX-8c9d0e1f',
        type: 'BID_COMMITTED',
        channel: 'tenderchannel',
        creator_org: 'BidderOrgMSP',
        endorsers: ['BidderOrgMSP', 'NICOrgMSP'],
        timestamp: '14:25:00 IST',
        details: { tender_id: 'TDR-MoRTH-2025-000001', commitment: '0x9f8e7d...', zkp: 'SHA-256' },
      },
    ],
  },
  {
    block_number: 45,
    timestamp: '2025-03-19T14:20:30+05:30',
    tx_count: 1,
    hash: '0x5f6a7b...2c3d4e',
    prev_hash: '0x8c9d0e...6a7b8c',
    transactions: [
      {
        tx_id: 'TX-2b3c4d5e',
        type: 'AI_ALERT_RAISED',
        channel: 'auditchannel',
        creator_org: 'NICOrgMSP',
        endorsers: ['NICOrgMSP', 'AuditorOrgMSP'],
        timestamp: '14:20:30 IST',
        details: { tender_id: 'TDR-MoH-2025-000001', risk_score: 67, action: 'FREEZE' },
      },
    ],
  },
  {
    block_number: 44,
    timestamp: '2025-03-19T14:15:10+05:30',
    tx_count: 1,
    hash: '0x8c9d0e...6a7b8c',
    prev_hash: '0x3d4e5f...0a1b2c',
    transactions: [
      {
        tx_id: 'TX-6f7a8b9c',
        type: 'TENDER_FROZEN',
        channel: 'tenderchannel',
        creator_org: 'NICOrgMSP',
        endorsers: ['NICOrgMSP', 'MinistryOrgMSP', 'AuditorOrgMSP'],
        timestamp: '14:15:10 IST',
        details: { tender_id: 'TDR-MoH-2025-000001', reason: 'AI detected bid rigging (score=67)' },
      },
    ],
  },
];

const ORG_COLORS: Record<string, { color: string; label: string }> = {
  MinistryOrgMSP: { color: '#FF9933', label: '🏛️ Ministry' },
  BidderOrgMSP: { color: '#22c55e', label: '🏢 Bidder' },
  AuditorOrgMSP: { color: '#f59e0b', label: '🔍 CAG' },
  NICOrgMSP: { color: '#6366f1', label: '🛡️ NIC' },
};

const TX_ICONS: Record<string, string> = {
  TENDER_CREATED: '📋',
  TENDER_PUBLISHED: '📢',
  TENDER_FROZEN: '🚨',
  TENDER_AWARDED: '🏆',
  BID_COMMITTED: '🔒',
  BID_REVEALED: '🔓',
  AI_ALERT_RAISED: '🤖',
  COMPLIANCE_CHECK: '✅',
};

function BlockCard({ block, isExpanded, onToggle }: { block: BlockData; isExpanded: boolean; onToggle: () => void }) {
  return (
    <div className="card-glass overflow-hidden transition-all">
      {/* Block header */}
      <div
        className="flex items-center gap-4 p-4 cursor-pointer hover:bg-[var(--bg-card-hover)] transition-colors"
        onClick={onToggle}
      >
        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30">
          #{block.block_number}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">Block #{block.block_number}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--bg-secondary)] text-[var(--text-secondary)]">
              {block.tx_count} tx{block.tx_count > 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs text-[var(--text-secondary)]">{block.timestamp.slice(11, 19)} IST</span>
            <span className="text-xs font-mono text-[var(--text-secondary)] opacity-60">{block.hash}</span>
          </div>
        </div>
        <span className="text-[var(--text-secondary)] text-sm">{isExpanded ? '▼' : '▶'}</span>
      </div>

      {/* Transactions */}
      {isExpanded && (
        <div className="border-t border-[var(--border-subtle)] animate-fade-in">
          {block.transactions.map((tx, i) => (
            <div key={tx.tx_id} className={`p-4 ${i > 0 ? 'border-t border-[var(--border-subtle)]' : ''}`}>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xl">{TX_ICONS[tx.type] || '📜'}</span>
                <div className="flex-1">
                  <span className="text-sm font-semibold">{tx.type.replace(/_/g, ' ')}</span>
                  <span className="text-xs text-[var(--text-secondary)] ml-2">{tx.timestamp}</span>
                </div>
                <span className="text-xs font-mono px-2 py-1 rounded bg-[var(--bg-secondary)]">{tx.tx_id}</span>
              </div>

              {/* Channel */}
              <div className="flex items-center gap-4 mb-3 text-xs">
                <span className="text-[var(--text-secondary)]">Channel:</span>
                <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 font-medium">{tx.channel}</span>
              </div>

              {/* Endorsers */}
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <span className="text-xs text-[var(--text-secondary)]">Endorsed by:</span>
                {tx.endorsers.map(org => {
                  const meta = ORG_COLORS[org] || { color: '#888', label: org };
                  return (
                    <span
                      key={org}
                      className="text-xs px-2 py-1 rounded-full font-medium"
                      style={{ backgroundColor: `${meta.color}15`, color: meta.color, border: `1px solid ${meta.color}30` }}
                    >
                      {meta.label}
                    </span>
                  );
                })}
              </div>

              {/* Details */}
              <div className="bg-[var(--bg-secondary)] rounded-lg p-3">
                <span className="text-xs text-[var(--text-secondary)] uppercase tracking-wider block mb-2">Transaction Data</span>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(tx.details).map(([key, value]) => (
                    <div key={key} className="text-xs">
                      <span className="text-[var(--text-secondary)]">{key}: </span>
                      <span className="font-medium">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function BlockchainExplorer() {
  const [expandedBlock, setExpandedBlock] = useState<number | null>(47);
  const blocks = DEMO_BLOCKS;

  const totalTxs = blocks.reduce((sum, b) => sum + b.tx_count, 0);

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: '⛓️', label: 'Chain Height', value: blocks[0]?.block_number || 0, color: '#6366f1' },
          { icon: '📝', label: 'Transactions', value: totalTxs, color: '#22c55e' },
          { icon: '🏢', label: 'Organizations', value: 4, color: '#f59e0b' },
          { icon: '📡', label: 'Channels', value: 2, color: '#ef4444' },
        ].map((stat, i) => (
          <div key={i} className="stat-card">
            <div className="flex items-center gap-2 mb-2">
              <span>{stat.icon}</span>
              <span className="text-xs text-[var(--text-secondary)] uppercase tracking-wider">{stat.label}</span>
            </div>
            <p className="text-2xl font-display font-bold" style={{ color: stat.color }}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Block Chain Visualization */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {blocks.map((block, i) => (
          <div key={block.block_number} className="flex items-center">
            <button
              onClick={() => setExpandedBlock(expandedBlock === block.block_number ? null : block.block_number)}
              className={`flex-shrink-0 w-16 h-16 rounded-xl flex flex-col items-center justify-center text-xs font-bold transition-all ${
                expandedBlock === block.block_number
                  ? 'bg-gradient-to-br from-indigo-500 to-purple-500 text-white scale-110 shadow-lg shadow-indigo-500/30'
                  : 'bg-[var(--bg-secondary)] hover:bg-[var(--bg-card-hover)]'
              }`}
            >
              <span>#{block.block_number}</span>
              <span className="text-[10px] opacity-70">{block.tx_count}tx</span>
            </button>
            {i < blocks.length - 1 && (
              <div className="w-6 h-0.5 bg-gradient-to-r from-indigo-500/50 to-purple-500/50 flex-shrink-0" />
            )}
          </div>
        ))}
      </div>

      {/* Block Details */}
      <div className="space-y-3">
        {blocks.map(block => (
          <BlockCard
            key={block.block_number}
            block={block}
            isExpanded={expandedBlock === block.block_number}
            onToggle={() => setExpandedBlock(expandedBlock === block.block_number ? null : block.block_number)}
          />
        ))}
      </div>
    </div>
  );
}
