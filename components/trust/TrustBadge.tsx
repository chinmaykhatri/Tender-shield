'use client';

import { useState } from 'react';

interface TrustBadgeProps {
  score: number;
  grade: string;
  companyName?: string;
  factors?: string[];
  size?: 'sm' | 'md';
}

const BADGE_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  PLATINUM: { bg: 'rgba(234,179,8,0.12)', text: '#eab308', border: 'rgba(234,179,8,0.3)' },
  GOLD: { bg: 'rgba(34,197,94,0.12)', text: '#22c55e', border: 'rgba(34,197,94,0.3)' },
  SILVER: { bg: 'rgba(59,130,246,0.12)', text: '#3b82f6', border: 'rgba(59,130,246,0.3)' },
  BRONZE: { bg: 'rgba(251,191,36,0.12)', text: '#fbbf24', border: 'rgba(251,191,36,0.3)' },
  FLAGGED: { bg: 'rgba(239,68,68,0.12)', text: '#ef4444', border: 'rgba(239,68,68,0.3)' },
};

export default function TrustBadge({ score, grade, companyName, factors, size = 'sm' }: TrustBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const s = BADGE_STYLES[grade] || BADGE_STYLES['SILVER'];
  const isSm = size === 'sm';

  return (
    <div
      style={{ position: 'relative', display: 'inline-flex' }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: isSm ? '4px' : '6px',
          padding: isSm ? '2px 8px' : '4px 12px',
          borderRadius: '8px',
          background: s.bg,
          border: `1px solid ${s.border}`,
          fontSize: isSm ? '10px' : '12px',
          fontWeight: 700,
          color: s.text,
          cursor: factors ? 'help' : 'default',
          animation: grade === 'FLAGGED' ? 'trustPulse 2s infinite' : undefined,
          whiteSpace: 'nowrap',
        }}
      >
        {grade} {score}
      </span>

      {/* Tooltip */}
      {showTooltip && factors && factors.length > 0 && (
        <div
          style={{
            position: 'absolute',
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginBottom: '8px',
            background: '#1a1a2e',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px',
            padding: '14px 16px',
            minWidth: '240px',
            zIndex: 9999,
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
          }}
        >
          {companyName && (
            <p style={{ fontSize: '12px', fontWeight: 600, marginBottom: '8px', color: '#fff' }}>
              {companyName}
            </p>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {factors.map((f, i) => (
              <p key={i} style={{ fontSize: '10px', color: f.includes('-') ? '#f87171' : '#4ade80', margin: 0 }}>
                {f}
              </p>
            ))}
          </div>
          <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
            <span style={{ color: 'rgba(255,255,255,0.4)' }}>Trust Score</span>
            <span style={{ fontWeight: 700, color: s.text }}>{score}/100</span>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes trustPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      `}</style>
    </div>
  );
}
