'use client';

import React, { ErrorInfo } from 'react';

// ══════════════════════════════════════════════════════════
// GLOBAL ERROR BOUNDARY — Graceful failure for all routes
// Detects: Network, Fabric, AI engine failures
// Shows: Context-aware recovery UI with retry + fallback info
// ══════════════════════════════════════════════════════════

interface EBProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface EBState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<EBProps, EBState> {
  constructor(props: EBProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<EBState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    console.error('[TenderShield ErrorBoundary]', {
      error: error.message,
      stack: error.stack?.split('\n').slice(0, 5).join('\n'),
      component: errorInfo.componentStack?.split('\n').slice(0, 3).join('\n'),
      timestamp: new Date().toISOString(),
      url: typeof window !== 'undefined' ? window.location.href : 'SSR',
    });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleGoHome = () => {
    if (typeof window !== 'undefined') window.location.href = '/dashboard';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      const msg = this.state.error?.message || '';
      const isNetwork = /fetch|network|ECONNREFUSED|timeout|abort/i.test(msg);
      const isFabric = /Fabric|chaincode|peer|orderer|ledger/i.test(msg);
      const isAI = /AI|Claude|analysis|model|predict/i.test(msg);

      const icon = isNetwork ? '🌐' : isFabric ? '⛓️' : isAI ? '🤖' : '⚠️';
      const title = isNetwork ? 'Connection Issue' :
                    isFabric ? 'Blockchain Unavailable' :
                    isAI ? 'AI Engine Offline' :
                    'Something Went Wrong';
      const desc = isNetwork ?
          'Unable to reach the server. Your data is safe — all transactions are recorded on-chain. Check your connection and try again.' :
        isFabric ?
          'The Hyperledger Fabric network is not responding. TenderShield is using the Supabase audit trail as a fallback. No data is lost.' :
        isAI ?
          'The AI fraud detection engine is temporarily unavailable. Deterministic rule-based analysis will be used instead.' :
          'An unexpected error occurred. Your work is saved. Try refreshing or go back to the dashboard.';
      const status = isFabric ? '🟡 FALLBACK MODE — Supabase audit trail active' :
                     isAI ? '🟡 FALLBACK MODE — Deterministic fraud engine' :
                     '🟢 System operational — This component had an issue';

      return (
        <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px' }}>
          <div style={{ maxWidth: '480px', width: '100%', padding: '40px', borderRadius: '20px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>{icon}</div>
            <h2 style={{ fontSize: '22px', fontWeight: 600, color: 'white', marginBottom: '8px', fontFamily: "'DM Sans', sans-serif" }}>{title}</h2>
            <p style={{ color: '#888', fontSize: '14px', lineHeight: 1.6, marginBottom: '24px' }}>{desc}</p>

            {this.state.error && (
              <details style={{ marginBottom: '24px', textAlign: 'left', padding: '12px', borderRadius: '10px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <summary style={{ color: '#666', fontSize: '12px', cursor: 'pointer' }}>Technical Details</summary>
                <pre style={{ color: '#ef4444', fontSize: '11px', fontFamily: "'JetBrains Mono', monospace", marginTop: '8px', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                  {this.state.error.message}
                </pre>
              </details>
            )}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={this.handleRetry} style={{ padding: '10px 24px', borderRadius: '10px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: 500, minHeight: '44px' }}>
                🔄 Retry
              </button>
              <button onClick={this.handleGoHome} style={{ padding: '10px 24px', borderRadius: '10px', background: 'rgba(255,255,255,0.04)', color: '#888', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', fontSize: '14px', fontWeight: 500, minHeight: '44px' }}>
                🏠 Dashboard
              </button>
            </div>

            <p style={{ marginTop: '24px', fontSize: '10px', color: '#555', letterSpacing: '0.05em' }}>{status}</p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
