'use client';

import { useState, useEffect } from 'react';

/**
 * DemoLoginTransition — Cinematic loading screen for demo login.
 * Shows animated shield + progress steps + particle effects while
 * the HMAC session cookie is being established with the server.
 */

const STEPS = [
  { icon: '🔐', label: 'Establishing secure session...' },
  { icon: '🛡️', label: 'Verifying credentials...' },
  { icon: '📊', label: 'Loading fraud detection engine...' },
  { icon: '⚡', label: 'Initializing dashboard...' },
];

interface Props {
  roleName: string;
  roleColor: string;
  visible: boolean;
}

export default function DemoLoginTransition({ roleName, roleColor, visible }: Props) {
  const [step, setStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [showGlow, setShowGlow] = useState(false);

  useEffect(() => {
    if (!visible) { setStep(0); setProgress(0); setShowGlow(false); return; }

    // Step progression: 0→1→2→3 over ~2s
    const t1 = setTimeout(() => setStep(1), 350);
    const t2 = setTimeout(() => setStep(2), 700);
    const t3 = setTimeout(() => setStep(3), 1100);
    const t4 = setTimeout(() => setShowGlow(true), 600);

    // Smooth progress bar
    let frame: number;
    const start = Date.now();
    const duration = 2500;
    const tick = () => {
      const elapsed = Date.now() - start;
      const p = Math.min(elapsed / duration, 1);
      setProgress(1 - Math.pow(1 - p, 3));
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    return () => {
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4);
      cancelAnimationFrame(frame);
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99999,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(ellipse at center, #0a0a1a 0%, #050510 50%, #000 100%)',
      animation: 'dlt-fadein 0.35s ease-out',
    }}>
      <style>{`
        @keyframes dlt-fadein { from { opacity: 0; } to { opacity: 1; } }
        @keyframes dlt-pulse { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.12); opacity: 0.85; } }
        @keyframes dlt-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes dlt-spin-reverse { from { transform: rotate(360deg); } to { transform: rotate(0deg); } }
        @keyframes dlt-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
        @keyframes dlt-particle {
          0% { transform: translate(0, 0) scale(1); opacity: 0.8; }
          100% { transform: translate(var(--dx), var(--dy)) scale(0); opacity: 0; }
        }
        @keyframes dlt-glow-pulse {
          0%, 100% { box-shadow: 0 0 40px var(--glow-color), 0 0 80px var(--glow-color); }
          50% { box-shadow: 0 0 60px var(--glow-color), 0 0 120px var(--glow-color); }
        }
        @keyframes dlt-scan {
          0% { top: 0; opacity: 0; }
          10% { opacity: 0.6; }
          90% { opacity: 0.6; }
          100% { top: 100%; opacity: 0; }
        }
        @keyframes dlt-step-enter {
          from { opacity: 0; transform: translateX(-16px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>

      {/* Background grid effect */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.04,
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
      }} />

      {/* Radial glow behind shield */}
      {showGlow && (
        <div style={{
          position: 'absolute', width: 300, height: 300, borderRadius: '50%',
          // @ts-expect-error CSS custom properties
          '--glow-color': `${roleColor}22`,
          background: `radial-gradient(circle, ${roleColor}15 0%, transparent 70%)`,
          animation: 'dlt-glow-pulse 2s ease-in-out infinite',
        }} />
      )}

      {/* Particle ring — outer */}
      <div style={{ position: 'absolute', width: 220, height: 220 }}>
        {Array.from({ length: 16 }).map((_, i) => (
          <div key={i} style={{
            position: 'absolute', width: 3, height: 3, borderRadius: '50%',
            background: roleColor, top: '50%', left: '50%', opacity: 0.5,
            // @ts-expect-error CSS custom properties
            '--dx': `${Math.cos(i * 22.5 * Math.PI / 180) * 100}px`,
            '--dy': `${Math.sin(i * 22.5 * Math.PI / 180) * 100}px`,
            animation: `dlt-particle 2.5s ease-out ${i * 0.12}s infinite`,
          }} />
        ))}
      </div>

      {/* Double spinning rings */}
      <div style={{
        width: 110, height: 110, borderRadius: '50%',
        border: `2px solid ${roleColor}18`, borderTopColor: roleColor,
        animation: 'dlt-spin 1.2s linear infinite', position: 'absolute',
      }} />
      <div style={{
        width: 130, height: 130, borderRadius: '50%',
        border: `1px solid ${roleColor}10`, borderBottomColor: `${roleColor}66`,
        animation: 'dlt-spin-reverse 2s linear infinite', position: 'absolute',
      }} />

      {/* Shield icon */}
      <div style={{
        fontSize: 52, animation: 'dlt-pulse 1.8s ease-in-out infinite',
        marginBottom: 28, filter: `drop-shadow(0 0 25px ${roleColor}88)`,
      }}>
        🛡️
      </div>

      {/* Role label */}
      <div style={{
        fontSize: 22, fontWeight: 700, color: roleColor, marginBottom: 6,
        letterSpacing: '0.5px', animation: 'dlt-float 2.5s ease-in-out infinite',
        fontFamily: "'Rajdhani', 'DM Sans', sans-serif",
        textShadow: `0 0 20px ${roleColor}44`,
      }}>
        {roleName}
      </div>

      {/* Subtitle */}
      <div style={{ fontSize: 12, color: '#666', marginBottom: 20, letterSpacing: '0.5px' }}>
        Securing your session with HMAC-SHA256
      </div>

      {/* Steps */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 280 }}>
        {STEPS.map((s, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '7px 14px', borderRadius: 8,
            background: step >= i ? `${roleColor}12` : 'transparent',
            opacity: step >= i ? 1 : 0.2,
            animation: step >= i ? `dlt-step-enter 0.4s ease ${i * 0.15}s both` : 'none',
          }}>
            <span style={{ fontSize: 15, width: 22, textAlign: 'center' }}>
              {step > i ? '✅' : s.icon}
            </span>
            <span style={{
              fontSize: 12, color: step >= i ? '#d0d0d0' : '#444',
              fontWeight: step === i ? 600 : 400,
            }}>
              {s.label}
            </span>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div style={{
        width: 280, height: 3, background: '#1a1a2e',
        borderRadius: 3, marginTop: 22, overflow: 'hidden',
      }}>
        <div style={{
          width: `${progress * 100}%`, height: '100%',
          background: `linear-gradient(90deg, ${roleColor}88, ${roleColor})`,
          borderRadius: 3, transition: 'width 0.08s linear',
          boxShadow: `0 0 12px ${roleColor}66, 0 0 4px ${roleColor}aa`,
        }} />
      </div>

      {/* Bottom branding */}
      <div style={{
        fontSize: 10, color: '#333', marginTop: 20,
        letterSpacing: '2px', textTransform: 'uppercase',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{ color: '#FF9933' }}>●</span>
        TenderShield · Secure Session
        <span style={{ color: '#138808' }}>●</span>
      </div>
    </div>
  );
}
