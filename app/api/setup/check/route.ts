// ─────────────────────────────────────────────────
// FILE: app/api/setup/check/route.ts
// TYPE: SERVER API ROUTE
// SECRET KEYS USED: reads env vars to check existence only
// WHAT THIS FILE DOES: Returns which API services are configured without exposing key values
// ─────────────────────────────────────────────────

import { NextResponse } from 'next/server';

export async function GET() {
  const isConfigured = (key: string | undefined): boolean => {
    return !!key && key !== 'REPLACE_THIS' && key.length > 5;
  };

  const services = {
    anthropic: {
      configured: isConfigured(process.env.ANTHROPIC_API_KEY),
      label: 'Claude AI',
      features: ['Document Scanner', 'Fraud Reports', 'Voice Queries', 'Price Predictor', 'Predictive Fraud', 'NL Queries'],
    },
    twilio: {
      configured: isConfigured(process.env.TWILIO_AUTH_TOKEN),
      label: 'WhatsApp Alerts',
      features: ['Instant fraud alerts to phone', 'SMS notifications'],
    },
    resend: {
      configured: isConfigured(process.env.RESEND_API_KEY),
      label: 'Email Notifications',
      features: ['Fraud alert emails', 'Tender update emails', 'Account approval emails'],
    },
    mapbox: {
      configured: isConfigured(process.env.NEXT_PUBLIC_MAPBOX_TOKEN),
      label: 'India Heatmap',
      features: ['Fraud map of India', 'State-wise risk visualization'],
    },
    onesignal: {
      configured: isConfigured(process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID),
      label: 'Push Notifications',
      features: ['Browser alerts for fraud'],
    },
  };

  const total_configured = Object.values(services).filter(s => s.configured).length;
  const total_available = Object.keys(services).length;

  // Security check: ensure no key value appears in response
  const responseBody = JSON.stringify({
    services,
    total_configured,
    total_available,
    demo_mode: process.env.NEXT_PUBLIC_DEMO_MODE === 'true',
  });

  // Verify no secret key values leaked
  const secretKeys = [
    process.env.ANTHROPIC_API_KEY,
    process.env.TWILIO_AUTH_TOKEN,
    process.env.RESEND_API_KEY,
    process.env.ONESIGNAL_REST_API_KEY,
    process.env.JWT_SECRET,
  ].filter(Boolean);

  for (const key of secretKeys) {
    if (key && responseBody.includes(key)) {
      return NextResponse.json({ error: 'Security violation: key leak detected' }, { status: 500 });
    }
  }

  return NextResponse.json(JSON.parse(responseBody));
}
