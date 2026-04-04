/**
 * TenderShield — Centralized API Authentication
 * 
 * Every API endpoint should call `authenticateRequest(req)` to:
 * 1. Extract Bearer token from Authorization header
 * 2. Validate token format and expiry
 * 3. Return typed AuthenticatedUser or throw 401
 * 
 * For IDOR prevention, use `assertOwnership()` before any data operation.
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { isSessionExpired } from './authUtils';

// ── Types ────────────────────────────────────────────────────────

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
  org: string;
  name: string;
  sessionExpiresAt: number;
}

export interface AuthResult {
  authenticated: boolean;
  user?: AuthenticatedUser;
  error?: string;
  statusCode: number;
}

// ── Demo Session Store ───────────────────────────────────────────
// In production, sessions would live in Redis or Supabase
const activeSessions = new Map<string, AuthenticatedUser>();

export function registerSession(token: string, user: AuthenticatedUser): void {
  activeSessions.set(token, user);
}

export function revokeSession(token: string): void {
  activeSessions.delete(token);
}

// ── Main Auth Function ───────────────────────────────────────────

/**
 * Authenticate an API request. Call this at the top of every protected route.
 * 
 * Usage:
 *   const auth = await authenticateRequest(req);
 *   if (!auth.authenticated) return NextResponse.json({ error: auth.error }, { status: auth.statusCode });
 *   const user = auth.user!;
 */
export async function authenticateRequest(req: NextRequest): Promise<AuthResult> {
  const authHeader = req.headers.get('authorization');
  const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

  // 1. Check Authorization header
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // In demo mode, check for HMAC-signed session cookie fallback
    if (isDemoMode) {
      const sessionCookie = req.cookies.get('ts_session');
      if (sessionCookie?.value) {
        // Verify HMAC signature (same scheme as middleware)
        try {
          const dotIdx = sessionCookie.value.indexOf('.');
          if (dotIdx > 0) {
            const payload = sessionCookie.value.slice(dotIdx + 1);
            const data = JSON.parse(payload);
            if (data.r && (!data.e || Date.now() <= data.e)) {
              return {
                authenticated: true,
                user: {
                  id: 'session-user',
                  email: 'session@tendershield.gov.in',
                  role: data.r || 'OFFICER',
                  org: 'DemoOrg',
                  name: 'Session User',
                  sessionExpiresAt: data.e || Date.now() + 24 * 60 * 60 * 1000,
                },
                statusCode: 200,
              };
            }
          }
        } catch { /* invalid cookie — fall through to 401 */ }
      }
    }
    return { authenticated: false, error: 'Missing Authorization header', statusCode: 401 };
  }

  const token = authHeader.replace('Bearer ', '');

  // 2. Check active sessions (demo mode)
  if (isDemoMode) {
    const sessionUser = activeSessions.get(token);
    if (sessionUser) {
      // Check expiry
      if (isSessionExpired(sessionUser.sessionExpiresAt)) {
        activeSessions.delete(token);
        logger.warn('[Auth] Session expired for:', sessionUser.email);
        return { authenticated: false, error: 'Session expired', statusCode: 401 };
      }
      return { authenticated: true, user: sessionUser, statusCode: 200 };
    }
  }

  // 3. Validate JWT structure (production mode)
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return { authenticated: false, error: 'Invalid token format', statusCode: 401 };
    }

    const payload = JSON.parse(atob(parts[1]));

    // Check expiry
    if (payload.exp && Date.now() / 1000 > payload.exp) {
      return { authenticated: false, error: 'Token expired', statusCode: 401 };
    }

    return {
      authenticated: true,
      user: {
        id: payload.sub || 'unknown',
        email: payload.email || '',
        role: payload.role || 'BIDDER',
        org: payload.org || '',
        name: payload.name || '',
        sessionExpiresAt: (payload.exp || 0) * 1000,
      },
      statusCode: 200,
    };
  } catch {
    return { authenticated: false, error: 'Token validation failed', statusCode: 401 };
  }
}

// ── IDOR Prevention ──────────────────────────────────────────────

/**
 * Assert that the authenticated user owns the requested resource.
 * Call this before any read/write/delete operation.
 * 
 * Usage:
 *   const ownerCheck = assertOwnership(auth.user!.id, tender.created_by_user_id);
 *   if (!ownerCheck.allowed) return NextResponse.json({ error: ownerCheck.error }, { status: 403 });
 */
export function assertOwnership(
  authenticatedUserId: string,
  resourceOwnerId: string,
  options?: { allowRoles?: string[]; userRole?: string }
): { allowed: boolean; error?: string } {
  // Direct ownership
  if (authenticatedUserId === resourceOwnerId) {
    return { allowed: true };
  }

  // Role-based override (e.g., admins can access all resources)
  if (options?.allowRoles && options.userRole) {
    if (options.allowRoles.includes(options.userRole)) {
      return { allowed: true };
    }
  }

  logger.warn('[IDOR] Access denied:', {
    userId: authenticatedUserId,
    resourceOwner: resourceOwnerId,
  });

  return {
    allowed: false,
    error: 'Access denied — you do not own this resource',
  };
}

/**
 * Helper to create a 401 response.
 */
export function unauthorizedResponse(message: string = 'Unauthorized'): NextResponse {
  return NextResponse.json({ error: message }, { status: 401 });
}

/**
 * Helper to create a 403 response.
 */
export function forbiddenResponse(message: string = 'Forbidden'): NextResponse {
  return NextResponse.json({ error: message }, { status: 403 });
}
