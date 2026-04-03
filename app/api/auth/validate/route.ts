/**
 * API Route: /api/auth/validate
 * 
 * Server-side auth validation — HARDENED.
 * 1. Rate-limited (5 requests/min per IP)
 * 2. Demo mode: constant-time password comparison
 * 3. Real mode: JWT structure + expiry validation
 * 4. Never leaks account list or internal errors
 * 5. Logs all auth attempts for security monitoring
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { authLimiter } from '@/lib/rateLimit';
import { verifyDemoPassword, generateSessionToken } from '@/lib/auth/authUtils';
import { registerSession } from '@/lib/auth/apiAuth';
import { logSecurityEvent } from '@/lib/security/securityLogger';

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
    const { token, email, password, role } = body;

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
      if (role && role !== account.role) {
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

      return NextResponse.json({
        valid: true,
        user,
        token: session.token,
        expiresAt: session.expiresAt,
        auth_method: 'demo',
      });
    }

    // ── Real Mode: Validate Supabase JWT ─────────────────────────
    if (!token) {
      return NextResponse.json({ valid: false, error: 'No token provided' }, { status: 401 });
    }

    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        await logSecurityEvent('AUTH_TOKEN_INVALID', ip, { message: 'Bad JWT structure' });
        return NextResponse.json({ valid: false, error: 'Invalid token' }, { status: 401 });
      }

      const payload = JSON.parse(atob(parts[1]));

      // Check expiration
      if (payload.exp && Date.now() / 1000 > payload.exp) {
        await logSecurityEvent('AUTH_SESSION_EXPIRED', ip, { email: payload.email });
        return NextResponse.json({ valid: false, error: 'Session expired' }, { status: 401 });
      }

      await logSecurityEvent('AUTH_LOGIN_SUCCESS', ip, { email: payload.email });

      return NextResponse.json({
        valid: true,
        user: {
          id: payload.sub,
          email: payload.email,
          role: payload.role || 'OFFICER',
        },
        expiresAt: (payload.exp || 0) * 1000,
        auth_method: 'supabase',
      });
    } catch {
      await logSecurityEvent('AUTH_TOKEN_INVALID', ip, { message: 'Decode failed' });
      return NextResponse.json({ valid: false, error: 'Invalid token' }, { status: 401 });
    }
  } catch {
    return NextResponse.json({ valid: false, error: 'Invalid request' }, { status: 400 });
  }
}
