import { logger } from '@/lib/logger';
// FILE: app/api/v1/auth/login/route.ts
// SECURITY LAYER: Rate limiting + failed attempt logging
// BREAKS IF REMOVED: YES — login stops working

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { checkRateLimit, clearRateLimit } from '@/lib/auth/rateLimiter';
import { sanitizeText } from '@/lib/security/sanitize';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';

  try {
    const body = await req.json();
    const email = sanitizeText(body.email, 255).toLowerCase().trim();
    const password = body.password;

    // ─── Input validation ───────────────────
    if (!email || !password) {
      return NextResponse.json(
        { detail: 'Email and password are required' },
        { status: 400 }
      );
    }

    if (typeof email !== 'string' || typeof password !== 'string') {
      return NextResponse.json(
        { detail: 'Invalid input format' },
        { status: 400 }
      );
    }

    // ─── Rate limit by IP AND by email ──────
    const ipLimit = checkRateLimit(ip, 10, 15 * 60 * 1000);
    const emailLimit = checkRateLimit(email, 5, 15 * 60 * 1000);

    if (!ipLimit.allowed || !emailLimit.allowed) {
      const resetIn = Math.ceil(
        (Math.max(ipLimit.resetAt, emailLimit.resetAt) - Date.now()) / 1000 / 60
      );

      // Log rate limit hit
      logger.warn(`[TenderShield] 🚫 Rate limit hit: ${email} from ${ip}`);

      // Try to log to Supabase (non-blocking)
      void (async () => { try { await supabase.from('login_attempts').insert({
        email,
        ip_address: ip,
        success: false,
        attempted_at: new Date().toISOString(),
        user_agent: req.headers.get('user-agent')?.slice(0, 200) ?? null,
        blocked_reason: 'rate_limited',
      }); } catch { /* non-blocking */ } })();

      return NextResponse.json(
        {
          detail: `Too many login attempts. Try again in ${resetIn} minutes.`,
          locked: true,
          remaining_minutes: resetIn,
        },
        { status: 429 }
      );
    }

    // ─── Attempt login with Supabase ────────
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.session) {
      // Log failed attempt (non-blocking)
      void (async () => { try { await supabase.from('login_attempts').insert({
        email,
        ip_address: ip,
        success: false,
        attempted_at: new Date().toISOString(),
        user_agent: req.headers.get('user-agent')?.slice(0, 200) ?? null,
      }); } catch { /* non-blocking */ } })();

      return NextResponse.json(
        { detail: error?.message || 'Invalid email or password' },
        { status: 401 }
      );
    }

    // ─── Success — clear rate limits ────────
    clearRateLimit(ip);
    clearRateLimit(email);

    // Get profile for role/org info
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    // Log success (non-blocking)
    void (async () => { try { await supabase.from('login_attempts').insert({
      email,
      ip_address: ip,
      success: true,
      attempted_at: new Date().toISOString(),
      user_agent: req.headers.get('user-agent')?.slice(0, 200) ?? null,
    }); } catch { /* non-blocking */ } })();

    return NextResponse.json({
      access_token: data.session.access_token,
      role: profile?.role || 'BIDDER',
      org: profile?.org || 'BidderOrg',
      name: profile?.name || email.split('@')[0],
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Login failed';
    return NextResponse.json(
      { detail: message },
      { status: 500 }
    );
  }
}
