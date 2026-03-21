'use client';

import { useMode } from '@/hooks/useMode';

export default function ModeBanner() {
  const { isDemoMode, modeIcon, modeColor, modeBg } = useMode();

  return (
    <div
      className="fixed top-1 left-0 right-0 z-40 text-center py-1.5 text-xs font-medium tracking-wide"
      style={{ backgroundColor: modeBg, color: modeColor, borderBottom: `1px solid ${modeColor}30` }}
    >
      {isDemoMode ? (
        <span>{modeIcon} <strong>DEMO MODE</strong> — Showing pre-scripted competition data for judges</span>
      ) : (
        <span>{modeIcon} <strong>LIVE MODE</strong> — Connected to real Supabase database</span>
      )}
    </div>
  );
}
