// FILE: components/BlockchainQRCode.tsx
// ============================================================================
// Blockchain Verification QR Code — Per-Tender
// ============================================================================
// Generates a QR code that links to the REAL verification portal.
// When scanned, it auto-verifies the tender via /api/verify/tender.
// ============================================================================

'use client';

import { useState } from 'react';

interface BlockchainQRCodeProps {
  txHash: string;
  blockNumber: number;
  label: string;
  tenderId?: string;  // Include tender ID for real verification
  channel?: string;
}

export default function BlockchainQRCode({ txHash, blockNumber, label, tenderId, channel = 'tenderchannel' }: BlockchainQRCodeProps) {
  const [copied, setCopied] = useState(false);

  // Build REAL verification URL with tender ID
  const verifyUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/verify?tender=${encodeURIComponent(tenderId || '')}&hash=${encodeURIComponent(txHash)}&source=qr`
    : `/verify?tender=${encodeURIComponent(tenderId || '')}&hash=${encodeURIComponent(txHash)}&source=qr`;

  // Generate QR code
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(verifyUrl)}&bgcolor=0a0a1a&color=4ade80`;

  function copyHash() {
    navigator.clipboard.writeText(txHash).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div style={{
      padding: '24px', borderRadius: '14px',
      background: 'rgba(34,197,94,0.03)', border: '1px solid rgba(34,197,94,0.12)',
      textAlign: 'center', maxWidth: '300px',
    }}>
      <p style={{ fontSize: '13px', fontWeight: 600, color: '#4ade80', marginBottom: '12px' }}>
        ⛓ {label}
      </p>

      {/* QR Code */}
      <div style={{
        padding: '16px', background: '#0a0a1a', borderRadius: '12px',
        display: 'inline-block', marginBottom: '12px',
      }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qrUrl} alt="Blockchain verification QR code" width={160} height={160} style={{ borderRadius: '8px' }} />
      </div>

      <p style={{ color: '#888', fontSize: '11px', marginBottom: '4px' }}>
        Scan to verify on TenderShield
      </p>
      <p style={{ color: '#555', fontSize: '9px', marginBottom: '8px' }}>
        Real SHA-256 chain verification — no login required
      </p>

      {/* Tender ID */}
      {tenderId && (
        <div style={{ padding: '4px 10px', background: 'rgba(99,102,241,0.08)', borderRadius: '6px', marginBottom: '8px', display: 'inline-block' }}>
          <p style={{ fontSize: '9px', color: '#a5b4fc', fontFamily: "'JetBrains Mono', monospace" }}>{tenderId}</p>
        </div>
      )}

      {/* TX Hash */}
      <div onClick={copyHash} style={{
        padding: '8px 12px', background: 'rgba(255,255,255,0.04)',
        borderRadius: '8px', cursor: 'pointer', transition: 'background 200ms',
        fontFamily: "'JetBrains Mono', monospace",
      }}>
        <p style={{ fontSize: '10px', color: '#666', marginBottom: '2px' }}>TX HASH</p>
        <p style={{ fontSize: '11px', color: '#a5b4fc', wordBreak: 'break-all' }}>
          {txHash.slice(0, 20)}...{txHash.slice(-8)}
        </p>
        <p style={{ fontSize: '10px', color: copied ? '#4ade80' : '#555', marginTop: '4px' }}>
          {copied ? '✅ Copied!' : 'Click to copy'}
        </p>
      </div>

      {/* Block info */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', padding: '0 8px' }}>
        <span style={{ fontSize: '10px', color: '#666' }}>Block #{blockNumber}</span>
        <span style={{ fontSize: '10px', color: '#666' }}>Channel: {channel}</span>
      </div>
    </div>
  );
}
