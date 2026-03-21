// FILE: components/BlockchainQRCode.tsx
// FEATURE: Feature 2 — Real Hyperledger on Oracle Cloud
// DEMO MODE: QR links to /verify page with TX hash
// REAL MODE: QR links to live Hyperledger block explorer

'use client';

import { useState } from 'react';

interface BlockchainQRCodeProps {
  txHash: string;
  blockNumber: number;
  label: string;
  channel?: string;
}

export default function BlockchainQRCode({ txHash, blockNumber, label, channel = 'tenderchannel' }: BlockchainQRCodeProps) {
  const [copied, setCopied] = useState(false);

  // Build verification URL
  const verifyUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/verify?tx=${txHash}`
    : `/verify?tx=${txHash}`;

  // Generate QR code using a lightweight approach (Google Charts API)
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

      <p style={{ color: '#888', fontSize: '11px', marginBottom: '8px' }}>
        Scan to verify on Hyperledger Fabric
      </p>

      {/* TX Hash */}
      <div
        onClick={copyHash}
        style={{
          padding: '8px 12px', background: 'rgba(255,255,255,0.04)',
          borderRadius: '8px', cursor: 'pointer', transition: 'background 200ms',
          fontFamily: "'JetBrains Mono', monospace",
        }}
      >
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
