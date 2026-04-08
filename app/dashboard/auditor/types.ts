// Shared types for auditor dashboard
export interface TenderItem {
  id: string;
  ministry: string;
  title: string;
  value: number;
  bidders: number;
  risk: number;
  status: string;
  officer: string;
  riskLevel: string;
}

export interface AlertItem {
  id: number;
  severity: string;
  icon: string;
  title: string;
  detail: string;
  time: string;
  color: string;
  tenderId: string | null;
}

export interface FlagResult {
  case_number: string;
  blockchain_tx: string;
  storage: string;
}

export interface FlagForm {
  flag_type: string;
  severity: string;
  reason: string;
  evidence_notes: string;
  recommended_action: string;
}

export interface AuditEvent {
  id: string;
  timestamp_ist: string;
  actor_name: string;
  actor_role: string;
  action_type: string;
  tender_id: string | null;
  ministry: string | null;
  severity: string;
  risk_score: number | null;
  details: string;
  blockchain_tx: string | null;
}

export interface InvestigationCase {
  case_number: string;
  tender_id: string;
  title: string;
  ministry: string;
  value: number;
  flagType: string;
  severity: string;
  status: string;
  openedBy: string;
  openedAt: string;
  lastUpdated: string;
  evidence: number;
  txCount: number;
  nextAction: string;
  assigned: string;
}

export interface MinistryRisk {
  ministry: string;
  avgRisk: number;
  tenders: number;
}

export interface StatCard {
  label: string;
  value: number;
  sub: string;
  color: string;
  icon: string;
  pulse?: boolean;
}

export interface RecentAction {
  time: string;
  action: string;
  tx: string;
}
