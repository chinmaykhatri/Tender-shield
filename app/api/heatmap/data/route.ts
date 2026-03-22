// ─────────────────────────────────────────────────
// FILE: app/api/heatmap/data/route.ts
// TYPE: API ROUTE
// SECRET KEYS USED: none
// WHAT THIS FILE DOES: Returns state-wise procurement risk data for India heatmap
// ─────────────────────────────────────────────────

import { NextResponse } from 'next/server';

const DEMO_STATES = [
  { state: 'Uttar Pradesh', code: 'UP', fraud_cases: 12, risk_score: 78, value_crore: 450, tenders: 34 },
  { state: 'Maharashtra', code: 'MH', fraud_cases: 8, risk_score: 65, value_crore: 820, tenders: 52 },
  { state: 'Rajasthan', code: 'RJ', fraud_cases: 7, risk_score: 61, value_crore: 190, tenders: 18 },
  { state: 'Bihar', code: 'BR', fraud_cases: 11, risk_score: 74, value_crore: 320, tenders: 22 },
  { state: 'Delhi', code: 'DL', fraud_cases: 5, risk_score: 55, value_crore: 520, tenders: 41 },
  { state: 'Gujarat', code: 'GJ', fraud_cases: 3, risk_score: 42, value_crore: 380, tenders: 28 },
  { state: 'Tamil Nadu', code: 'TN', fraud_cases: 4, risk_score: 38, value_crore: 290, tenders: 31 },
  { state: 'Karnataka', code: 'KA', fraud_cases: 6, risk_score: 52, value_crore: 410, tenders: 36 },
  { state: 'West Bengal', code: 'WB', fraud_cases: 9, risk_score: 71, value_crore: 180, tenders: 15 },
  { state: 'Madhya Pradesh', code: 'MP', fraud_cases: 10, risk_score: 72, value_crore: 240, tenders: 20 },
  { state: 'Telangana', code: 'TS', fraud_cases: 3, risk_score: 35, value_crore: 310, tenders: 25 },
  { state: 'Andhra Pradesh', code: 'AP', fraud_cases: 5, risk_score: 48, value_crore: 220, tenders: 19 },
  { state: 'Kerala', code: 'KL', fraud_cases: 2, risk_score: 28, value_crore: 150, tenders: 16 },
  { state: 'Punjab', code: 'PB', fraud_cases: 6, risk_score: 58, value_crore: 170, tenders: 14 },
  { state: 'Haryana', code: 'HR', fraud_cases: 7, risk_score: 63, value_crore: 200, tenders: 17 },
  { state: 'Odisha', code: 'OR', fraud_cases: 4, risk_score: 45, value_crore: 130, tenders: 12 },
  { state: 'Jharkhand', code: 'JH', fraud_cases: 8, risk_score: 68, value_crore: 160, tenders: 13 },
  { state: 'Chhattisgarh', code: 'CG', fraud_cases: 6, risk_score: 59, value_crore: 140, tenders: 11 },
  { state: 'Assam', code: 'AS', fraud_cases: 5, risk_score: 53, value_crore: 110, tenders: 10 },
  { state: 'Uttarakhand', code: 'UK', fraud_cases: 3, risk_score: 41, value_crore: 90, tenders: 8 },
  { state: 'Himachal Pradesh', code: 'HP', fraud_cases: 2, risk_score: 32, value_crore: 70, tenders: 7 },
  { state: 'Goa', code: 'GA', fraud_cases: 1, risk_score: 22, value_crore: 45, tenders: 5 },
  { state: 'Tripura', code: 'TR', fraud_cases: 2, risk_score: 38, value_crore: 35, tenders: 4 },
  { state: 'Meghalaya', code: 'ML', fraud_cases: 1, risk_score: 30, value_crore: 25, tenders: 3 },
  { state: 'Manipur', code: 'MN', fraud_cases: 2, risk_score: 44, value_crore: 30, tenders: 3 },
  { state: 'Nagaland', code: 'NL', fraud_cases: 1, risk_score: 35, value_crore: 20, tenders: 2 },
  { state: 'Arunachal Pradesh', code: 'AR', fraud_cases: 1, risk_score: 33, value_crore: 18, tenders: 2 },
  { state: 'Sikkim', code: 'SK', fraud_cases: 0, risk_score: 15, value_crore: 12, tenders: 2 },
];

const MINISTRY_BREAKDOWN = [
  { ministry: 'Ministry of Health', fraud_cases: 18, risk_score: 72 },
  { ministry: 'Ministry of Road Transport', fraud_cases: 15, risk_score: 65 },
  { ministry: 'Ministry of Education', fraud_cases: 12, risk_score: 48 },
  { ministry: 'Ministry of Defence', fraud_cases: 10, risk_score: 58 },
  { ministry: 'Ministry of Urban Dev', fraud_cases: 8, risk_score: 52 },
  { ministry: 'Ministry of Railways', fraud_cases: 7, risk_score: 45 },
  { ministry: 'Ministry of Finance', fraud_cases: 4, risk_score: 32 },
  { ministry: 'Ministry of Agriculture', fraud_cases: 3, risk_score: 28 },
];

export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      states: DEMO_STATES,
      ministry_breakdown: MINISTRY_BREAKDOWN,
      total_fraud_cases: DEMO_STATES.reduce((a, s) => a + s.fraud_cases, 0),
      total_value_crore: DEMO_STATES.reduce((a, s) => a + s.value_crore, 0),
      total_tenders: DEMO_STATES.reduce((a, s) => a + s.tenders, 0),
    },
  });
}
