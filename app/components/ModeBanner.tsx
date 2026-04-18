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
        <span>{modeIcon} <strong>DEMO MODE</strong> — TenderShield · SHA-256 Integrity Chain + Supabase + AI Fraud Detection</span>
      ) : (
        <span>{modeIcon} <strong>LIVE PRODUCTION</strong> — SHA-256 Hash Chain Audit + Supabase RLS</span>
      )}
    </div>
  );
}
