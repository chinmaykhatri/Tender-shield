'use client';

import { useEffect } from 'react';

// ══════════════════════════════════════════════════════════
// GLOBAL ERROR PAGE — Next.js route-level error handling
// Catches: Unhandled errors in any route
// ══════════════════════════════════════════════════════════

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[TenderShield Route Error]', {
      message: error.message,
      digest: error.digest,
      timestamp: new Date().toISOString(),
    });
  }, [error]);

  const isNetwork = /fetch|network|ECONNREFUSED|timeout/i.test(error.message);
  const isFabric = /Fabric|chaincode|peer|ledger/i.test(error.message);
  const isAI = /AI|Claude|analysis|model/i.test(error.message);

  return (
    <div style={{
      minHeight: '60vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '32px',
      fontFamily: "'DM Sans', sans-serif",
    }}>
      <div style={{
        maxWidth: '500px',
        width: '100%',
        padding: '40px',
        borderRadius: '20px',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>
          {isNetwork ? '🌐' : isFabric ? '⛓️' : isAI ? '🤖' : '⚠️'}
        </div>

        <h2 style={{ fontSize: '22px', fontWeight: 600, color: 'white', marginBottom: '8px' }}>
          {isNetwork ? 'Connection Lost' :
           isFabric ? 'Blockchain Service Unavailable' :
           isAI ? 'AI Engine Error' :
           'Something Went Wrong'}
        </h2>

        <p style={{ color: '#888', fontSize: '14px', lineHeight: 1.6, marginBottom: '20px' }}>
          {isNetwork ?
            'Unable to reach the server. Your data is safe on-chain. Check your connection and retry.' :
           isFabric ?
            'The Hyperledger Fabric network is not responding. Supabase audit trail is being used as fallback.' :
           isAI ?
            'The AI fraud detection engine encountered an error. Deterministic analysis is available as fallback.' :
            'An unexpected error occurred. Your progress has been saved.'}
        </p>

        {error.message && (
          <details style={{
            marginBottom: '24px',
            textAlign: 'left',
            padding: '12px',
            borderRadius: '10px',
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}>
            <summary style={{ color: '#666', fontSize: '12px', cursor: 'pointer' }}>
              Error Details
            </summary>
            <pre style={{
              color: '#ef4444',
              fontSize: '11px',
              fontFamily: "'JetBrains Mono', monospace",
              marginTop: '8px',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
            }}>
              {error.message}
              {error.digest && `\n\nDigest: ${error.digest}`}
            </pre>
          </details>
        )}

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={reset}
            style={{
              padding: '10px 24px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: 'white',
              border: 'none',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
              minHeight: '44px',
            }}
          >
            🔄 Try Again
          </button>
          <button
            onClick={() => window.location.href = '/dashboard'}
            style={{
              padding: '10px 24px',
              borderRadius: '10px',
              background: 'rgba(255,255,255,0.04)',
              color: '#888',
              border: '1px solid rgba(255,255,255,0.08)',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
              minHeight: '44px',
            }}
          >
            🏠 Dashboard
          </button>
        </div>

        <p style={{ marginTop: '24px', fontSize: '10px', color: '#555' }}>
          {isFabric ? '🟡 FALLBACK: Supabase audit trail active' :
           isAI ? '🟡 FALLBACK: Deterministic engine active' :
           '🟢 System operational — isolated component error'}
        </p>
      </div>
    </div>
  );
}
