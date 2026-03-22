// FILE: app/api/officers/[officer_id]/metrics/route.ts
// PURPOSE: Officer accountability metrics — integrity score, decisions, flags
// DEMO MODE: Returns hardcoded realistic data

import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

interface OfficerDecision {
  tender_id: string;
  action: string;
  risk_score_at_time: number;
  decision: string;
  outcome: string;
  date_ist: string;
}

interface OfficerMetrics {
  officer_id: string;
  name: string;
  ministry: string;
  designation: string;
  joined: string;
  metrics: {
    total_tenders_created: number;
    high_risk_tenders_approved: number;
    ai_overrides: number;
    avg_alert_response_minutes: number;
    fraud_caught_on_their_tenders: number;
    total_value_managed_crore: number;
    risk_score_distribution: { low: number; medium: number; high: number; critical: number };
  };
  recent_decisions: OfficerDecision[];
  integrity_score: number;
  integrity_grade: string;
  flags: string[];
}

const DEMO_OFFICERS: Record<string, OfficerMetrics> = {
  officer_001: {
    officer_id: 'officer_001',
    name: 'Rajesh Kumar Sharma',
    ministry: 'Ministry of Road Transport & Highways',
    designation: 'Deputy Director (Procurement)',
    joined: '2022-04-01',
    metrics: {
      total_tenders_created: 24,
      high_risk_tenders_approved: 3,
      ai_overrides: 2,
      avg_alert_response_minutes: 47,
      fraud_caught_on_their_tenders: 1,
      total_value_managed_crore: 1240,
      risk_score_distribution: { low: 18, medium: 3, high: 2, critical: 1 },
    },
    recent_decisions: [
      {
        tender_id: 'TDR-MoH-2025-000003',
        action: 'AI_OVERRIDE',
        risk_score_at_time: 82,
        decision: 'Approved despite AI warning',
        outcome: 'FRAUD_CONFIRMED',
        date_ist: '2025-03-10T14:32:00+05:30',
      },
      {
        tender_id: 'TDR-MoRTH-2025-000001',
        action: 'TENDER_CREATED',
        risk_score_at_time: 23,
        decision: 'Standard approval',
        outcome: 'CLEAN',
        date_ist: '2025-03-08T10:15:00+05:30',
      },
      {
        tender_id: 'TDR-MoRTH-2025-000007',
        action: 'ALERT_RESPONDED',
        risk_score_at_time: 67,
        decision: 'Escalated to senior officer within 30 min',
        outcome: 'CLEAN',
        date_ist: '2025-02-28T09:45:00+05:30',
      },
      {
        tender_id: 'TDR-MoRTH-2025-000012',
        action: 'AI_OVERRIDE',
        risk_score_at_time: 71,
        decision: 'Proceeded with award — justified via committee review',
        outcome: 'PENDING',
        date_ist: '2025-02-15T16:20:00+05:30',
      },
    ],
    integrity_score: 72,
    integrity_grade: 'B',
    flags: ['OVERRIDE_WITHOUT_JUSTIFICATION', 'FRAUD_ON_APPROVED_TENDER'],
  },
  officer_002: {
    officer_id: 'officer_002',
    name: 'Sunita Devi',
    ministry: 'Ministry of Finance',
    designation: 'Under Secretary',
    joined: '2021-06-15',
    metrics: {
      total_tenders_created: 31,
      high_risk_tenders_approved: 0,
      ai_overrides: 0,
      avg_alert_response_minutes: 12,
      fraud_caught_on_their_tenders: 0,
      total_value_managed_crore: 890,
      risk_score_distribution: { low: 28, medium: 3, high: 0, critical: 0 },
    },
    recent_decisions: [
      {
        tender_id: 'TDR-MoF-2025-000005',
        action: 'TENDER_CREATED',
        risk_score_at_time: 15,
        decision: 'Standard approval',
        outcome: 'CLEAN',
        date_ist: '2025-03-12T11:00:00+05:30',
      },
    ],
    integrity_score: 96,
    integrity_grade: 'A+',
    flags: [],
  },
};

function calculateIntegrityGrade(score: number): string {
  if (score >= 90) return 'A+';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B';
  if (score >= 60) return 'C';
  return 'D';
}

export async function GET(
  req: Request,
  { params }: { params: { officer_id: string } }
) {
  try {
    const officerId = params.officer_id;
    const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

    if (isDemoMode) {
      const data = DEMO_OFFICERS[officerId] || DEMO_OFFICERS['officer_001'];
      return Response.json({ success: true, data });
    }

    // Real mode
    const supabase = getSupabaseAdmin();

    const { data: actions } = await supabase
      .from('officer_actions')
      .select('*')
      .eq('officer_id', officerId)
      .order('created_at', { ascending: false });

    const allActions = actions || [];
    const highRiskApproved = allActions.filter(
      (a) => a.action_type === 'AI_OVERRIDE' || (a.action_type === 'TENDER_APPROVED' && (a.risk_score_at_time ?? 0) >= 70)
    ).length;
    const aiOverrides = allActions.filter((a) => a.action_type === 'AI_OVERRIDE').length;
    const fraudConfirmed = allActions.filter((a) => a.outcome === 'FRAUD_CONFIRMED').length;

    // Calculate integrity score
    let score = 100;
    score -= highRiskApproved * 5;
    score -= aiOverrides * 10;
    score -= fraudConfirmed * 15;
    score = Math.max(0, Math.min(100, score));

    const flags: string[] = [];
    if (aiOverrides > 0) flags.push('AI_OVERRIDE_DETECTED');
    if (fraudConfirmed > 0) flags.push('FRAUD_ON_APPROVED_TENDER');

    const result: OfficerMetrics = {
      officer_id: officerId,
      name: 'Officer',
      ministry: 'Unknown',
      designation: 'Unknown',
      joined: '2023-01-01',
      metrics: {
        total_tenders_created: allActions.filter((a) => a.action_type === 'TENDER_CREATED').length,
        high_risk_tenders_approved: highRiskApproved,
        ai_overrides: aiOverrides,
        avg_alert_response_minutes: 30,
        fraud_caught_on_their_tenders: fraudConfirmed,
        total_value_managed_crore: 0,
        risk_score_distribution: { low: 0, medium: 0, high: 0, critical: 0 },
      },
      recent_decisions: allActions.slice(0, 10).map((a) => ({
        tender_id: a.tender_id,
        action: a.action_type,
        risk_score_at_time: a.risk_score_at_time ?? 0,
        decision: a.justification ?? a.action_type,
        outcome: a.outcome ?? 'PENDING',
        date_ist: a.created_at,
      })),
      integrity_score: score,
      integrity_grade: calculateIntegrityGrade(score),
      flags,
    };

    return Response.json({ success: true, data: result });
  } catch (error) {
    console.error('[OfficerMetrics] Error:', error);
    return Response.json({ success: false, error: 'Failed to fetch metrics' }, { status: 500 });
  }
}
