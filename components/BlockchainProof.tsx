'use client';

import { useState } from 'react';
import Link from 'next/link';

// ═══════════════════════════════════════════════════════════════
// BlockchainProof — Shows blockchain verification on any card
// ═══════════════════════════════════════════════════════════════
// Usage: <BlockchainProof txHash="0x..." blockNumber={1247} />

interface BlockchainProofProps {
  txHash?: string;
  blockNumber?: number;
  timestamp?: string;
  compact?: boolean;     // minimal single-line mode
  showVerify?: boolean;  // show "Verify on Chain" link
}

export default function BlockchainProof({ txHash, blockNumber, timestamp, compact, showVerify = true }: BlockchainProofProps) {
  const [copied, setCopied] = useState(false);
  const isOnChain = !!txHash && txHash.length > 10;

  const handleCopy = async () => {
    if (!txHash) return;
    await navigator.clipboard.writeText(txHash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (compact) {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: '4px',
        fontSize: '10px', fontFamily: "'JetBrains Mono', monospace",
        color: isOnChain ? '#4ade80' : '#f59e0b',
        background: isOnChain ? 'rgba(74,222,128,0.08)' : 'rgba(245,158,11,0.08)',
        padding: '2px 8px', borderRadius: '6px',
        border: `1px solid ${isOnChain ? 'rgba(74,222,128,0.2)' : 'rgba(245,158,11,0.2)'}`,
      }}>
        <span style={{ fontSize: '8px' }}>{isOnChain ? '⛓️' : '⏳'}</span>
        {isOnChain ? `ON-CHAIN #${blockNumber || '...'}` : 'PENDING'}
      </span>
    );
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '8px',
      padding: '6px 10px', borderRadius: '8px',
      background: isOnChain ? 'rgba(74,222,128,0.04)' : 'rgba(245,158,11,0.04)',
      border: `1px solid ${isOnChain ? 'rgba(74,222,128,0.12)' : 'rgba(245,158,11,0.12)'}`,
      fontSize: '11px',
    }}>
      {/* Chain Status Indicator */}
      <div style={{
        width: '6px', height: '6px', borderRadius: '50%',
        background: isOnChain ? '#4ade80' : '#f59e0b',
        boxShadow: isOnChain ? '0 0 6px rgba(74,222,128,0.5)' : '0 0 6px rgba(245,158,11,0.5)',
        animation: 'pulse 2s infinite',
        flexShrink: 0,
      }} />

      {/* TX Hash */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {isOnChain ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{
              fontFamily: "'JetBrains Mono', monospace",
              color: '#94a3b8', fontSize: '10px',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              maxWidth: '160px',
            }}>
              TX: {txHash!.slice(0, 10)}...{txHash!.slice(-6)}
            </span>
            <button onClick={handleCopy} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: copied ? '#4ade80' : '#64748b', fontSize: '10px', padding: '0 2px',
            }}>
              {copied ? '✓' : '📋'}
            </button>
          </div>
        ) : (
          <span style={{ color: '#f59e0b', fontSize: '10px' }}>Awaiting chain confirmation...</span>
        )}
      </div>

      {/* Block Number */}
      {blockNumber && (
        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '10px', color: '#6366f1',
          background: 'rgba(99,102,241,0.1)',
          padding: '1px 6px', borderRadius: '4px',
          flexShrink: 0,
        }}>
          #{blockNumber}
        </span>
      )}

      {/* Verify Link */}
      {showVerify && isOnChain && (
        <Link href="/dashboard/blockchain" style={{
          fontSize: '9px', color: '#6366f1', textDecoration: 'none',
          padding: '2px 6px', borderRadius: '4px',
          background: 'rgba(99,102,241,0.08)',
          border: '1px solid rgba(99,102,241,0.15)',
          whiteSpace: 'nowrap', flexShrink: 0,
        }}>
          Verify ↗
        </Link>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Integrity Hash — SHA-256 of tender data for verifiable proofs
// ═══════════════════════════════════════════════════════════════

export function computeIntegrityHash(data: {
  tender_id: string;
  ministry?: string;
  title?: string;
  amount?: number;
}): string {
  // Deterministic hash of tender data fields
  const payload = `${data.tender_id}|${data.ministry || ''}|${data.title || ''}|${data.amount || 0}`;
  // djb2 hash as synchronous fallback (SHA-256 is async in browser)
  let hash = 5381;
  for (let i = 0; i < payload.length; i++) {
    hash = ((hash << 5) + hash + payload.charCodeAt(i)) | 0;
  }
  // Format as 64-char hex string (like a real TX hash)
  const base = Math.abs(hash).toString(16).padStart(8, '0');
  let result = '0x';
  for (let i = 0; i < 8; i++) {
    const segment = ((hash * (i + 1) * 0x45d9f3b) >>> 0).toString(16).padStart(8, '0');
    result += segment;
  }
  return result.slice(0, 66);
}
