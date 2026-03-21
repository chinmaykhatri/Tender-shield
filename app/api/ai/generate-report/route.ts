// ─────────────────────────────────────────────────
// FILE: app/api/ai/generate-report/route.ts
// TYPE: SERVER API ROUTE
// SECRET KEYS USED: ANTHROPIC_API_KEY
// WHAT THIS FILE DOES: Generates CAG audit investigation report content via Claude AI
// ─────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { CAG_REPORT_PROMPT } from '@/lib/aiPrompts';
import { TENDERSHIELD_CONSTITUTION } from '@/lib/ai/constitution';

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;

const DEMO_REPORT = {
  cover: {
    title: 'SPECIAL AUDIT REPORT — CONFIDENTIAL',
    report_number: 'CAG-AI-2025-000042',
    tender_id: 'TDR-MoH-2025-000003',
    tender_title: 'AIIMS Delhi Medical Equipment Procurement',
    ministry: 'Ministry of Health & Family Welfare',
    date_ist: new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' }),
  },
  executive_summary: `This report presents findings of AI-assisted audit of tender TDR-MoH-2025-000003 for procurement of advanced medical diagnostic equipment at AIIMS New Delhi, estimated at ₹120 Crore.

The TenderShield AI Monitoring System detected CRITICAL fraud patterns with a composite risk score of 94/100. The tender has been automatically frozen pending investigation.

Key findings indicate involvement of shell companies, evidence of bid rigging among 3 bidders, and timing anomalies suggesting coordinated submission. Estimated fraud value is ₹118.5 Crore.

Recommended actions: (1) Refer to CBI for criminal investigation under IT Act 2000, (2) Blacklist identified companies, (3) Cancel and re-tender with enhanced oversight.`,
  evidence: [
    { type: 'Shell Company', confidence: 99, detail: 'MedEquip Traders Pvt Ltd registered 3 months before tender publication. GSTIN 07AABCM1234A1ZK shows mismatch. Company has zero employees and no office address. Director PAN ABCDE1234F matches Director of previously blacklisted firm HealthTech India Pvt Ltd.' },
    { type: 'Bid Rigging', confidence: 97, detail: 'Three bidders submitted bids within ₹0.5 Crore of each other: MedEquip (₹118.5Cr), BioMed Corp (₹119.0Cr), Pharma Plus (₹119.2Cr). Statistical analysis using Benford\'s Law shows P-value < 0.001 for first-digit distribution, indicating manufactured amounts. All three companies share the same registered address at 42 Nehru Place, New Delhi.' },
    { type: 'Timing Collusion', confidence: 94, detail: 'All three flagged bids were submitted between 23:47 and 23:52 IST on the deadline date, within a 5-minute window. IP analysis shows submissions originated from the same /24 subnet (103.21.244.x). This pattern has P-value < 0.0001 for random occurrence.' },
  ],
  blockchain_proof: [
    { block: 1337, tx_hash: '0x2e5c8a1d3f7b4e9c1a2b3c4d5e6f7a8b9c0d1e2f', timestamp: '17:03:42 IST, March 8, 2025', action: 'TENDER_CREATED', status: '✓ Verified' },
    { block: 1338, tx_hash: '0x9f8e7d6c5b4a3928172e6d5c4b3a2918f7e6d5c4', timestamp: '23:47:12 IST, March 10, 2025', action: 'BID_SUBMITTED', status: '✓ Verified' },
    { block: 1339, tx_hash: '0xa1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0', timestamp: '17:03:45 IST, March 11, 2025', action: 'AI_FRAUD_DETECTED', status: '✓ Verified' },
    { block: 1340, tx_hash: '0xf1e2d3c4b5a69877665544332211ffeeddccbbaa', timestamp: '17:03:46 IST, March 11, 2025', action: 'TENDER_FROZEN', status: '✓ Verified' },
  ],
  recommendations: [
    'IMMEDIATE: Refer case to Central Bureau of Investigation (CBI) under Prevention of Corruption Act, 1988',
    'IMMEDIATE: Blacklist MedEquip Traders Pvt Ltd, BioMed Corp, and Pharma Plus from all government procurement for 5 years',
    'IMMEDIATE: Cancel tender TDR-MoH-2025-000003 and initiate re-tendering process',
    'GFR 2017: Violation of Rule 144 (minimum 21-day bid window), Rule 149 (fair competition clause), Rule 173 (transparency)',
    'CVC GUIDELINES: Report to Chief Vigilance Commissioner under Circular No. 03/01/2012',
    'IT ACT 2000: Potential violation of Section 66 (computer-related offences) for coordinated bid submission',
    'RECOMMENDED: Enhanced AI monitoring for all MoH tenders above ₹50 Crore for 12 months',
  ],
  technical_appendix: {
    ai_model: 'TenderShield Fraud Detection Engine v2.1',
    detectors_used: ['Bid Rigging Detector (weight: 30%)', 'Shell Company Detector (weight: 20%)', 'Timing Anomaly Detector (weight: 10%)', 'Collusion Graph Detector (weight: 25%)', 'Cartel Rotation Detector (weight: 15%)'],
    composite_score: 94,
    processing_time_ms: 3200,
    false_positive_rate: '< 2.1%',
  },
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tender_id } = body;

    if (!ANTHROPIC_KEY || ANTHROPIC_KEY === 'REPLACE_THIS') {
      return NextResponse.json({ ...DEMO_REPORT, demo: true });
    }

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': ANTHROPIC_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514', max_tokens: 4096,
        system: TENDERSHIELD_CONSTITUTION + '\n\n' + CAG_REPORT_PROMPT,
        messages: [{ role: 'user', content: `Generate CAG audit report for tender: ${tender_id || 'TDR-MoH-2025-000003'}. Use the AIIMS medical equipment tender data with risk score 94, shell company flags, bid rigging evidence.` }],
      }),
    });

    const data = await res.json();
    const parsed = JSON.parse(data.content?.[0]?.text || '{}');
    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json({ ...DEMO_REPORT, demo: true });
  }
}
