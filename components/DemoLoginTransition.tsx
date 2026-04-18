'use client';

import { useState, useEffect } from 'react';

/**
 * DemoLoginTransition — Cinematic loading screen for demo login.
 * Shows animated shield + progress steps while the HMAC session cookie
 * is being established with the server. Keeps users engaged so the
 * ~1-2s server round-trip feels intentional and premium.
 */

const STEPS = [
  { icon: '🔐', label: 'Establishing secure session...' },
  { icon: '🛡️', label: 'Verifying credentials...' },
  { icon: '⚡', label: 'Loading dashboard...' },
];

interface Props {
  roleName: string;
  roleColor: string;
  visible: boolean;
}

export default function DemoLoginTransition({ roleName, roleColor, visible }: Props) {
  const [step, setStep] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!visible) { setStep(0); setProgress(0); return; }

    // Step progression: 0→1→2 over ~1.5s
    const t1 = setTimeout(() => setStep(1), 400);
    const t2 = setTimeout(() => setStep(2), 900);

    // Smooth progress bar
    let frame: number;
    const start = Date.now();
    const duration = 2000;
    const tick = () => {
      const elapsed = Date.now() - start;
      const p = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      setProgress(1 - Math.pow(1 - p, 3));
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      cancelAnimationFrame(frame);
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 99999,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(ellipse at center, #111 0%, #080808 70%)',
      animation: 'dlt-fadein 0.3s ease-out',
    }}>
      <style>{`
        @keyframes dlt-fadein { from { opacity: 0; } to { opacity: 1; } }
        @keyframes dlt-pulse { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.08); opacity: 0.85; } }
        @keyframes dlt-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes dlt-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        @keyframes dlt-particle {
          0% { transform: translate(0, 0) scale(1); opacity: 1; }
          100% { transform: translate(var(--dx), var(--dy)) scale(0); opacity: 0; }
        }
      `}</style>

      {/* Particle ring */}
      <div style={{ position: 'absolute', width: 200, height: 200 }}>
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} style={{
            position: 'absolute',
            width: 4,
            height: 4,
            borderRadius: '50%',
            background: roleColor,
            top: '50%',
            left: '50%',
            opacity: 0.6,
            // @ts-expect-error CSS custom properties
            '--dx': `${Math.cos(i * 30 * Math.PI / 180) * 80}px`,
            '--dy': `${Math.sin(i * 30 * Math.PI / 180) * 80}px`,
            animation: `dlt-particle 2s ease-out ${i * 0.15}s infinite`,
          }} />
        ))}
      </div>

      {/* Spinning ring */}
      <div style={{
        width: 100, height: 100,
        borderRadius: '50%',
        border: `3px solid ${roleColor}22`,
        borderTopColor: roleColor,
        animation: 'dlt-spin 1s linear infinite',
        position: 'absolute',
      }} />

      {/* Shield icon */}
      <div style={{
        fontSize: 48,
        animation: 'dlt-pulse 1.5s ease-in-out infinite',
        marginBottom: 24,
        filter: `drop-shadow(0 0 20px ${roleColor}66)`,
      }}>
        🛡️
      </div>

      {/* Role label */}
      <div style={{
        fontSize: 20,
        fontWeight: 700,
        color: roleColor,
        marginBottom: 8,
        letterSpacing: '0.5px',
        animation: 'dlt-float 2s ease-in-out infinite',
      }}>
        {roleName}
      </div>

      {/* Steps */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 16, minWidth: 260 }}>
        {STEPS.map((s, i) => (
          <div key={i} style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '6px 12px',
            borderRadius: 8,
            background: step >= i ? `${roleColor}15` : 'transparent',
            transition: 'all 0.4s ease',
            opacity: step >= i ? 1 : 0.3,
            transform: step >= i ? 'translateX(0)' : 'translateX(-10px)',
          }}>
            <span style={{ fontSize: 16, width: 24, textAlign: 'center' }}>
              {step > i ? '✅' : s.icon}
            </span>
            <span style={{
              fontSize: 13,
              color: step >= i ? '#e0e0e0' : '#666',
              fontWeight: step === i ? 600 : 400,
              transition: 'color 0.3s',
            }}>
              {s.label}
            </span>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div style={{
        width: 260,
        height: 3,
        background: '#222',
        borderRadius: 3,
        marginTop: 20,
        overflow: 'hidden',
      }}>
        <div style={{
          width: `${progress * 100}%`,
          height: '100%',
          background: `linear-gradient(90deg, ${roleColor}, ${roleColor}cc)`,
          borderRadius: 3,
          transition: 'width 0.1s linear',
          boxShadow: `0 0 10px ${roleColor}66`,
        }} />
      </div>

      {/* Subtle text */}
      <div style={{
        fontSize: 11,
        color: '#555',
        marginTop: 16,
        letterSpacing: '1px',
        textTransform: 'uppercase',
      }}>
        TenderShield · Secure Session
      </div>
    </div>
  );
}
