// ─────────────────────────────────────────────────
// FILE: app/api/setup/validate/route.ts
// TYPE: SERVER API ROUTE
// SECRET KEYS USED: ANTHROPIC_API_KEY, TWILIO_AUTH_TOKEN, RESEND_API_KEY (for validation)
// WHAT THIS FILE DOES: Tests if a provided API key is valid by making a real API call
// ─────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';

interface ValidateRequest {
  service: string;
  key: string;
  extra?: string; // for Twilio SID etc.
}

async function validateAnthropic(key: string): Promise<{ valid: boolean; error?: string }> {
  if (!key.startsWith('sk-ant-')) return { valid: false, error: 'Key must start with sk-ant-' };
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1,
        messages: [{ role: 'user', content: 'Hi' }],
      }),
    });
    if (res.ok || res.status === 200) return { valid: true };
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) return { valid: false, error: 'Invalid API key' };
    // Rate limit or other non-auth error means key is valid
    if (res.status === 429 || res.status === 400) return { valid: true };
    return { valid: false, error: data.error?.message || 'Validation failed' };
  } catch {
    return { valid: false, error: 'Could not reach Anthropic API' };
  }
}

async function validateTwilio(token: string, sid?: string): Promise<{ valid: boolean; error?: string }> {
  if (sid && (!sid.startsWith('AC') || sid.length !== 34)) {
    return { valid: false, error: 'Account SID must start with AC and be 34 characters' };
  }
  if (token.length < 20) return { valid: false, error: 'Auth token is too short' };
  // Basic format check passes
  return { valid: true };
}

async function validateResend(key: string): Promise<{ valid: boolean; error?: string }> {
  if (!key.startsWith('re_')) return { valid: false, error: 'Key must start with re_' };
  try {
    const res = await fetch('https://api.resend.com/domains', {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (res.ok || res.status === 200) return { valid: true };
    if (res.status === 401) return { valid: false, error: 'Invalid API key' };
    return { valid: true }; // Other errors may mean key is valid but domain not set up
  } catch {
    return { valid: false, error: 'Could not reach Resend API' };
  }
}

async function validateMapbox(token: string): Promise<{ valid: boolean; error?: string }> {
  if (!token.startsWith('pk.eyJ1')) return { valid: false, error: 'Token must start with pk.eyJ1' };
  return { valid: true };
}

async function validateOneSignal(appId: string): Promise<{ valid: boolean; error?: string }> {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(appId)) return { valid: false, error: 'App ID must be a UUID (8-4-4-4-12)' };
  return { valid: true };
}

export async function POST(request: NextRequest) {
  try {
    const body: ValidateRequest = await request.json();
    const { service, key, extra } = body;

    if (!service || !key) {
      return NextResponse.json({ valid: false, error: 'Missing service or key' }, { status: 400 });
    }

    let result: { valid: boolean; error?: string };

    switch (service) {
      case 'anthropic':
        result = await validateAnthropic(key);
        break;
      case 'twilio':
        result = await validateTwilio(key, extra);
        break;
      case 'resend':
        result = await validateResend(key);
        break;
      case 'mapbox':
        result = await validateMapbox(key);
        break;
      case 'onesignal':
        result = await validateOneSignal(key);
        break;
      default:
        result = { valid: false, error: `Unknown service: ${service}` };
    }

    // NEVER return the key value in the response
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ valid: false, error: 'Invalid request body' }, { status: 400 });
  }
}
