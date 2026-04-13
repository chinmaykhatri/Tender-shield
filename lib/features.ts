// ─────────────────────────────────────────────────
// FILE: lib/features.ts
// TYPE: SHARED LIB — Feature visibility flags
// PURPOSE: Controls which pages are visible in navigation
// All working features are NOW set to true (always visible)
// ─────────────────────────────────────────────────

/**
 * Feature visibility flags.
 * ALL working features are set to `true` — no more hidden pages.
 * Only truly broken/placeholder pages stay false.
 */
export const FEATURES = {
  // ── CORE PAGES (always visible) ──
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

  // ── PREVIOUSLY HIDDEN — NOW VISIBLE ──
  ML_MODEL: true,
  AI_ALERTS: true,
  AUDIT_TRAIL: true,
  JUDGE_TOUR: true,
  ADMIN: true,
  WHISTLEBLOWER: true,
  HEATMAP: true,
  IDENTITY_VERIFICATION: true,
  FINANCIAL_TRAIL: true,
  POLICY_PAGE: true,
  ROADMAP: true,
  OFFICERS: true,
  SETTINGS: true,
  IMPACT: true,
  MINISTRY_SCORES: true,
  PRACTICE: true,

  // ── ADVANCED FEATURES ──
  NETWORK_GRAPH: true,
  ANOMALY_DETECTION: true,
  PAILLIER_DEMO: true,
  FEDERATED_LEARNING: true,
  AI_CHAT: true,
  IMPACT_METRICS: true,
  RTI_PORTAL: true,

  // ── NEW: IMMORTALITY FEATURES ──
  PLAYGROUND: true,
  COMPLIANCE: true,
  CAG_NATIONAL_DASHBOARD: true,

  // ── PUBLIC PAGES (no sidebar, accessible via URL) ──
  PITCH: true,
  TRANSPARENCY: true,
  SCAN: true,
  VERIFY: true,
} as const;

export type FeatureKey = keyof typeof FEATURES;

/**
 * Check if a feature is enabled.
 */
export function isVisible(feature: FeatureKey): boolean {
  return FEATURES[feature] ?? false;
}
