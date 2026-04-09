// ─────────────────────────────────────────────────
// FILE: components/DataSourceBadge.tsx
// TYPE: CLIENT COMPONENT
// SECRET KEYS USED: none
// WHAT THIS FILE DOES: Shows an honest badge indicating the current data source
// ─────────────────────────────────────────────────
'use client';

import { useState } from 'react';

type DataSource = 'supabase' | 'demo' | 'backend_offline' | 'fallback';

interface DataSourceBadgeProps {
  /** Whether the current view is showing real (non-demo) data */
  usingRealData: boolean;
  /** Number of real records loaded */
  recordCount?: number;
  /** Explicit data source override */
  source?: DataSource;
}

const BADGE_CONFIG: Record<DataSource, {
  bg: string; text: string; borderColor: string; dotColor: string;
  label: string; animate: boolean; tooltip: string;
}> = {
  supabase: {
    bg: 'rgba(34,197,94,0.12)', text: '#4ade80', borderColor: 'rgba(34,197,94,0.25)',
    dotColor: '#4ade80', label: 'Live Data', animate: true,
    tooltip: 'Data is live from Supabase. All records are real and verified.',
  },
  demo: {
    bg: 'rgba(234,179,8,0.12)', text: '#facc15', borderColor: 'rgba(234,179,8,0.25)',
    dotColor: '#facc15', label: 'Demo Data', animate: false,
    tooltip: 'Pre-scripted demo data for evaluation. Create a real tender to see live data.',
  },
  backend_offline: {
    bg: 'rgba(249,115,22,0.12)', text: '#fb923c', borderColor: 'rgba(249,115,22,0.25)',
    dotColor: '#fb923c', label: 'Backend Waking', animate: true,
    tooltip: 'The FastAPI backend is waking up from sleep (~30s). Showing cached data.',
  },
  fallback: {
    bg: 'rgba(239,68,68,0.12)', text: '#f87171', borderColor: 'rgba(239,68,68,0.25)',
    dotColor: '#f87171', label: 'Fallback Data', animate: false,
    tooltip: 'Could not reach any data source. Showing hardcoded fallback numbers.',
  },
};

export default function DataSourceBadge({ usingRealData, recordCount, source }: DataSourceBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

  // Determine which badge to show
  let effectiveSource: DataSource;
  if (source) {
    effectiveSource = source;
  } else if (usingRealData) {
    effectiveSource = 'supabase';
  } else if (isDemoMode) {
    effectiveSource = 'demo';
  } else {
    return null; // No badge if not demo mode and no data
  }

  const config = BADGE_CONFIG[effectiveSource];

  return (
    <div className="relative inline-flex items-center">
      <button
        onClick={() => setShowTooltip(!showTooltip)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '4px 10px', borderRadius: 999, fontSize: 11, fontWeight: 500,
          background: config.bg, color: config.text,
          border: `1px solid ${config.borderColor}`,
          cursor: 'pointer', transition: 'all 0.2s',
        }}
      >
        <span
          style={{
            width: 7, height: 7, borderRadius: '50%',
            background: config.dotColor,
            animation: config.animate ? 'pulse 2s infinite' : undefined,
          }}
        />
        {config.label}
        {recordCount !== undefined && recordCount > 0 && (
          <span style={{ opacity: 0.7 }}>({recordCount})</span>
        )}
      </button>
      {showTooltip && (
        <div
          style={{
            position: 'absolute', bottom: '100%', left: 0, marginBottom: 8,
            width: 260, padding: 12, borderRadius: 12,
            background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)', zIndex: 50, textAlign: 'left',
          }}
        >
          <p style={{ fontSize: 11, fontWeight: 600, color: config.text, marginBottom: 4 }}>
            {config.label}
          </p>
          <p style={{ fontSize: 10, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            {config.tooltip}
            {recordCount !== undefined && recordCount > 0 && ` ${recordCount} records loaded.`}
          </p>
        </div>
      )}
    </div>
  );
}
