// ─────────────────────────────────────────────────
// FILE: app/api/notifications/push/route.ts
// TYPE: SERVER API ROUTE
// SECRET KEYS USED: ONESIGNAL_REST_API_KEY
// WHAT THIS FILE DOES: Sends browser push notifications via OneSignal for fraud alerts
// ─────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';

const ONESIGNAL_APP_ID = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
const ONESIGNAL_KEY = process.env.ONESIGNAL_REST_API_KEY;

const NOTIFICATION_TEMPLATES: Record<string, (data: Record<string, unknown>) => { heading: string; content: string }> = {
  FRAUD_ALERT: (d) => ({
    heading: `🚨 CRITICAL: ${d.tender_title || 'Tender'} frozen`,
    content: `Risk Score: ${d.risk_score}/100 — ${d.risk_level || 'CRITICAL'}. AI detected fraud patterns.`,
  }),
  TENDER_CREATED: (d) => ({
    heading: `📋 New tender: ₹${d.value_crore || 0}Cr from ${d.ministry || 'Ministry'}`,
    content: `${d.tender_title || 'New tender'} — bidding now open.`,
  }),
  BID_DEADLINE: (d) => ({
    heading: `⏰ Bid deadline in 1 hour`,
    content: `${d.tender_title || 'Tender'} — submit your bid now.`,
  }),
  TENDER_AWARDED: (d) => ({
    heading: `🏆 Awarded: ${d.tender_title || 'Tender'}`,
    content: `₹${d.value_crore || 0}Cr — Winner: ${d.winner || 'TBD'}`,
  }),
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type = 'FRAUD_ALERT', ...data } = body;

    const template = NOTIFICATION_TEMPLATES[type] || NOTIFICATION_TEMPLATES.FRAUD_ALERT;
    const { heading, content } = template(data);

    if (!ONESIGNAL_APP_ID || !ONESIGNAL_KEY) {
      return NextResponse.json({
        sent: false, demo: true, heading, content,
        reason: 'OneSignal not configured',
      });
    }

    const res = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${ONESIGNAL_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        headings: { en: heading },
        contents: { en: content },
        included_segments: type === 'FRAUD_ALERT' ? ['CAG_AUDITORS'] : ['All'],
        url: `${process.env.NEXT_PUBLIC_APP_URL || ''}/dashboard/tenders/${data.tender_id || ''}`,
      }),
    });

    const result = await res.json();
    return NextResponse.json({ sent: res.ok, id: result.id, heading, content });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ sent: false, error: msg }, { status: 500 });
  }
}
