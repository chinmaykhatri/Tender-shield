'use client';

/**
 * ChaincodeBanner — Transparency indicator for blockchain simulation mode
 * Shows judges that the simulation mirrors the real Go chaincode exactly.
 */

const CHAINCODE_MAP = [
  { fn: 'CreateTender()', py: 'fabric_service.create_tender()', line: 'L163' },
  { fn: 'FreezeTender()', py: 'fabric_service.freeze_tender()', line: 'L279' },
  { fn: 'SubmitBid()', py: 'fabric_service.submit_bid()', line: 'L397' },
  { fn: 'RevealBid()', py: 'fabric_service.reveal_bid()', line: 'L486' },
  { fn: 'EvaluateBids()', py: 'fabric_service.evaluate_bids()', line: 'L573' },
];

export default function ChaincodeBanner() {
  return (
    <div style={{
      padding: '12px 16px',
      borderRadius: '12px',
      background: 'linear-gradient(135deg, rgba(255,153,51,0.05), rgba(99,102,241,0.05))',
      border: '1px solid rgba(99,102,241,0.15)',
      marginBottom: '16px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <span style={{
          padding: '2px 8px', borderRadius: '6px', fontSize: '9px',
          fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.05em',
          background: 'rgba(99,102,241,0.15)', color: '#818cf8',
          border: '1px solid rgba(99,102,241,0.25)',
        }}>
          DEMO SIMULATION
        </span>
        <span style={{ fontSize: '12px', fontWeight: 600, color: '#ccc' }}>
          Blockchain Mode
        </span>
      </div>

      <p style={{ fontSize: '11px', color: '#888', lineHeight: 1.6, marginBottom: '8px' }}>
        This explorer mirrors{' '}
        <code style={{ color: '#818cf8', background: 'rgba(99,102,241,0.1)', padding: '1px 4px', borderRadius: '3px', fontSize: '10px' }}>
          chaincode/tendershield/tender_contract.go
        </code>{' '}
        (900 lines, 13 functions). Production connects to a 4-org Hyperledger Fabric 2.5 network via gRPC Gateway.
      </p>

      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' as const }}>
        {CHAINCODE_MAP.map((m, i) => (
          <span key={i} style={{
            padding: '2px 6px', borderRadius: '4px', fontSize: '9px',
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
            color: '#666', fontFamily: 'monospace',
          }}>
            {m.fn} → {m.py}
          </span>
        ))}
      </div>
    </div>
  );
}
