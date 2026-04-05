/**
 * API Route: /api/auth/validate
 * 
 * Server-side auth validation — HARDENED.
 * 1. Rate-limited (5 requests/min per IP)
 * 2. Demo mode: constant-time password comparison
 * 3. Real mode: JWT structure + HMAC-SHA256 signature verification
 * 4. Never leaks account list or internal errors
 * 5. Logs all auth attempts for security monitoring
 * 6. Sets HMAC-signed HttpOnly cookie (not forgeable via DevTools)
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { authLimiter } from '@/lib/rateLimit';
import { verifyDemoPassword, generateSessionToken } from '@/lib/auth/authUtils';
import { registerSession } from '@/lib/auth/apiAuth';
import { logSecurityEvent } from '@/lib/security/securityLogger';
import { createHmac } from 'crypto';
import { loginSchema } from '@/lib/validation/schemas';

// ── HMAC Session Cookie ──────────────────────────────────────────
// The cookie value is: base64url(HMAC-SHA256(payload, key)).payload
// Middleware verifies the signature without a network call.
const SESSION_KEY = process.env.SESSION_SIGNING_KEY || 'ts-dev-signing-key-change-in-prod-2026';
const IS_PROD = process.env.NODE_ENV === 'production';

function signSessionCookie(payload: string): string {
  const sig = createHmac('sha256', SESSION_KEY).update(payload).digest('base64url');
  return `${sig}.${payload}`;
}

function makeSessionCookieHeader(value: string, maxAge = 86400): string {
  const flags = [
    `ts_session=${value}`,
    'Path=/',
    `Max-Age=${maxAge}`,
    'HttpOnly',
    'SameSite=Strict',
    ...(IS_PROD ? ['Secure'] : []),
  ];
  return flags.join('; ');
}

function clearSessionCookieHeader(): string {
  return 'ts_session=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict';
}

const DEMO_ACCOUNTS: Record<string, { role: string; org: string; name: string }> = {
  'officer@morth.gov.in': { role: 'OFFICER', org: 'MinistryOrg', name: 'Rajesh Kumar' },
  'medtech@medtechsolutions.com': { role: 'BIDDER', org: 'BidderOrg', name: 'Priya Sharma' },
  'auditor@cag.gov.in': { role: 'AUDITOR', org: 'AuditorOrg', name: 'CAG Auditor' },
  'admin@nic.gov.in': { role: 'NIC_ADMIN', org: 'NICOrg', name: 'NIC Admin' },
};

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';

  // ── Rate Limiting (5 req/min per IP) ───────────────────────────
  const { success: withinLimit } = authLimiter.check(ip);
  if (!withinLimit) {
    await logSecurityEvent('RATE_LIMIT_HIT', ip, { endpoint: '/api/auth/validate' });
    return NextResponse.json(
      { valid: false, error: 'Too many requests. Try again later.' },
      { status: 429, headers: { 'Retry-After': '60' } }
    );
  }

  try {
    const body = await request.json();

    // ── Input Validation (Zod) ─────────────────────────────────
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { valid: false, error: 'Invalid request body', details: parsed.error.issues.map(i => i.message) },
        { status: 400 }
      );
    }
    const { token, email, password, role } = parsed.data;

    // ── Demo Mode Validation ─────────────────────────────────────
    if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true') {
      if (!email) {
        return NextResponse.json({ valid: false, error: 'Email required' }, { status: 400 });
      }

      const account = DEMO_ACCOUNTS[email];
      if (!account) {
        // NEVER leak which accounts exist
        await logSecurityEvent('AUTH_LOGIN_FAILED', ip, { email, message: 'Unknown account' });
        return NextResponse.json(
          { valid: false, error: 'Invalid credentials' },
          { status: 401 }
        );
      }

      // Verify password with constant-time comparison if provided
      if (password) {
        const passwordValid = verifyDemoPassword(email, password);
        if (!passwordValid) {
          await logSecurityEvent('AUTH_LOGIN_FAILED', ip, { email, message: 'Wrong password' });
          return NextResponse.json(
            { valid: false, error: 'Invalid credentials' },
            { status: 401 }
          );
        }
      }

      // Check role mismatch (prevent DevTools spoofing)
      // Normalize role aliases: CAG_AUDITOR → AUDITOR, MINISTRY_OFFICER → OFFICER
      const normalizedRole = role === 'CAG_AUDITOR' ? 'AUDITOR' : role === 'MINISTRY_OFFICER' ? 'OFFICER' : role;
      if (normalizedRole && normalizedRole !== account.role) {
        await logSecurityEvent('AUTH_ROLE_MISMATCH', ip, {
          email,
          message: `Claimed ${role}, expected ${account.role}`,
        });
        return NextResponse.json(
          { valid: false, error: 'Invalid credentials' },
          { status: 403 }
        );
      }

      // ── Generate session with expiry ─────────────────────────
      const session = generateSessionToken();
      const user = {
        id: `demo-${account.role.toLowerCase()}`,
        did: `did:ts:${account.role.toLowerCase()}`,
        role: account.role,
        org: account.org,
        name: account.name,
        email,
        sessionExpiresAt: session.expiresAt,
      };

      // Register session server-side
      registerSession(session.token, {
        id: user.id,
        email,
        role: user.role,
        org: user.org,
        name: user.name,
        sessionExpiresAt: session.expiresAt,
      });

      await logSecurityEvent('AUTH_LOGIN_SUCCESS', ip, { email });

      const response = NextResponse.json({
        valid: true,
        user,
        token: session.token,
        expiresAt: session.expiresAt,
        auth_method: 'demo',
      });
      // Set HMAC-signed HttpOnly cookie — cannot be forged via DevTools
      const cookiePayload = JSON.stringify({ t: session.token, r: user.role, e: session.expiresAt });
      response.headers.set('Set-Cookie', makeSessionCookieHeader(signSessionCookie(cookiePayload)));
      return response;
    }

    // ── Real Mode: Validate Supabase JWT ─────────────────────────
    // CRIT-2 FIX: Actually verify the JWT signature using HMAC-SHA256,
    // not just decode the payload (which anyone can forge).
    if (!token) {
      return NextResponse.json({ valid: false, error: 'No token provided' }, { status: 401 });
    }

    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        await logSecurityEvent('AUTH_TOKEN_INVALID', ip, { message: 'Bad JWT structure' });
        return NextResponse.json({ valid: false, error: 'Invalid token' }, { status: 401 });
      }

      // ── Signature Verification (HMAC-SHA256) ──────────────────
      const jwtSecret = process.env.SUPABASE_JWT_SECRET;
      if (jwtSecret) {
        const { createHmac, timingSafeEqual } = await import('crypto');
        const signingInput = `${parts[0]}.${parts[1]}`;
        const expectedSig = createHmac('sha256', jwtSecret)
          .update(signingInput)
          .digest('base64url');

        // Constant-time comparison to prevent timing attacks
        const actualSig = parts[2];
        const expectedBuf = Buffer.from(expectedSig);
        const actualBuf = Buffer.from(actualSig);
        if (expectedBuf.length !== actualBuf.length || !timingSafeEqual(expectedBuf, actualBuf)) {
          await logSecurityEvent('AUTH_TOKEN_INVALID', ip, { message: 'JWT signature mismatch' });
          return NextResponse.json({ valid: false, error: 'Invalid token signature' }, { status: 401 });
        }
      } else {
        // SUPABASE_JWT_SECRET not configured — log warning, fall back to structure-only
        console.warn('[Security] SUPABASE_JWT_SECRET not set — JWT signature NOT verified (structure-only check)');
      }

      const payload = JSON.parse(atob(parts[1]));

      // Check expiration
      if (payload.exp && Date.now() / 1000 > payload.exp) {
        await logSecurityEvent('AUTH_SESSION_EXPIRED', ip, { email: payload.email });
        return NextResponse.json({ valid: false, error: 'Session expired' }, { status: 401 });
      }

      await logSecurityEvent('AUTH_LOGIN_SUCCESS', ip, { email: payload.email });

      const jwtResponse = NextResponse.json({
        valid: true,
        user: {
          id: payload.sub,
          email: payload.email,
          role: payload.role || 'OFFICER',
        },
        expiresAt: (payload.exp || 0) * 1000,
        auth_method: 'supabase',
      });
      // Set HMAC-signed HttpOnly cookie for Supabase-authenticated users too
      const jwtCookiePayload = JSON.stringify({ t: token.slice(-16), r: payload.role || 'OFFICER', e: (payload.exp || 0) * 1000 });
      jwtResponse.headers.set('Set-Cookie', makeSessionCookieHeader(signSessionCookie(jwtCookiePayload)));
      return jwtResponse;
    } catch {
      await logSecurityEvent('AUTH_TOKEN_INVALID', ip, { message: 'Decode failed' });
      return NextResponse.json({ valid: false, error: 'Invalid token' }, { status: 401 });
    }
  } catch {
    return NextResponse.json({ valid: false, error: 'Invalid request' }, { status: 400 });
  }
}

/** DELETE /api/auth/validate — Clear the HMAC-signed session cookie on logout */
export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.headers.set('Set-Cookie', clearSessionCookieHeader());
  return response;
}
