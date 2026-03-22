// ─────────────────────────────────────────────────
// FILE: components/WhatsAppSimulator.tsx
// TYPE: CLIENT COMPONENT
// SECRET KEYS USED: none
// WHAT THIS FILE DOES: Phone mockup showing WhatsApp fraud alert with typing + vibrate animation
// ─────────────────────────────────────────────────
'use client';

import { useState, useEffect, useCallback } from 'react';

interface WhatsAppSimulatorProps {
  tenderName?: string;
  riskScore?: number;
  ministry?: string;
  valueCrore?: number;
  flags?: string[];
  autoPlay?: boolean;
  onComplete?: () => void;
}

export default function WhatsAppSimulator({
  tenderName = 'AIIMS Delhi Equipment',
  riskScore = 94,
  ministry = 'MoH',
  valueCrore = 120,
  flags = ['Shell company (BioMed Corp)', 'Bid rigging (CV: 1.8%)', '3 bids in 47 seconds'],
  autoPlay = false,
  onComplete,
}: WhatsAppSimulatorProps) {
  const [stage, setStage] = useState<'idle' | 'typing' | 'message' | 'done'>('idle');
  const [vibrate, setVibrate] = useState(false);
  const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

  const messageText = `🚨 CRITICAL FRAUD ALERT
─────────────────────────
Tender: ${tenderName}
Risk Score: ${riskScore}/100
Ministry: ${ministry}
Value: ₹${valueCrore} Crore

Detected:
${flags.map(f => `• ${f}`).join('\n')}

Status: AUTO-FROZEN
Action Required: CAG Review
View: tendershield.gov.in/t/003
─────────────────────────
TenderShield AI · ${new Date().getHours()}:${String(new Date().getMinutes()).padStart(2, '0')} IST`;

  const playAnimation = useCallback(() => {
    setStage('typing');
    setTimeout(() => {
      setStage('message');
      setVibrate(true);
      // Play subtle notification sound
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.frequency.value = 800;
        osc.type = 'sine';
        gain.gain.value = 0.05;
        osc.start();
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
        osc.stop(audioCtx.currentTime + 0.3);
      } catch {}
      setTimeout(() => {
        setVibrate(false);
        setStage('done');
        onComplete?.();
      }, 800);
    }, 1500);
  }, [onComplete, tenderName, riskScore]);

  useEffect(() => {
    if (autoPlay) {
      const timer = setTimeout(playAnimation, 500);
      return () => clearTimeout(timer);
    }
  }, [autoPlay, playAnimation]);

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Phone Frame */}
      <div
        className={`relative transition-transform duration-200 ${vibrate ? 'animate-[wiggle_0.1s_ease-in-out_4]' : ''}`}
        style={{
          width: '260px',
          minHeight: '460px',
          background: '#1a1a2e',
          borderRadius: '28px',
          border: '3px solid #333',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5), inset 0 0 0 2px #222',
          overflow: 'hidden',
        }}
      >
        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-5 bg-black rounded-b-xl z-10" />

        {/* WhatsApp Header */}
        <div className="bg-[#075e54] pt-6 px-3 pb-2 flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#25d366] flex items-center justify-center text-white text-xs font-bold">TS</div>
          <div>
            <p className="text-white text-sm font-semibold">TenderShield Alerts</p>
            <p className="text-[#a8dbd0] text-[10px]">
              {stage === 'typing' ? 'typing...' : 'online'}
            </p>
          </div>
        </div>

        {/* Chat Area */}
        <div className="p-3 min-h-[350px] bg-[#0b141a] relative" style={{
          backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'40\' height=\'40\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M20 0L0 20L20 40L40 20Z\' fill=\'%23ffffff\' opacity=\'0.02\'/%3E%3C/svg%3E")',
        }}>
          {stage === 'idle' && (
            <div className="flex items-center justify-center h-[300px] text-center">
              <p className="text-[#a0a0a0] text-xs">Waiting for alert...</p>
            </div>
          )}

          {stage === 'typing' && (
            <div className="mt-4 ml-1">
              <div className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-[#1f2c34]">
                <span className="w-2 h-2 rounded-full bg-[#a0a0a0] animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-[#a0a0a0] animate-bounce" style={{ animationDelay: '200ms' }} />
                <span className="w-2 h-2 rounded-full bg-[#a0a0a0] animate-bounce" style={{ animationDelay: '400ms' }} />
              </div>
            </div>
          )}

          {(stage === 'message' || stage === 'done') && (
            <div className="mt-2 animate-[slideUp_0.3s_ease-out]">
              <div className="bg-[#1f2c34] rounded-xl rounded-tl-none p-3 max-w-[220px] relative shadow-lg">
                <pre className="text-[11px] text-[#e9edef] whitespace-pre-wrap leading-relaxed" style={{ fontFamily: '-apple-system, sans-serif' }}>
                  {messageText}
                </pre>
                <div className="flex items-center justify-end gap-1 mt-1">
                  <span className="text-[9px] text-[#a0a0a0]">{new Date().getHours()}:{String(new Date().getMinutes()).padStart(2, '0')} IST</span>
                  <span className="text-[10px] text-[#53bdeb]">✓✓</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom bar */}
        <div className="bg-[#1f2c34] px-3 py-2 flex items-center gap-2">
          <div className="flex-1 bg-[#2a3942] rounded-full px-3 py-1">
            <span className="text-[#a0a0a0] text-xs">Type a message</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-[#25d366] flex items-center justify-center">
            <span className="text-white text-xs">🎤</span>
          </div>
        </div>
      </div>

      {/* Trigger button */}
      {stage === 'idle' && !autoPlay && (
        <button onClick={playAnimation}
          className="px-6 py-2 rounded-xl text-sm font-medium bg-[#25d366]/10 text-[#25d366] border border-[#25d366]/30 hover:bg-[#25d366]/20 transition-all">
          📱 Simulate WhatsApp Alert
        </button>
      )}

      {/* Mode indicator */}
      <p className="text-[10px] text-[var(--text-secondary)]">
        {isDemoMode ? '📱 Simulated — add Twilio keys for real alerts' : '📱 Real alert sent to CAG Auditor'}
      </p>

      <style jsx>{`
        @keyframes wiggle {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-3px); }
          75% { transform: translateX(3px); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
