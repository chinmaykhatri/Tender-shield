import React from 'react';

// Shared style helpers for auditor dashboard components
export const smBtn = (color: string): React.CSSProperties => ({
  padding: '4px 10px', borderRadius: 6, border: `1px solid ${color}30`, background: `${color}10`, color, fontSize: 10, fontWeight: 600, cursor: 'pointer',
});

export const selStyle: React.CSSProperties = {
  padding: '5px 8px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(30,41,59,0.8)', color: '#e2e8f0', fontSize: 11,
};

export const inpStyle: React.CSSProperties = {
  width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(30,41,59,0.8)', color: '#e2e8f0', fontSize: 12,
};

export const lbl: React.CSSProperties = { display: 'block', fontSize: 11, color: '#94a3b8', fontWeight: 600, marginBottom: 4 };

export const riskColor = (r: number) => r >= 80 ? '#ef4444' : r >= 50 ? '#f59e0b' : r >= 30 ? '#eab308' : '#22c55e';

export const statusBadge = (s: string) => {
  const m: Record<string, { bg: string; color: string; label: string }> = {
    FROZEN: { bg: 'rgba(239,68,68,0.15)', color: '#ef4444', label: '🔒 FROZEN' },
    UNDER_EVAL: { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b', label: '⏳ Under Eval' },
    BIDDING_OPEN: { bg: 'rgba(99,102,241,0.15)', color: '#818cf8', label: '📝 Bidding Open' },
    AWARDED: { bg: 'rgba(34,197,94,0.15)', color: '#22c55e', label: '✅ Awarded' },
  };
  return m[s] || { bg: 'rgba(100,116,139,0.15)', color: '#94a3b8', label: s };
};
