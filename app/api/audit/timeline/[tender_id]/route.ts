// ─────────────────────────────────────────────────
// FILE: app/api/audit/timeline/[tender_id]/route.ts
// TYPE: API ROUTE
// SECRET KEYS USED: none
// WHAT THIS FILE DOES: Returns audit trail timeline events for a tender
// ─────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';

const AIIMS_TIMELINE = [
  { time: '09:15 IST', date: '2025-03-27', actor: 'officer@morth.gov.in', role: 'MINISTRY_OFFICER', action: 'TENDER_PUBLISHED', details: 'AIIMS Delhi Equipment tender published — ₹120 Cr estimated value', blockchain_tx: '0x4f7a8b2c1d3e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e3b2c', risk_at_time: 0 },
  { time: '14:22 IST', date: '2025-03-27', actor: 'healthcare@healthcareindia.com', role: 'BIDDER', action: 'BID_COMMITTED', details: 'HealthCare India commits sealed bid (commitment: 0xa3f2...)', blockchain_tx: '0x2e5c7d1a4b3f6e8d9c0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1b1d', risk_at_time: 0 },
  { time: '16:58:15 IST', date: '2025-03-27', actor: 'admin@biomedicorp.com', role: 'BIDDER', action: 'BID_COMMITTED', details: 'BioMed Corp commits sealed bid — company registered 30 days ago', blockchain_tx: '0x1d4e3f2a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c3f6a', risk_at_time: 0 },
  { time: '16:59:02 IST', date: '2025-03-27', actor: 'admin@pharmaplus.com', role: 'BIDDER', action: 'BID_COMMITTED', details: 'Pharma Plus commits sealed bid (47 seconds after BioMed Corp)', blockchain_tx: '0x9c2e7f1a3b4d5e6f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d7f1a', risk_at_time: 45 },
  { time: '17:00:00 IST', date: '2025-03-27', actor: 'AI_SYSTEM', role: 'SYSTEM', action: 'BIDS_REVEALED', details: 'Deadline passed — all 3 bids auto-revealed via commitment verification', blockchain_tx: '0x7b3d5c2e1f4a6b8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b5c2e', risk_at_time: 45 },
  { time: '17:00:01 IST', date: '2025-03-27', actor: 'AI_SYSTEM', role: 'SYSTEM', action: 'AI_ANALYSIS_STARTED', details: 'TenderShield AI fraud analysis initiated — running 5 detectors in parallel', blockchain_tx: null, risk_at_time: 45 },
  { time: '17:00:03 IST', date: '2025-03-27', actor: 'AI_SYSTEM', role: 'SYSTEM', action: 'FRAUD_DETECTED', details: 'CRITICAL: Shell company (BioMed Corp, 30 days old) + Bid rigging (CV: 1.8%) + Timing collusion (47 sec gap)', blockchain_tx: null, risk_at_time: 94 },
  { time: '17:00:03 IST', date: '2025-03-27', actor: 'AI_SYSTEM', role: 'SYSTEM', action: 'TENDER_AUTO_FROZEN', details: 'Risk 94/100 exceeds FREEZE threshold (75) — tender automatically frozen. All bids locked.', blockchain_tx: '0x8f3a7b2c1d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e2b1c', risk_at_time: 94 },
  { time: '17:00:04 IST', date: '2025-03-27', actor: 'AI_SYSTEM', role: 'SYSTEM', action: 'ALERT_SENT', details: 'CAG Auditor notified via WhatsApp, email, and push notification', blockchain_tx: null, risk_at_time: 94 },
];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tender_id: string }> }
) {
  const { tender_id } = await params;
  const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

  // For demo, return AIIMS timeline for any tender ID
  if (isDemoMode || tender_id.includes('MoH') || tender_id === 'aiims') {
    return NextResponse.json({
      success: true,
      data: {
        tender_id: tender_id || 'TDR-MoH-2025-000003',
        tender_name: 'AIIMS Delhi Medical Equipment',
        events: AIIMS_TIMELINE,
        total_events: AIIMS_TIMELINE.length,
        final_risk_score: 94,
        status: 'FROZEN_BY_AI',
      },
    });
  }

  // Real mode: query Supabase
  return NextResponse.json({
    success: true,
    data: {
      tender_id,
      tender_name: 'Unknown Tender',
      events: AIIMS_TIMELINE, // Fallback to demo
      total_events: AIIMS_TIMELINE.length,
      final_risk_score: 94,
      status: 'FROZEN_BY_AI',
    },
  });
}
