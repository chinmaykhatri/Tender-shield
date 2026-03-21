// FILE: components/VerificationBadge.tsx
// PURPOSE: Show verification status badge next to any user in TenderShield
// INDIA API: none — reads from verification status
// MOCK MODE: N/A — just UI

'use client';

import { useState } from 'react';

export type BadgeStatus = 'VERIFIED' | 'PENDING' | 'PARTIAL' | 'FLAGGED' | 'REJECTED';

interface VerificationBadgeProps {
  status: BadgeStatus;
  role?: string;
  details?: string[];
  compact?: boolean;
}

const BADGE_CONFIG: Record<BadgeStatus, { icon: string; label: string; bg: string; border: string; color: string }> = {
  VERIFIED: { icon: '✅', label: 'Verified', bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.15)', color: '#4ade80' },
  PENDING: { icon: '⏳', label: 'Pending', bg: 'rgba(251,191,36,0.08)', border: 'rgba(251,191,36,0.15)', color: '#fbbf24' },
  PARTIAL: { icon: '⚠️', label: 'Partial', bg: 'rgba(251,146,60,0.08)', border: 'rgba(251,146,60,0.15)', color: '#fb923c' },
  FLAGGED: { icon: '🚨', label: 'Flagged', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.15)', color: '#f87171' },
  REJECTED: { icon: '❌', label: 'Rejected', bg: 'rgba(107,114,128,0.08)', border: 'rgba(107,114,128,0.15)', color: '#6b7280' },
};

const ROLE_LABELS: Record<string, string> = {
  MINISTRY_OFFICER: 'Ministry Officer',
  SENIOR_OFFICER: 'Senior Officer',
  BIDDER: 'Bidder',
  CAG_AUDITOR: 'CAG Auditor',
  NIC_ADMIN: 'NIC Admin',
};

export default function VerificationBadge({ status, role, details, compact }: VerificationBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const cfg = BADGE_CONFIG[status];

  if (compact) {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: '3px',
        padding: '2px 8px', borderRadius: '4px', fontSize: '10px',
        background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color,
      }}>
        {cfg.icon} {cfg.label}
      </span>
    );
  }

  return (
    <div
      style={{ position: 'relative', display: 'inline-block' }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: '5px',
        padding: '4px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 500,
        background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color,
        cursor: details ? 'help' : 'default',
      }}>
        {cfg.icon} {cfg.label} {role ? ROLE_LABELS[role] || role : ''}
      </span>

      {showTooltip && details && details.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: '0', marginTop: '6px', zIndex: 50,
          padding: '12px 16px', borderRadius: '10px', minWidth: '220px',
          background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        }}>
          {details.map((d, i) => (
            <p key={i} style={{ fontSize: '11px', color: '#aaa', lineHeight: 1.7 }}>{d}</p>
          ))}
          <p style={{ fontSize: '10px', color: '#555', marginTop: '8px', fontStyle: 'italic' }}>
            Verified by TenderShield + Government of India APIs
          </p>
        </div>
      )}
    </div>
  );
}
