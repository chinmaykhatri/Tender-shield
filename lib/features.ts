// ─────────────────────────────────────────────────
// FILE: lib/features.ts
// TYPE: SHARED LIB — Feature visibility flags
// PURPOSE: Controls which pages are visible in navigation
// Set NEXT_PUBLIC_HIDE_INCOMPLETE=true to hide unfinished pages
// ─────────────────────────────────────────────────

const HIDE = process.env.NEXT_PUBLIC_HIDE_INCOMPLETE === 'true';

/**
 * Feature visibility flags.
 * Pages marked `false` are hidden from navigation but remain in the codebase.
 * Set NEXT_PUBLIC_HIDE_INCOMPLETE=true in production to show only complete pages.
 */
export const FEATURES = {
  // COMPLETE — always visible (these 10 pages must be flawless)
  DASHBOARD: true,
  TENDERS: true,
  CREATE_TENDER: true,
  PROCUREMENT: true,
  ZKP_BIDS: true,
  BLOCKCHAIN: true,
  AI_MONITOR: true,
  AUDITOR: true,
  ARCHITECTURE: true,
  DEMO: true,

  // INCOMPLETE — hidden when HIDE_INCOMPLETE=true
  ML_MODEL: !HIDE,
  AI_ALERTS: !HIDE,
  AUDIT_TRAIL: !HIDE,
  JUDGE_TOUR: !HIDE,
  ADMIN: !HIDE,
  WHISTLEBLOWER: !HIDE,
  HEATMAP: !HIDE,
  IDENTITY_VERIFICATION: !HIDE,
  FINANCIAL_TRAIL: !HIDE,
  POLICY_PAGE: !HIDE,
  ROADMAP: !HIDE,
  OFFICERS: !HIDE,
  SETTINGS: !HIDE,
  IMPACT: !HIDE,
  MINISTRY_SCORES: !HIDE,
  PRACTICE: !HIDE,

  // ADVANCED FEATURES — always visible
  NETWORK_GRAPH: true,
  ANOMALY_DETECTION: true,
  PAILLIER_DEMO: true,
  FEDERATED_LEARNING: true,
  AI_CHAT: true,
  IMPACT_METRICS: true,
} as const;

export type FeatureKey = keyof typeof FEATURES;

/**
 * Check if a feature is enabled.
 */
export function isVisible(feature: FeatureKey): boolean {
  return FEATURES[feature] ?? false;
}
