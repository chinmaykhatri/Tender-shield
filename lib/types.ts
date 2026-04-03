/**
 * ============================================================================
 * TenderShield — Core Type Definitions
 * ============================================================================
 * Central type definitions for the entire frontend.
 * All components, hooks, and data layers import types from here.
 * ============================================================================
 */

// ─────────────────────────────────────────
// TENDER
// ─────────────────────────────────────────

export type TenderStatus =
  | 'DRAFT'
  | 'PUBLISHED'
  | 'BIDDING_OPEN'
  | 'UNDER_EVALUATION'
  | 'AWARDED'
  | 'FROZEN_BY_AI'
  | 'CANCELLED';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type TenderCategory = 'WORKS' | 'GOODS' | 'SERVICES';

export interface Tender {
  id: string;
  title: string;
  ministry: string;
  ministry_code: string;
  department: string;
  category: TenderCategory | string;
  description: string;
  estimated_value_crore: number;
  estimated_value_display: string;
  status: TenderStatus | string;
  bids_count: number;
  deadline: string;
  deadline_display: string;
  risk_score: number;
  risk_level: RiskLevel | string;
  gem_category: string;
  gem_id: string;
  gfr_reference: string;
  bid_security_crore: number;
  blockchain_tx: string;
  block_number: number;
  created_by: string;
  created_at: string;
  compliance_status: string;
  ai_flags: string[];
  ai_alert: AIAlert | null | unknown;
  bids: Bid[];
  // Optional fields for specific statuses
  winner?: string;
  winner_bid_crore?: number;
  winner_bid_display?: string;
  freeze_reason?: string;
  freeze_tx?: string;
  frozen_at?: string;
  // Shell company fields on bids
  shell_company?: boolean;
  shell_evidence?: string;
  incorporated_months_ago?: number;
}

// ─────────────────────────────────────────
// BID
// ─────────────────────────────────────────

export interface Bid {
  bid_id: string;
  bidder_name: string;
  bidder_did: string;
  gstin: string;
  commitment_hash: string;
  revealed_amount_crore: number;
  revealed_amount_display: string;
  submitted_at: string;
  status: string;
  zkp_verified: boolean;
  ai_risk: number;
  is_winner_candidate?: boolean;
  shell_company?: boolean;
  shell_evidence?: string;
  incorporated_months_ago?: number;
}

// ─────────────────────────────────────────
// AI ALERT
// ─────────────────────────────────────────

export interface AIAlertFlag {
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  evidence: string;
  confidence: number;
}

export interface AIAlert {
  alert_id: string;
  risk_score: number;
  risk_level: RiskLevel | string;
  confidence: number;
  detected_at?: string;
  detection_time_seconds?: number;
  estimated_fraud_value_crore?: number;
  recommended_action: string;
  auto_frozen: boolean;
  flags: AIAlertFlag[];
}

// ─────────────────────────────────────────
// DASHBOARD
// ─────────────────────────────────────────

export interface MinistryBreakdown {
  ministry: string;
  value_crore: number;
  count: number;
  color: string;
}

export interface RiskDistribution {
  level: string;
  count: number;
  color: string;
}

export interface DashboardStats {
  total_active_tenders: number;
  total_tender_value_crore: number;
  bids_received_today: number;
  ai_alerts_active: number;
  critical_alerts: number;
  blockchain_tx_total: number;
  blockchain_tx_today: number;
  fraud_prevented_value_crore: number;
  tenders_frozen: number;
  tenders_awarded_this_month: number;
  avg_risk_score: number;
  network_health: string;
  last_block: number;
  peers_online: number;
  orgs_online: number;
  tps: number;
  ministry_breakdown: MinistryBreakdown[];
  risk_distribution: RiskDistribution[];
  using_real_data?: boolean;
}

// ─────────────────────────────────────────
// BLOCKCHAIN
// ─────────────────────────────────────────

export interface BlockchainEvent {
  tx: string;
  event: string;
  ministry: string;
  amount: string;
  time: string;
  block: number;
  type: 'danger' | 'success' | 'info' | 'warning' | string;
}

export interface AuditTrailEntry {
  action: string;
  actor: string;
  actor_role: string;
  timestamp: string;
  blockchain_tx: string;
  block: number;
  highlight?: boolean;
  highlight_reason?: string;
}

// ─────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────

export interface User {
  did: string;
  role: string;
  org: string;
  name: string;
}

export type AuthMethod = 'demo' | 'supabase';
