/**
 * TenderShield — Centralized Server-Side Role Extraction
 * 
 * SECURITY: This is the ONLY authorized way to determine a user's role in API routes.
 * 
 * Role is extracted EXCLUSIVELY from the HMAC-signed `ts_session` cookie
 * that is set by /api/auth/validate (server-side, HttpOnly, SameSite=Strict).
 * 
 * NEVER trust:
 *   - `x-user-role` HTTP header (client-controlled → trivial privilege escalation)
 *   - `tendershield-demo-user` cookie (unsigned → client-forgeable)
 *   - `_user_role` request body field (client-controlled)
 * 
 * In DEMO_MODE, if no valid session exists, a default OFFICER role is granted
 * to allow playground/demo functionality without login.
 */

import type { NextRequest } from 'next/server';

const SESSION_KEY = process.env.SESSION_SIGNING_KEY || 'ts-dev-signing-key-change-in-prod-2026';
const IS_DEMO = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

/**
 * Verify HMAC-SHA256 signed session cookie and extract the role.
 * Returns the verified role string, or undefined if no valid session.
 * 
 * This uses Node.js crypto (available in API routes, unlike Edge middleware).
 */
export async function extractVerifiedRole(req: NextRequest): Promise<string | undefined> {
  const sessionCookie = req.cookies.get('ts_session');

  if (sessionCookie?.value) {
    const role = await verifyAndExtractRole(sessionCookie.value);
    if (role) return role;
  }

  // In demo mode, allow unauthenticated access with a default role
  // This enables the playground and demo flows to work without login
  if (IS_DEMO) {
    return 'OFFICER';
  }

  return undefined;
}

/**
 * Internal: Verify HMAC signature and extract role from signed cookie.
 * Returns null if signature is invalid, expired, or malformed.
 */
async function verifyAndExtractRole(cookieValue: string): Promise<string | null> {
  try {
    const dotIndex = cookieValue.indexOf('.');
    if (dotIndex === -1) return null;

    const sig = cookieValue.slice(0, dotIndex);
    const payload = cookieValue.slice(dotIndex + 1);

    // Use Web Crypto API for HMAC verification (works in both Node and Edge)
    const encoder = new TextEncoder();
    const keyData = encoder.encode(SESSION_KEY);
    const cryptoKey = await crypto.subtle.importKey(
      'raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    );
    const expectedSigBuf = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(payload));

    // Convert to base64url
    const expectedSig = btoa(String.fromCharCode(...new Uint8Array(expectedSigBuf)))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    // Constant-time comparison
    if (sig.length !== expectedSig.length) return null;
    let mismatch = 0;
    for (let i = 0; i < sig.length; i++) {
      mismatch |= sig.charCodeAt(i) ^ expectedSig.charCodeAt(i);
    }
    if (mismatch !== 0) return null;

    // Signature valid — parse payload
    const data = JSON.parse(payload);

    // Check expiry
    if (data.e && Date.now() > data.e) return null;

    return data.r || null;
  } catch {
    return null;
  }
}

/**
 * Extract role for INTERNAL system calls (e.g., auto-lock triggered by AI).
 * Requires a shared internal API secret — not a client header.
 */
export function extractInternalSystemRole(req: Request): string | undefined {
  const internalSecret = process.env.INTERNAL_API_SECRET || '';
  const providedSecret = req.headers.get('x-internal-secret') || '';

  if (internalSecret && providedSecret === internalSecret) {
    return 'AI_SYSTEM';
  }

  return undefined;
}
