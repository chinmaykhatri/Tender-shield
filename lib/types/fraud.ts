// FILE: lib/types/fraud.ts
// SECURITY: CLIENT SAFE — type definitions only, no secrets
// API KEYS USED: none
// PURPOSE: Centralized TypeScript types for all fraud analysis data shapes

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type RecommendedAction =
  | 'MONITOR'
  | 'FLAG'
  | 'FREEZE'
  | 'ESCALATE_CAG'
  | 'REFER_CBI';

export type FraudFlagType =
  | 'BID_RIGGING'
  | 'SHELL_COMPANY'
  | 'TIMING_COLLUSION'
  | 'FRONT_RUNNING'
  | 'CARTEL'
  | 'PRICE_DEVIATION'
  | 'REPEATED_BIDDER';

export interface FraudFlag {
  type: FraudFlagType;
  severity: RiskLevel;
  confidence: number;        // 0.0 to 1.0
  evidence: string;          // specific numbers and facts
  plain_english: string;     // simple explanation for non-technical auditors
}

export interface FraudAnalysis {
  risk_score: number;               // integer 0 to 100
  risk_level: RiskLevel;
  confidence: number;               // 0.0 to 1.0
  detection_time_seconds: number;
  auto_freeze: boolean;
  recommended_action: RecommendedAction;
  summary: string;                  // max 100 characters
  flags: FraudFlag[];
  investigation_notes: string;
}

export interface BidData {
  company: string;
  amount_crore: number;
  submitted_at: string;             // ISO 8601 with IST offset
  gstin: string;
}

export interface TenderData {
  tender_id: string;
  title: string;
  ministry: string;
  value_crore: number;
  bids: BidData[];
}

// ─── Safe defaults used when analysis fails ───────────────────────────────
export const FALLBACK_ANALYSIS: FraudAnalysis = {
  risk_score: 0,
  risk_level: 'LOW',
  confidence: 0,
  detection_time_seconds: 0,
  auto_freeze: false,
  recommended_action: 'MONITOR',
  summary: 'Analysis unavailable — manual review recommended',
  flags: [],
  investigation_notes:
    'Automated analysis could not complete. Please assign a human auditor for manual review.',
};

// ─── Risk level metadata ────────────────────────────────────────────────────
export const RISK_CONFIG: Record<RiskLevel, { color: string; bg: string; label: string; emoji: string }> = {
  LOW:      { color: '#22c55e', bg: 'rgba(34,197,94,0.1)',   label: 'Low Risk',      emoji: '🟢' },
  MEDIUM:   { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  label: 'Medium Risk',   emoji: '🟡' },
  HIGH:     { color: '#f97316', bg: 'rgba(249,115,22,0.1)',  label: 'High Risk',     emoji: '🟠' },
  CRITICAL: { color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   label: 'Critical Risk', emoji: '🔴' },
};

export const ACTION_CONFIG: Record<RecommendedAction, { label: string; color: string }> = {
  MONITOR:      { label: 'Monitor',         color: '#22c55e' },
  FLAG:         { label: 'Flag for Review', color: '#f59e0b' },
  FREEZE:       { label: 'Freeze Tender',   color: '#f97316' },
  ESCALATE_CAG: { label: 'Escalate to CAG', color: '#ef4444' },
  REFER_CBI:    { label: 'Refer to CBI',    color: '#dc2626' },
};
