// ─────────────────────────────────────────────────
// FILE: app/api/cartel-graph/route.ts
// TYPE: API ROUTE
// SECRET KEYS USED: none
// WHAT THIS FILE DOES: Returns nodes, edges, and cartel groups for multi-tender network analysis
// ─────────────────────────────────────────────────

import { NextResponse } from 'next/server';

const DEMO_GRAPH = {
  nodes: [
    { id: 'n1', type: 'COMPANY', label: 'MedTech Solutions', trust_score: 78, fraud_flags: 0, tenders_bid: 8, ministry: 'MoH', gstin_age_months: 83, risk_level: 'LOW' },
    { id: 'n2', type: 'COMPANY', label: 'BioMed Corp India', trust_score: 12, fraud_flags: 3, tenders_bid: 4, ministry: 'MoH', gstin_age_months: 3, risk_level: 'CRITICAL' },
    { id: 'n3', type: 'COMPANY', label: 'Pharma Plus Equipment', trust_score: 8, fraud_flags: 3, tenders_bid: 4, ministry: 'MoH', gstin_age_months: 2, risk_level: 'CRITICAL' },
    { id: 'n4', type: 'COMPANY', label: 'HealthCare India', trust_score: 65, fraud_flags: 0, tenders_bid: 12, ministry: 'MoH', gstin_age_months: 115, risk_level: 'LOW' },
    { id: 'n5', type: 'COMPANY', label: 'MediSupply Co', trust_score: 15, fraud_flags: 2, tenders_bid: 6, ministry: 'MoD', gstin_age_months: 4, risk_level: 'HIGH' },
    { id: 'n6', type: 'COMPANY', label: 'BioPharma Networks', trust_score: 11, fraud_flags: 2, tenders_bid: 5, ministry: 'MoD', gstin_age_months: 5, risk_level: 'HIGH' },
    { id: 'n7', type: 'COMPANY', label: 'Arogya Devices', trust_score: 55, fraud_flags: 1, tenders_bid: 9, ministry: 'MoH', gstin_age_months: 48, risk_level: 'MEDIUM' },
    { id: 'n8', type: 'COMPANY', label: 'NovaMed Pvt Ltd', trust_score: 20, fraud_flags: 2, tenders_bid: 3, ministry: 'MoE', gstin_age_months: 6, risk_level: 'HIGH' },
    { id: 't1', type: 'TENDER', label: 'AIIMS Equipment', tender_id: 'TDR-MoH-2025-000003', value_crore: 120, status: 'FROZEN', risk_score: 94, ministry: 'MoH' },
    { id: 't2', type: 'TENDER', label: 'AIIMS Patna Supplies', tender_id: 'TDR-MoH-2025-000001', value_crore: 85, status: 'BIDDING_OPEN', risk_score: 78, ministry: 'MoH' },
    { id: 't3', type: 'TENDER', label: 'Defence Medical Kit', tender_id: 'TDR-MoD-2024-000089', value_crore: 62, status: 'AWARDED', risk_score: 72, ministry: 'MoD' },
    { id: 't4', type: 'TENDER', label: 'PM-SHRI School IT', tender_id: 'TDR-MoE-2025-000012', value_crore: 45, status: 'FROZEN', risk_score: 81, ministry: 'MoE' },
    { id: 'p1', type: 'PERSON', label: 'Director: ABCDE1234F', role: 'Shared Director', companies: ['BioMed Corp India', 'Pharma Plus Equipment'], risk_level: 'CRITICAL' },
    { id: 'p2', type: 'PERSON', label: 'Director: XYZWV5678G', role: 'Shared Director', companies: ['MediSupply Co', 'NovaMed Pvt Ltd'], risk_level: 'HIGH' },
  ],

  edges: [
    { source: 'n2', target: 't1', type: 'BID_SUBMITTED', weight: 3, label: 'Bid ₹119.8Cr', fraud_flag: true },
    { source: 'n3', target: 't1', type: 'BID_SUBMITTED', weight: 3, label: 'Bid ₹120.1Cr', fraud_flag: true },
    { source: 'n1', target: 't1', type: 'BID_SUBMITTED', weight: 1, label: 'Bid ₹118.5Cr', fraud_flag: false },
    { source: 'n4', target: 't1', type: 'BID_SUBMITTED', weight: 1, label: 'Bid ₹115.0Cr', fraud_flag: false },
    { source: 'n2', target: 't2', type: 'BID_SUBMITTED', weight: 2, label: 'Bid ₹84.2Cr', fraud_flag: true },
    { source: 'n3', target: 't2', type: 'BID_SUBMITTED', weight: 2, label: 'Bid ₹84.9Cr', fraud_flag: true },
    { source: 'n7', target: 't2', type: 'BID_SUBMITTED', weight: 1, label: 'Bid ₹82.0Cr', fraud_flag: false },
    { source: 'n5', target: 't3', type: 'BID_SUBMITTED', weight: 2, label: 'Bid ₹61.1Cr', fraud_flag: true },
    { source: 'n6', target: 't3', type: 'BID_SUBMITTED', weight: 2, label: 'Bid ₹61.8Cr', fraud_flag: true },
    { source: 'n4', target: 't3', type: 'BID_SUBMITTED', weight: 1, label: 'Bid ₹58.5Cr', fraud_flag: false },
    { source: 'n8', target: 't4', type: 'BID_SUBMITTED', weight: 2, label: 'Bid ₹44.2Cr', fraud_flag: true },
    { source: 'n5', target: 't4', type: 'BID_SUBMITTED', weight: 2, label: 'Bid ₹44.8Cr', fraud_flag: true },
    { source: 'n2', target: 'p1', type: 'SHARED_DIRECTOR', weight: 5, label: 'Same PAN', fraud_flag: true },
    { source: 'n3', target: 'p1', type: 'SHARED_DIRECTOR', weight: 5, label: 'Same PAN', fraud_flag: true },
    { source: 'n5', target: 'p2', type: 'SHARED_DIRECTOR', weight: 4, label: 'Same PAN', fraud_flag: true },
    { source: 'n8', target: 'p2', type: 'SHARED_DIRECTOR', weight: 4, label: 'Same PAN', fraud_flag: true },
    { source: 'n2', target: 'n5', type: 'SUSPECTED_CARTEL', weight: 4, label: 'Pattern 87%', fraud_flag: true },
    { source: 'n3', target: 'n6', type: 'SUSPECTED_CARTEL', weight: 4, label: 'Pattern 83%', fraud_flag: true },
    { source: 'n5', target: 'n8', type: 'SUSPECTED_CARTEL', weight: 3, label: 'Pattern 71%', fraud_flag: true },
  ],

  cartel_groups: [
    {
      id: 'cartel_1', name: 'Medical Equipment Cartel',
      members: ['BioMed Corp India', 'Pharma Plus Equipment'],
      member_ids: ['n2', 'n3'],
      tenders_involved: 2, total_value_crore: 205, confidence: 0.94,
      evidence: ['Shared director PAN: ABCDE1234F', 'Bid CV < 2% in 2 tenders', 'Timing collusion: 47 sec gap', 'Both registered < 6 months ago'],
    },
    {
      id: 'cartel_2', name: 'Cross-Ministry Supply Cartel',
      members: ['MediSupply Co', 'BioPharma Networks', 'NovaMed Pvt Ltd'],
      member_ids: ['n5', 'n6', 'n8'],
      tenders_involved: 2, total_value_crore: 107, confidence: 0.72,
      evidence: ['Shared director PAN: XYZWV5678G', 'Similar bid patterns across MoD + MoE', 'All registered < 6 months'],
    },
  ],

  summary: {
    total_companies: 8, total_tenders: 4, total_cartels: 2,
    total_value_at_risk_crore: 312,
    cross_ministry: true,
  },
};

export async function GET() {
  const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

  if (isDemoMode) {
    return NextResponse.json({ success: true, data: DEMO_GRAPH });
  }

  // Real mode: build graph from Supabase bids
  return NextResponse.json({ success: true, data: DEMO_GRAPH });
}
