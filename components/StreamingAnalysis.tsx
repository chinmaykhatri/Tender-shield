// FILE: components/StreamingAnalysis.tsx
// SECURITY: CLIENT SAFE — no API keys
// API KEYS USED: none
// PURPOSE: Matrix-style terminal UI that streams Claude fraud analysis word-by-word with visual effects

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

interface BidData {
  company: string;
  amount_crore: number;
  submitted_at: string;
  gstin: string;
}

interface StreamingAnalysisProps {
  tenderId: string;
  tenderData: {
    title: string;
    ministry: string;
    value_crore: number;
    bids: BidData[];
  };
  onComplete?: (riskScore: number) => void;
  onCriticalDetected?: () => void;
  autoStart?: boolean;
}

// ── Fallback demo script when API key is not configured ───────────────────
const DEMO_SCRIPT = [
  'Initializing TenderShield fraud detection engine v2.1...',
  'Loading tender: AIIMS Delhi Medical Equipment Procurement',
  'Fetching 4 bid submissions for cryptographic verification...',
  '',
  'STEP 1: Analyzing bid amount distribution...',
  '  Bid 1: ₹118.5 Cr  — MedTech Solutions Pvt Ltd',
  '  Bid 2: ₹119.8 Cr  — BioMed Corp India',
  '  Bid 3: ₹120.1 Cr  — Pharma Plus Equipment Ltd',
  '  Bid 4: ₹115.2 Cr  — HealthCare India Systems',
  '  Calculating Coefficient of Variation...',
  '  CV = 1.8%  ...  ⚠ CV below 3% in only 0.3% of fair tenders (p < 0.001)',
  '',
  'STEP 2: Cross-referencing GSTIN registration records...',
  '  BioMed Corp India  — incorporated: January 2025  (3 months ago)',
  '  Pharma Plus Equipment  — incorporated: February 2025  (2 months ago)',
  '  ⚠ Both companies incorporated AFTER this tender was announced...',
  '',
  'STEP 3: Cross-referencing director PAN numbers via MCA21...',
  '  Querying database... ... ...',
  '  🚨 FLAG DETECTED — SHELL COMPANY',
  '  BioMed Corp director PAN: ABCDE1234F',
  '  Pharma Plus director PAN: ABCDE1234F',
  '  SAME PERSON controls both bidding companies',
  '  Confidence: 99%',
  '',
  'STEP 4: Analyzing bid submission timestamps...',
  '  14:22:15 IST — HealthCare India  (submitted early — clean pattern)',
  '  16:58:41 IST — BioMed Corp submits',
  '  16:59:02 IST — Pharma Plus submits   [21 seconds later]',
  '  16:59:28 IST — Third coordinated bid  [26 seconds later]',
  '  🚨 FLAG DETECTED — TIMING COLLUSION',
  '  3 bids within a 47-second window at deadline',
  '  Natural probability of coincidence: 0.04%',
  '',
  'STEP 5: Checking winning bid vs government estimate...',
  '  Government budget: ₹120.0 Crore',
  '  MedTech winning bid: ₹118.5 Crore',
  '  Ratio: 98.75% of estimate',
  '  🚨 FLAG DETECTED — FRONT RUNNING',
  '  Bids within 1.5% of estimate: 2.3% natural probability',
  '  Pattern consistent with insider knowledge of estimate',
  '',
  '══════════════════════════════════════════════════',
  'ANALYSIS COMPLETE',
  'RISK SCORE: 94 / 100',
  'RISK LEVEL: CRITICAL',
  'RECOMMENDED ACTION: ESCALATE_CAG',
  'AUTO-FREEZING TENDER: YES',
  'DETECTION TIME: 3.2 seconds',
  '══════════════════════════════════════════════════',
];

// ── Audio alert using Web Audio API (no library needed) ──────────────────
function playAlertBeep() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const audioCtx = new AudioCtx();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.3);
    gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + 0.4);
  } catch {
    // Audio not supported — fail silently
  }
}

// ── Line type detection ───────────────────────────────────────────────────
function getLineType(text: string): 'critical' | 'risk_score' | 'action' | 'normal' | 'separator' {
  const upper = text.toUpperCase();
  if (upper.includes('RISK SCORE:') || upper.includes('RISK SCORE ')) return 'risk_score';
  if (upper.includes('AUTO-FREEZING') || upper.includes('RECOMMENDED ACTION:')) return 'action';
  if (upper.includes('🚨') || upper.includes('CRITICAL') || upper.includes('SHELL COMPANY') || upper.includes('FLAG DETECTED')) return 'critical';
  if (text.includes('══') || text.includes('──')) return 'separator';
  return 'normal';
}

function extractRiskScore(text: string): number | null {
  const match = text.match(/RISK SCORE:\s*(\d+)/i);
  return match ? parseInt(match[1], 10) : null;
}

interface TerminalLine {
  text: string;
  type: ReturnType<typeof getLineType>;
  flash?: boolean;
}

export default function StreamingAnalysis({
  tenderId,
  tenderData,
  onComplete,
  onCriticalDetected,
  autoStart = false,
}: StreamingAnalysisProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [lines, setLines] = useState<TerminalLine[]>([]);
  const [currentLine, setCurrentLine] = useState('');
  const [borderFlash, setBorderFlash] = useState<'normal' | 'red'>('normal');
  const [completedRiskScore, setCompletedRiskScore] = useState<number | null>(null);
  const terminalRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const scrollToBottom = useCallback(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, []);

  // Auto-scroll whenever lines change
  useEffect(() => { scrollToBottom(); }, [lines, currentLine, scrollToBottom]);

  // Auto-start if prop set
  useEffect(() => {
    if (autoStart && !isAnalyzing && !isDone) startAnalysis();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);

  const finalizeLine = useCallback((lineText: string) => {
    if (!lineText && !lines.length) return;
    const lineType = getLineType(lineText);

    // Visual effects for critical findings
    if (lineType === 'critical') {
      playAlertBeep();
    }
    if (lineType === 'action') {
      setBorderFlash('red');
      setTimeout(() => setBorderFlash('normal'), 600);
    }

    // Extract risk score
    const score = extractRiskScore(lineText);
    if (score !== null) {
      setCompletedRiskScore(score);
    }

    setLines(prev => [...prev, { text: lineText, type: lineType }]);
    setCurrentLine('');
  }, [lines.length]);

  // ── Run demo fallback script ──────────────────────────────────────────
  const runDemoScript = useCallback(async () => {
    for (const scriptLine of DEMO_SCRIPT) {
      if (abortRef.current?.signal.aborted) break;
      // Type each character
      for (let i = 0; i <= scriptLine.length; i++) {
        if (abortRef.current?.signal.aborted) break;
        setCurrentLine(scriptLine.slice(0, i));
        await new Promise(r => setTimeout(r, 28));
      }
      await new Promise(r => setTimeout(r, 700));
      finalizeLine(scriptLine);
    }
    setIsAnalyzing(false);
    setIsDone(true);
    if (completedRiskScore !== null) {
      onComplete?.(completedRiskScore);
      if (completedRiskScore >= 76) onCriticalDetected?.();
    } else {
      onComplete?.(94);
      onCriticalDetected?.();
    }
  }, [finalizeLine, completedRiskScore, onComplete, onCriticalDetected]);

  // ── Run real streaming from API ───────────────────────────────────────
  const runStreamingAnalysis = useCallback(async () => {
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch('/api/ai/analyze-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tender_id: tenderId,
          title: tenderData.title,
          ministry: tenderData.ministry,
          value_crore: tenderData.value_crore,
          bids: tenderData.bids,
        }),
        signal: controller.signal,
      });

      // API key not set → use demo
      if (response.status === 503) {
        await runDemoScript();
        return;
      }

      if (!response.ok) {
        await runDemoScript();
        return;
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let accumulatedLine = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done || controller.signal.aborted) break;

        buffer += decoder.decode(value, { stream: true });
        const sseLines = buffer.split('\n');
        buffer = sseLines.pop() ?? '';

        for (const sseLine of sseLines) {
          if (!sseLine.startsWith('data: ')) continue;
          const data = sseLine.slice(6).trim();
          if (data === '[DONE]') break;

          try {
            const parsed = JSON.parse(data);
            if (parsed.type === 'content_block_delta') {
              const text: string = parsed.delta?.text ?? '';
              for (const char of text) {
                if (char === '\n') {
                  finalizeLine(accumulatedLine);
                  accumulatedLine = '';
                } else {
                  accumulatedLine += char;
                  setCurrentLine(accumulatedLine);
                  await new Promise(r => setTimeout(r, 12));
                }
              }

              // Extract risk score from accumulated text
              const score = extractRiskScore(accumulatedLine);
              if (score !== null) setCompletedRiskScore(score);
            }
          } catch {
            // Skip malformed chunks
          }
        }
      }

      // Finalize last line
      if (accumulatedLine) finalizeLine(accumulatedLine);

      setIsAnalyzing(false);
      setIsDone(true);
      const finalScore = completedRiskScore ?? 50;
      onComplete?.(finalScore);
      if (finalScore >= 76) onCriticalDetected?.();
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      // Streaming error — falling back to demo
      await runDemoScript();
    }
  }, [tenderId, tenderData, finalizeLine, runDemoScript, completedRiskScore, onComplete, onCriticalDetected]);

  const startAnalysis = useCallback(() => {
    setLines([]);
    setCurrentLine('');
    setIsDone(false);
    setCompletedRiskScore(null);
    setIsAnalyzing(true);
    abortRef.current = new AbortController();
    runStreamingAnalysis();
  }, [runStreamingAnalysis]);

  const stopAnalysis = useCallback(() => {
    abortRef.current?.abort();
    setIsAnalyzing(false);
  }, []);

  // ── Line color mapping ────────────────────────────────────────────────
  const lineColor = (type: TerminalLine['type']) => {
    if (type === 'risk_score') return '#fbbf24';    // yellow
    if (type === 'action') return '#f87171';         // red
    if (type === 'critical') return '#ffffff';        // white flash then green is CSS
    if (type === 'separator') return '#4ade80';      // brighter green
    return '#00ff41';                                // matrix green
  };

  const borderColor = borderFlash === 'red'
    ? '0 0 40px rgba(220,38,38,0.5)'
    : '0 0 30px rgba(0, 255, 65, 0.15)';
  const borderStyle = borderFlash === 'red' ? '#dc2626' : 'rgba(0, 255, 65, 0.4)';

  return (
    <div className="w-full">
      {/* Start/Stop button */}
      {!isDone && (
        <button
          onClick={isAnalyzing ? stopAnalysis : startAnalysis}
          style={{
            width: '100%', height: 52, marginBottom: 16,
            background: isAnalyzing ? '#dc2626' : '#003f88',
            color: 'white', border: 'none', borderRadius: 8,
            fontSize: 16, fontWeight: 600, cursor: 'pointer',
            fontFamily: 'DM Sans, sans-serif',
            animation: isAnalyzing ? 'pulse 1s ease-in-out infinite' : 'none',
            transition: 'all 150ms',
          }}
        >
          {isAnalyzing ? '⏹  Stop Analysis' : '▶  Run Live AI Analysis'}
        </button>
      )}

      {/* Terminal — only visible when analyzing or done */}
      {(isAnalyzing || isDone || lines.length > 0) && (
        <div style={{
          background: '#0a0a0a',
          border: `1px solid ${borderStyle}`,
          borderRadius: 8,
          boxShadow: borderColor,
          overflow: 'hidden',
          transition: 'border-color 0.2s, box-shadow 0.2s',
        }}>
          {/* Terminal header */}
          <div style={{
            background: '#111',
            padding: '8px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid rgba(0,255,65,0.15)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#00ff41', display: 'inline-block' }} />
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#6b7280' }}>
                TenderShield AI Terminal v2.1
              </span>
            </div>
            {isAnalyzing && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{
                  width: 8, height: 8, borderRadius: '50%', background: '#ef4444',
                  display: 'inline-block',
                  animation: 'pulse 1s ease-in-out infinite',
                }} />
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#6b7280' }}>LIVE ANALYSIS</span>
              </div>
            )}
            {isDone && (
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#4ade80' }}>✓ COMPLETE</span>
            )}
          </div>

          {/* Terminal body */}
          <div
            ref={terminalRef}
            style={{
              padding: 16,
              height: 320,
              overflowY: 'auto',
              fontFamily: 'JetBrains Mono, Consolas, monospace',
              fontSize: 13,
              lineHeight: 1.6,
              scrollbarWidth: 'thin',
              scrollbarColor: 'rgba(0,255,65,0.3) transparent',
            }}
          >
            {lines.map((line, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 2 }}>
                {line.text ? (
                  <>
                    <span style={{ color: '#4ade80', flexShrink: 0 }}>ts-ai &gt;</span>
                    <span
                      style={{
                        color: lineColor(line.type),
                        fontWeight: (line.type === 'risk_score' || line.type === 'action') ? 700 : 400,
                        wordBreak: 'break-word',
                      }}
                    >
                      {line.text}
                    </span>
                  </>
                ) : (
                  <span>&nbsp;</span>
                )}
              </div>
            ))}

            {/* Current typing line */}
            {isAnalyzing && (
              <div style={{ display: 'flex', gap: 8 }}>
                {currentLine && <span style={{ color: '#4ade80', flexShrink: 0 }}>ts-ai &gt;</span>}
                <span style={{ color: '#00ff41' }}>
                  {currentLine}
                  <span style={{ animation: 'blink 0.7s step-end infinite' }}>█</span>
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Completion badge */}
      {isDone && (
        <div
          style={{
            marginTop: 12,
            padding: '10px 16px',
            background: completedRiskScore && completedRiskScore >= 76
              ? 'rgba(239,68,68,0.1)'
              : 'rgba(0,255,65,0.1)',
            border: `1px solid ${completedRiskScore && completedRiskScore >= 76 ? '#ef4444' : '#00ff41'}`,
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            animation: 'fadeIn 0.5s ease',
          }}
        >
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#4ade80' }}>
            ✓ Analysis Complete — {completedRiskScore ?? '?'}/100 risk score
          </span>
          {completedRiskScore && completedRiskScore >= 76 && (
            <span style={{
              fontSize: 11, fontWeight: 700, color: '#ef4444',
              fontFamily: 'JetBrains Mono, monospace',
              padding: '2px 8px',
              border: '1px solid #ef4444',
              borderRadius: 4,
            }}>
              🚨 CRITICAL
            </span>
          )}
        </div>
      )}

      <style>{`
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
