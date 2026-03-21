// FILE: components/GlowStripes.tsx
// FEATURE: Day 3 — Spline-Inspired UI
// Pure CSS animated saffron glow stripes inspired by Spline "Chasing Sunsets"

'use client';

interface GlowStripesProps {
  size?: number;
  animated?: boolean;
  opacity?: number;
  position?: 'top-right' | 'top-left' | 'center' | 'bottom-right';
}

export default function GlowStripes({
  size = 500,
  animated = true,
  opacity = 0.6,
  position = 'top-right',
}: GlowStripesProps) {
  const positionStyles: Record<string, React.CSSProperties> = {
    'top-right': { top: '-15%', right: '-15%' },
    'top-left': { top: '-15%', left: '-15%' },
    'center': { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' },
    'bottom-right': { bottom: '-15%', right: '-15%' },
  };

  return (
    <div
      style={{
        position: 'absolute',
        width: `${size}px`,
        height: `${size}px`,
        opacity,
        pointerEvents: 'none',
        zIndex: 0,
        ...positionStyles[position],
      }}
    >
      {/* Ambient glow */}
      <div style={{
        position: 'absolute', inset: '10%',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(255,153,51,0.15) 0%, rgba(255,102,0,0.05) 40%, transparent 70%)',
        filter: 'blur(40px)',
      }} />

      {/* Stripes container with slow rotation */}
      <div style={{
        position: 'absolute', inset: 0,
        animation: animated ? 'glowRotate 25s linear infinite' : 'none',
      }}>
        {[0, 1, 2, 3, 4, 5, 6].map((i) => {
          const angle = -30 + i * 8;
          const isCenter = i === 3;
          const distFromCenter = Math.abs(i - 3);
          const stripeOpacity = isCenter ? 1 : 0.7 - distFromCenter * 0.15;
          const color = isCenter
            ? 'rgba(255,179,71,0.5)'
            : distFromCenter <= 1
              ? 'rgba(255,153,51,0.35)'
              : 'rgba(204,51,0,0.2)';
          const width = isCenter ? 3 : 2;
          const blur = isCenter ? 12 : 8 - distFromCenter;

          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                top: 0, left: `${42 + i * 2.5}%`,
                width: `${width}px`,
                height: '140%',
                background: `linear-gradient(180deg, transparent 5%, ${color} 30%, ${color} 70%, transparent 95%)`,
                transform: `rotate(${angle}deg)`,
                transformOrigin: '50% 50%',
                filter: `blur(${blur}px)`,
                opacity: stripeOpacity,
              }}
            />
          );
        })}
      </div>

      <style>{`
        @keyframes glowRotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
