// ─────────────────────────────────────────────────
// FILE: app/api/notifications/whatsapp/test/route.ts
// TYPE: SERVER API ROUTE
// SECRET KEYS USED: TWILIO_AUTH_TOKEN (via internal call)
// WHAT THIS FILE DOES: Sends a test WhatsApp alert using AIIMS demo data
// ─────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const testData = {
    tender_id: 'TDR-MoH-2025-000003',
    tender_title: 'AIIMS Delhi Medical Equipment Procurement',
    ministry: 'Ministry of Health & Family Welfare',
    value_crore: 120,
    risk_score: 94,
    risk_level: 'CRITICAL',
    top_flags: ['Shell Company (99% confidence)', 'Bid Rigging (97% confidence)', 'Timing Collusion (94% confidence)'],
    tender_url: `${APP_URL}/dashboard/tenders/TDR-MoH-2025-000003`,
  };

  try {
    const res = await fetch(`${APP_URL}/api/notifications/whatsapp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testData),
    });

    const data = await res.json();
    return NextResponse.json({
      ...data,
      test: true,
      message_preview: data.message_preview || data.full_message?.substring(0, 100),
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ sent: false, test: true, error: msg }, { status: 500 });
  }
}
