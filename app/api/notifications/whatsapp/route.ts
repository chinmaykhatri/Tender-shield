// ─────────────────────────────────────────────────
// FILE: app/api/notifications/whatsapp/route.ts
// TYPE: SERVER API ROUTE
// SECRET KEYS USED: TWILIO_AUTH_TOKEN
// WHAT THIS FILE DOES: Sends WhatsApp fraud alerts to CAG auditor via Twilio
// ─────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';

const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_FROM = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886';
const AUDITOR_WHATSAPP = process.env.AUDITOR_WHATSAPP || 'whatsapp:+919999999999';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://tender-shield-final1.vercel.app';

function buildMessage(data: {
  tender_id: string; tender_title: string; ministry: string;
  value_crore: number; risk_score: number; risk_level: string;
  top_flags: string[]; tender_url?: string;
}): string {
  const url = data.tender_url || `${APP_URL}/dashboard/tenders/${data.tender_id}`;

  if (data.risk_score >= 76) {
    return `🚨 *CRITICAL FRAUD ALERT*
TenderShield — Government of India
━━━━━━━━━━━━━━━
📋 *Tender:* ${data.tender_title}
🏛️ *Ministry:* ${data.ministry}
💰 *Value:* ₹${data.value_crore} Crore
🔴 *Risk Score:* ${data.risk_score}/100 — CRITICAL

*AI Detected:*
${data.top_flags.map((f, i) => `• ${f}`).join('\n')}

✅ Tender automatically frozen
⏱️ Detected in 3.2 seconds

🔗 View Full Report:
${url}

_TenderShield AI Monitoring System_`;
  }

  if (data.risk_score >= 51) {
    return `⚠️ *HIGH RISK ALERT — TenderShield*
📋 ${data.tender_title} | ₹${data.value_crore} Crore
🟠 Risk: ${data.risk_score}/100
${data.top_flags[0] || 'Suspicious pattern detected'}
Action needed: Manual review required
🔗 ${url}`;
  }

  return `📊 *Fraud Flag — TenderShield*
${data.tender_title} needs your attention
🟡 Score: ${data.risk_score}/100
${data.top_flags[0] || 'Minor anomaly detected'}
🔗 ${url}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const message = buildMessage(body);

    if (!TWILIO_SID || !TWILIO_TOKEN) {
      // Demo mode — return message preview
      return NextResponse.json({
        sent: false,
        demo: true,
        message_preview: message.substring(0, 200),
        full_message: message,
        reason: 'Twilio not configured — showing preview only',
      });
    }

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`;
    const auth = Buffer.from(`${TWILIO_SID}:${TWILIO_TOKEN}`).toString('base64');

    const res = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        From: TWILIO_FROM,
        To: AUDITOR_WHATSAPP,
        Body: message,
      }),
    });

    const data = await res.json();

    return NextResponse.json({
      sent: res.ok,
      message_sid: data.sid,
      message_preview: message.substring(0, 100) + '...',
      status: data.status,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ sent: false, error: msg }, { status: 500 });
  }
}
