/**
 * TenderShield — Health Check Endpoint
 * Returns status of all system dependencies.
 * 
 * GET /api/health
 * Returns: { status, checks: { supabase, backend, ai }, uptime, version }
 */

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface HealthCheck {
  status: 'ok' | 'degraded' | 'down';
  latency_ms?: number;
  message?: string;
}

async function checkSupabase(): Promise<HealthCheck> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) return { status: 'down', message: 'Not configured' };

  try {
    const start = Date.now();
    const res = await fetch(`${url}/rest/v1/`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(3000),
    });
    const latency = Date.now() - start;
    return res.ok
      ? { status: 'ok', latency_ms: latency }
      : { status: 'degraded', latency_ms: latency, message: `HTTP ${res.status}` };
  } catch {
    return { status: 'down', message: 'Connection failed' };
  }
}

async function checkBackend(): Promise<HealthCheck> {
  const url = process.env.BACKEND_URL || 'http://localhost:8000';
  try {
    const start = Date.now();
    const res = await fetch(`${url}/health`, { signal: AbortSignal.timeout(2000) });
    const latency = Date.now() - start;
    return res.ok
      ? { status: 'ok', latency_ms: latency }
      : { status: 'degraded', latency_ms: latency, message: `HTTP ${res.status}` };
  } catch {
    return { status: 'down', message: 'Python backend offline' };
  }
}

function checkAI(): HealthCheck {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return { status: 'degraded', message: 'No API key — using demo mode' };
  return { status: 'ok', message: 'Claude API configured' };
}

const startTime = Date.now();

export async function GET() {
  const [supabase, backend] = await Promise.all([
    checkSupabase(),
    checkBackend(),
  ]);
  const ai = checkAI();

  const allOk = [supabase, backend, ai].every(c => c.status === 'ok');
  const anyDown = [supabase, backend, ai].some(c => c.status === 'down');

  return NextResponse.json({
    status: anyDown ? 'degraded' : allOk ? 'healthy' : 'partial',
    timestamp: new Date().toISOString(),
    uptime_seconds: Math.round((Date.now() - startTime) / 1000),
    version: '2.0.0',
    demo_mode: process.env.NEXT_PUBLIC_DEMO_MODE === 'true',
    checks: {
      supabase,
      backend,
      ai,
    },
  });
}
