'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';

// ═══════════════════════════════════════════════════════════
// TenderShield — Mobile QR Scanner
// Opens device camera → detects QR code → auto-verifies tender
// Uses BarcodeDetector API with canvas fallback
// ═══════════════════════════════════════════════════════════

interface VerifyResult {
  verified: boolean;
  tender_id?: string;
  tender_title?: string;
  tender_status?: string;
  chain_integrity?: boolean;
  tender_event_count?: number;
  total_chain_blocks?: number;
  verification_time_ms?: number;
  algorithm?: string;
  checks?: { label: string; passed: boolean; detail: string }[];
  error?: string;
}

type ScanState = 'idle' | 'scanning' | 'verifying' | 'result' | 'error';

export default function ScanPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number>(0);

  const [scanState, setScanState] = useState<ScanState>('idle');
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [manualId, setManualId] = useState('');
  const [scannedUrl, setScannedUrl] = useState('');
  const [torchOn, setTorchOn] = useState(false);

  // ── Start Camera ──
  const startCamera = useCallback(async () => {
    try {
      setScanState('scanning');
      setResult(null);
      setErrorMsg('');

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        scanFrame();
      }
    } catch (err: any) {
      setScanState('error');
      setErrorMsg(
        err.name === 'NotAllowedError'
          ? 'Camera permission denied. Please allow camera access to scan QR codes.'
          : err.name === 'NotFoundError'
            ? 'No camera found on this device. Use manual verification below.'
            : `Camera error: ${err.message}`
      );
    }
  }, []);

  // ── Stop Camera ──
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = 0;
    }
  }, []);

  // ── Scan Frame using BarcodeDetector ──
  const scanFrame = useCallback(async () => {
    if (!videoRef.current || videoRef.current.readyState < 2) {
      animFrameRef.current = requestAnimationFrame(scanFrame);
      return;
    }

    try {
      // Check for BarcodeDetector API support
      if ('BarcodeDetector' in window) {
        const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
        const barcodes = await detector.detect(videoRef.current);

        if (barcodes.length > 0) {
          const url = barcodes[0].rawValue;
          if (url && (url.includes('/verify') || url.includes('/scan') || url.includes('tendershield'))) {
            stopCamera();
            await handleScannedUrl(url);
            return;
          }
        }
      } else {
        // Fallback: Use canvas to capture frame and try to read QR
        // For browsers without BarcodeDetector, we'll use manual input
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          canvas.width = videoRef.current.videoWidth;
          canvas.height = videoRef.current.videoHeight;
          ctx?.drawImage(videoRef.current, 0, 0);
        }
      }
    } catch {
      // Detection failed this frame, continue scanning
    }

    animFrameRef.current = requestAnimationFrame(scanFrame);
  }, [stopCamera]);

  // ── Handle scanned URL ──
  const handleScannedUrl = async (url: string) => {
    setScannedUrl(url);
    setScanState('verifying');

    // Vibrate on successful scan
    if ('vibrate' in navigator) {
      navigator.vibrate([100, 50, 100]);
    }

    try {
      // Extract tender and hash from URL
      const urlObj = new URL(url);
      const tender = urlObj.searchParams.get('tender') || urlObj.searchParams.get('tender_id') || '';
      const hash = urlObj.searchParams.get('hash') || '';

      // Call verification API
      const apiUrl = `/api/verify/scan?tender=${encodeURIComponent(tender)}&hash=${encodeURIComponent(hash)}&format=json`;
      const res = await fetch(apiUrl);
      const data = await res.json();

      setResult(data);
      setScanState('result');
    } catch (err: any) {
      setScanState('error');
      setErrorMsg(`Verification failed: ${err.message}`);
    }
  };

  // ── Manual verification ──
  const handleManualVerify = async () => {
    if (!manualId.trim()) return;
    setScanState('verifying');

    try {
      const res = await fetch(`/api/verify/tender?tender_id=${encodeURIComponent(manualId.trim())}`);
      const data = await res.json();
      setResult(data);
      setScanState('result');
    } catch (err: any) {
      setScanState('error');
      setErrorMsg(`Verification failed: ${err.message}`);
    }
  };

  // ── Toggle Torch ──
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    const capabilities = track.getCapabilities?.() as any;
    if (capabilities?.torch) {
      await (track as any).applyConstraints({ advanced: [{ torch: !torchOn }] });
      setTorchOn(!torchOn);
    }
  };

  // ── Reset ──
  const resetScanner = () => {
    stopCamera();
    setScanState('idle');
    setResult(null);
    setErrorMsg('');
    setScannedUrl('');
  };

  // ── Cleanup on unmount ──
  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
    return () => stopCamera();
  }, [stopCamera]);

  return (
    <div style={{
      minHeight: '100vh', background: '#0f172a', color: '#e2e8f0',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Tricolor bar */}
      <div style={{ height: 4, background: 'linear-gradient(90deg, #FF9933 33%, #FFFFFF 33% 66%, #138808 66%)' }} />

      {/* Header */}
      <div style={{ padding: '16px 20px', textAlign: 'center' }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 2 }}>
          📱 TenderShield Scanner
        </h1>
        <p style={{ fontSize: 12, color: '#94a3b8' }}>
          Scan any TenderShield QR code to verify tender integrity
        </p>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '0 16px 24px' }}>

        {/* IDLE state — Start button */}
        {scanState === 'idle' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
            <div style={{
              width: 120, height: 120, borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.15))',
              border: '2px solid rgba(99,102,241,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 48,
            }}>
              📷
            </div>
            <button
              onClick={startCamera}
              style={{
                padding: '16px 48px', borderRadius: 16, border: 'none',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                color: '#fff', fontWeight: 700, fontSize: 16,
                cursor: 'pointer', boxShadow: '0 4px 24px rgba(99,102,241,0.4)',
                transition: 'transform 0.2s',
              }}
            >
              🔍 Start Scanning
            </button>
            <p style={{ fontSize: 11, color: '#64748b', maxWidth: 300, textAlign: 'center' }}>
              Point your camera at a TenderShield QR code to instantly verify the tender&apos;s blockchain integrity
            </p>

            {/* Manual input */}
            <div style={{
              width: '100%', maxWidth: 400, marginTop: 12,
              padding: 16, borderRadius: 14,
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
            }}>
              <p style={{ fontSize: 11, color: '#64748b', marginBottom: 8 }}>Or enter a Tender ID manually:</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  placeholder="TDR-MoH-2026-000003"
                  value={manualId}
                  onChange={(e) => setManualId(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleManualVerify()}
                  style={{
                    flex: 1, padding: '10px 14px', borderRadius: 10,
                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                    color: '#fff', fontSize: 13, fontFamily: 'monospace', outline: 'none',
                  }}
                />
                <button
                  onClick={handleManualVerify}
                  disabled={!manualId.trim()}
                  style={{
                    padding: '10px 16px', borderRadius: 10, border: 'none',
                    background: manualId.trim() ? '#6366f1' : '#374151',
                    color: '#fff', fontWeight: 600, fontSize: 12, cursor: manualId.trim() ? 'pointer' : 'not-allowed',
                  }}
                >
                  Verify
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SCANNING state — Camera viewfinder */}
        {scanState === 'scanning' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <div style={{
              position: 'relative', width: '100%', maxWidth: 400,
              borderRadius: 20, overflow: 'hidden',
              border: '2px solid rgba(99,102,241,0.4)',
              boxShadow: '0 0 40px rgba(99,102,241,0.2)',
            }}>
              <video
                ref={videoRef}
                playsInline
                muted
                style={{ width: '100%', display: 'block', background: '#000' }}
              />
              {/* Scan overlay */}
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <div style={{
                  width: '65%', height: '65%', border: '3px solid rgba(99,102,241,0.6)',
                  borderRadius: 16, position: 'relative',
                }}>
                  {/* Corner accents */}
                  {[
                    { top: -3, left: -3, borderTop: '4px solid #6366f1', borderLeft: '4px solid #6366f1' },
                    { top: -3, right: -3, borderTop: '4px solid #6366f1', borderRight: '4px solid #6366f1' },
                    { bottom: -3, left: -3, borderBottom: '4px solid #6366f1', borderLeft: '4px solid #6366f1' },
                    { bottom: -3, right: -3, borderBottom: '4px solid #6366f1', borderRight: '4px solid #6366f1' },
                  ].map((style, i) => (
                    <div key={i} style={{ position: 'absolute', width: 24, height: 24, borderRadius: 4, ...(style as any) }} />
                  ))}
                  {/* Scanning line animation */}
                  <div style={{
                    position: 'absolute', left: 4, right: 4, height: 2,
                    background: 'linear-gradient(90deg, transparent, #6366f1, transparent)',
                    animation: 'scanLine 2s ease-in-out infinite',
                  }} />
                </div>
              </div>
              <canvas ref={canvasRef} style={{ display: 'none' }} />
            </div>

            <p style={{ fontSize: 12, color: '#94a3b8', animation: 'pulse 2s infinite' }}>
              🔍 Looking for TenderShield QR code...
            </p>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={toggleTorch} style={{
                padding: '8px 16px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)',
                background: torchOn ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.05)',
                color: torchOn ? '#f59e0b' : '#94a3b8', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              }}>
                {torchOn ? '🔦 Torch On' : '💡 Torch'}
              </button>
              <button onClick={resetScanner} style={{
                padding: '8px 16px', borderRadius: 10, border: '1px solid rgba(239,68,68,0.2)',
                background: 'rgba(239,68,68,0.1)', color: '#f87171', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              }}>
                ✕ Cancel
              </button>
            </div>

            {/* Manual input during scan */}
            <div style={{ width: '100%', maxWidth: 400, marginTop: 8 }}>
              <p style={{ fontSize: 10, color: '#475569', textAlign: 'center', marginBottom: 6 }}>
                Camera not detecting? Enter ID manually:
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  placeholder="TDR-MoH-2026-000003"
                  value={manualId}
                  onChange={(e) => setManualId(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { stopCamera(); handleManualVerify(); } }}
                  style={{
                    flex: 1, padding: '8px 12px', borderRadius: 8,
                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                    color: '#fff', fontSize: 12, fontFamily: 'monospace', outline: 'none',
                  }}
                />
                <button
                  onClick={() => { stopCamera(); handleManualVerify(); }}
                  disabled={!manualId.trim()}
                  style={{
                    padding: '8px 14px', borderRadius: 8, border: 'none',
                    background: manualId.trim() ? '#6366f1' : '#374151',
                    color: '#fff', fontWeight: 600, fontSize: 11, cursor: manualId.trim() ? 'pointer' : 'not-allowed',
                  }}
                >
                  Verify →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* VERIFYING state */}
        {scanState === 'verifying' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
            <div style={{
              width: 64, height: 64, border: '4px solid rgba(99,102,241,0.3)',
              borderTopColor: '#6366f1', borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }} />
            <p style={{ fontSize: 14, fontWeight: 600 }}>Verifying on SHA-256 chain...</p>
            <p style={{ fontSize: 11, color: '#64748b' }}>Recomputing hash chain from live audit events</p>
            {scannedUrl && (
              <p style={{ fontSize: 9, color: '#475569', fontFamily: 'monospace', maxWidth: 300, wordBreak: 'break-all', textAlign: 'center' }}>
                {scannedUrl.length > 80 ? scannedUrl.slice(0, 80) + '...' : scannedUrl}
              </p>
            )}
          </div>
        )}

        {/* RESULT state */}
        {scanState === 'result' && result && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, maxWidth: 440, margin: '0 auto', width: '100%' }}>
            {/* Verification badge */}
            <div style={{
              width: '100%', padding: '24px 20px', borderRadius: 20, textAlign: 'center',
              background: result.verified
                ? 'linear-gradient(135deg, rgba(34,197,94,0.12), rgba(34,197,94,0.05))'
                : 'linear-gradient(135deg, rgba(239,68,68,0.12), rgba(239,68,68,0.05))',
              border: `2px solid ${result.verified ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
              boxShadow: `0 0 40px ${result.verified ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)'}`,
            }}>
              <div style={{ fontSize: 48, marginBottom: 8 }}>
                {result.verified ? '✅' : '❌'}
              </div>
              <h2 style={{
                fontSize: 20, fontWeight: 800,
                color: result.verified ? '#22c55e' : '#ef4444',
              }}>
                {result.verified ? 'TENDER VERIFIED' : 'VERIFICATION FAILED'}
              </h2>
              <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
                {result.verified ? 'Blockchain integrity confirmed' : result.error || 'Chain integrity check failed'}
              </p>
              {result.verification_time_ms !== undefined && (
                <p style={{ fontSize: 10, color: '#64748b', marginTop: 6 }}>
                  Verified in {result.verification_time_ms}ms using {result.algorithm || 'SHA-256'}
                </p>
              )}
            </div>

            {/* Tender details */}
            {result.tender_title && (
              <div style={{
                width: '100%', padding: 16, borderRadius: 14,
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
              }}>
                <p style={{ fontSize: 14, fontWeight: 600 }}>📋 {result.tender_title}</p>
                <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                  Status: {result.tender_status} • ID: {result.tender_id}
                </p>
              </div>
            )}

            {/* Chain stats */}
            {result.total_chain_blocks && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, width: '100%' }}>
                {[
                  { label: 'Chain Blocks', value: result.total_chain_blocks, color: '#6366f1' },
                  { label: 'Tender Events', value: result.tender_event_count || 0, color: '#22c55e' },
                  { label: 'Verify Time', value: `${result.verification_time_ms}ms`, color: '#f59e0b' },
                ].map((s, i) => (
                  <div key={i} style={{
                    padding: 12, borderRadius: 12, textAlign: 'center',
                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                  }}>
                    <p style={{ fontSize: 20, fontWeight: 800, color: s.color, fontFamily: 'monospace' }}>{s.value}</p>
                    <p style={{ fontSize: 9, color: '#64748b' }}>{s.label}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Integrity checks */}
            {result.checks && result.checks.length > 0 && (
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {result.checks.map((c, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                    borderRadius: 10, background: 'rgba(255,255,255,0.02)',
                    border: `1px solid ${c.passed ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)'}`,
                  }}>
                    <span style={{ fontSize: 16 }}>{c.passed ? '✅' : '❌'}</span>
                    <div>
                      <p style={{ fontSize: 12, fontWeight: 600 }}>{c.label}</p>
                      <p style={{ fontSize: 10, color: '#64748b' }}>{c.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: 10, width: '100%' }}>
              <button onClick={resetScanner} style={{
                flex: 1, padding: '12px 20px', borderRadius: 12, border: 'none',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer',
              }}>
                📷 Scan Another
              </button>
              <Link href="/dashboard/blockchain" style={{
                flex: 1, padding: '12px 20px', borderRadius: 12, textAlign: 'center',
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                color: '#a5b4fc', fontWeight: 600, fontSize: 13, textDecoration: 'none',
              }}>
                ⛓️ View Chain
              </Link>
            </div>
          </div>
        )}

        {/* ERROR state */}
        {scanState === 'error' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
            <div style={{ fontSize: 48 }}>⚠️</div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#f87171' }}>Scanner Error</h2>
            <p style={{ fontSize: 13, color: '#94a3b8', textAlign: 'center', maxWidth: 300 }}>{errorMsg}</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={resetScanner} style={{
                padding: '12px 24px', borderRadius: 12, border: 'none',
                background: '#6366f1', color: '#fff', fontWeight: 600, cursor: 'pointer',
              }}>
                Try Again
              </button>
            </div>

            {/* Manual fallback */}
            <div style={{ width: '100%', maxWidth: 380, marginTop: 12, padding: 16, borderRadius: 14, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Manual Verification</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  placeholder="Enter Tender ID"
                  value={manualId}
                  onChange={(e) => setManualId(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleManualVerify()}
                  style={{
                    flex: 1, padding: '10px 12px', borderRadius: 8,
                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                    color: '#fff', fontSize: 13, fontFamily: 'monospace', outline: 'none',
                  }}
                />
                <button onClick={handleManualVerify} disabled={!manualId.trim()} style={{
                  padding: '10px 16px', borderRadius: 8, border: 'none',
                  background: manualId.trim() ? '#6366f1' : '#374151',
                  color: '#fff', fontWeight: 600, cursor: manualId.trim() ? 'pointer' : 'not-allowed',
                }}>
                  Verify
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: '12px 20px', textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <Link href="/dashboard" style={{ fontSize: 12, color: '#6366f1', textDecoration: 'none' }}>
          ← Back to Dashboard
        </Link>
        <span style={{ margin: '0 12px', color: '#1e293b' }}>|</span>
        <Link href="/verify" style={{ fontSize: 12, color: '#6366f1', textDecoration: 'none' }}>
          Web Verification Portal
        </Link>
      </div>

      {/* CSS Animations */}
      <style jsx global>{`
        @keyframes scanLine {
          0% { top: 10%; opacity: 0.5; }
          50% { top: 85%; opacity: 1; }
          100% { top: 10%; opacity: 0.5; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
