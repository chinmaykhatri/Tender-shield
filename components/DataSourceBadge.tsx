// ─────────────────────────────────────────────────
// FILE: components/DataSourceBadge.tsx
// TYPE: CLIENT COMPONENT
// SECRET KEYS USED: none
// WHAT THIS FILE DOES: Shows a live/demo badge so users know which data source is active
// ─────────────────────────────────────────────────
'use client';

import { useState } from 'react';

interface DataSourceBadgeProps {
  usingRealData: boolean;
  recordCount?: number;
}

export default function DataSourceBadge({ usingRealData, recordCount }: DataSourceBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

  // If real data is showing → green badge
  if (usingRealData) {
    return (
      <div className="relative inline-flex items-center">
        <button
          onClick={() => setShowTooltip(!showTooltip)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/15 text-green-400 border border-green-500/25 hover:bg-green-500/20 transition-all"
        >
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          Live Data
          {recordCount !== undefined && (
            <span className="text-green-300/70">({recordCount})</span>
          )}
        </button>
        {showTooltip && (
          <div className="absolute bottom-full left-0 mb-2 w-64 p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] shadow-xl z-50 text-left">
            <p className="text-xs font-semibold text-green-400 mb-1">✅ Showing Real Data</p>
            <p className="text-[11px] text-[var(--text-secondary)]">
              Data is live from your Supabase database.
              {recordCount !== undefined && ` ${recordCount} records found.`}
            </p>
          </div>
        )}
      </div>
    );
  }

  // If demo data AND demo mode → yellow badge
  if (isDemoMode) {
    return (
      <div className="relative inline-flex items-center">
        <button
          onClick={() => setShowTooltip(!showTooltip)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-500/15 text-yellow-400 border border-yellow-500/25 hover:bg-yellow-500/20 transition-all"
        >
          <span className="w-2 h-2 rounded-full bg-yellow-400" />
          Demo Data
        </button>
        {showTooltip && (
          <div className="absolute bottom-full left-0 mb-2 w-72 p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] shadow-xl z-50 text-left">
            <p className="text-xs font-semibold text-yellow-400 mb-1">📌 Showing Demo Data</p>
            <p className="text-[11px] text-[var(--text-secondary)] mb-2">
              Your Supabase database is empty. Pre-scripted demo tenders are shown so judges can evaluate the system.
            </p>
            <p className="text-[11px] text-[var(--text-secondary)]">
              Create a real tender and it will appear here instantly, replacing this demo data.
            </p>
          </div>
        )}
      </div>
    );
  }

  // Not demo mode + no data → show nothing (empty state)
  return null;
}
