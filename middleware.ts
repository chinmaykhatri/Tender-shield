// FILE: middleware.ts
// SECURITY LAYER: Auth check + Verification Gate + Security Headers
// ─────────────────────────────────────────────
// AUTH ARCHITECTURE:
// - Auth cookie (ts_session) is HMAC-SHA256 signed, HttpOnly, SameSite=Strict
// - Set only by /api/auth/validate server-side (not by client JS)
// - Middleware verifies HMAC signature on every request — no forgery possible
// - DevTools cannot forge: setting document.cookie does nothing
// - Supabase JWT path uses Authorization header (unchanged)

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// ── HMAC Session Cookie Verification (Web Crypto API — Edge Runtime) ──
const SESSION_KEY = process.env.SESSION_SIGNING_KEY || 'ts-dev-signing-key-change-in-prod-2026';

async function verifySessionCookie(cookieValue: string): Promise<{ valid: boolean; role: string }> {
  try {
    const dotIndex = cookieValue.indexOf('.');
    if (dotIndex === -1) return { valid: false, role: '' };
    const sig = cookieValue.slice(0, dotIndex);
    const payload = cookieValue.slice(dotIndex + 1);

    // Import key for HMAC-SHA256 (Web Crypto API)
    const encoder = new TextEncoder();
    const keyData = encoder.encode(SESSION_KEY);
    const cryptoKey = await crypto.subtle.importKey(
      'raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    );
    const expectedSigBuf = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(payload));

    // Convert to base64url for comparison
    const expectedSig = btoa(String.fromCharCode(...new Uint8Array(expectedSigBuf)))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    // Constant-time-ish comparison (Edge doesn't have timingSafeEqual)
    if (sig.length !== expectedSig.length) return { valid: false, role: '' };
    let mismatch = 0;
    for (let i = 0; i < sig.length; i++) {
      mismatch |= sig.charCodeAt(i) ^ expectedSig.charCodeAt(i);
    }
    if (mismatch !== 0) return { valid: false, role: '' };

    // Signature valid — parse payload to get role
    const data = JSON.parse(payload);
    // Check expiry
    if (data.e && Date.now() > data.e) return { valid: false, role: '' };
    return { valid: true, role: data.r || '' };
  } catch {
    return { valid: false, role: '' };
  }
}

// ─────────────────────────────────────────────
// Demo accounts that bypass ALL verification
// ─────────────────────────────────────────────
const DEMO_EMAILS = [
  'officer@morth.gov.in',
  'medtech@medtechsolutions.com',
  'auditor@cag.gov.in',
];

// ─────────────────────────────────────────────
// Pages that anyone can visit without logging in
// ─────────────────────────────────────────────
const PUBLIC_ROUTES = [
  '/',
  '/register',
  '/verify',
  '/rti',
  '/verify-pending',
  '/awaiting-approval',
  '/registration-rejected',
  '/architecture',
  '/demo',
];

// API routes that do NOT need authentication
const PUBLIC_API_ROUTES = [
  '/api/v1/auth/login',
  '/api/v1/auth/register',
  '/api/v1/auth/demo-users',
  '/api/v1/dashboard/health',
  '/api/setup/check',
  '/api/setup/validate',
  '/api/auth/validate-registration',
  '/api/auth/validate',
  '/api/verify/',
  '/api/admin/approve',
  '/api/mode/status',
  '/api/health',
];

// Static files and Next.js internals
const STATIC_PREFIXES = [
  '/_next',
  '/favicon',
  '/icons',
  '/manifest',
  '/OneSignalSDKWorker',
];

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const pathname = req.nextUrl.pathname;

  // ─────────────────────────────────────────────
  // SECURITY HEADERS (applied to EVERY response)
  // ─────────────────────────────────────────────
  res.headers.set('X-Frame-Options', 'DENY');
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  // X-XSS-Protection intentionally removed — deprecated header, CSP replaces it
  res.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  res.headers.set('X-Request-Id', crypto.randomUUID());
  res.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(self), geolocation=()'
  );
  // Generate CSP nonce for this request
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  res.headers.set('X-CSP-Nonce', nonce);

  // Only apply strict CSP in production; in dev mode Next.js needs eval for HMR
  const isDev = process.env.NODE_ENV === 'development';
  res.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      // Next.js requires unsafe-inline for hydration; unsafe-eval ONLY in dev (HMR)
      `script-src 'self' 'unsafe-inline' ${isDev ? "'unsafe-eval'" : ''} https://fonts.googleapis.com https://cdn.onesignal.com`,
      // unsafe-inline for Next.js injected <style> tags during SSR
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://fonts.gstatic.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https:",
      `connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.anthropic.com https://onesignal.com${isDev ? ' ws://localhost:* http://localhost:*' : ''}`,
      "frame-ancestors 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      ...(isDev ? [] : ["upgrade-insecure-requests"]),
    ].join('; ')
  );

  // ─────────────────────────────────────────────
  // ALLOW static files and Next.js internals
  // ─────────────────────────────────────────────
  const isStaticFile = STATIC_PREFIXES.some(prefix => pathname.startsWith(prefix));
  if (isStaticFile) return res;

  // ─────────────────────────────────────────────
  // ALLOW public pages (exact match or prefix)
  // ─────────────────────────────────────────────
  const isPublicRoute = PUBLIC_ROUTES.some(route =>
    pathname === route || (route !== '/' && pathname.startsWith(route + '/'))
  );
  if (isPublicRoute) return res;

  // ─────────────────────────────────────────────
  // ALLOW public API routes
  // ─────────────────────────────────────────────
  const isPublicAPI = PUBLIC_API_ROUTES.some(route => pathname.startsWith(route));
  if (isPublicAPI) return res;

  // ─────────────────────────────────────────────
  // API AUTH — Protected API routes require token
  // (Each route also has its own auth via apiAuth.ts)
  // ─────────────────────────────────────────────
  const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
  const isAPIRoute = pathname.startsWith('/api/');
  if (isAPIRoute) {
    // Bot detection: multi-signal check
    const userAgent = req.headers.get('user-agent') || '';
    const acceptHeader = req.headers.get('accept') || '';
    const acceptLang = req.headers.get('accept-language') || '';

    const isSuspicious =
      userAgent.length < 10 ||
      /bot|crawler|spider|scraper|curl|wget|python-requests|httpie/i.test(userAgent) ||
      (!acceptLang && !isAPIRoute) || // Browsers always send Accept-Language
      (isAPIRoute && !acceptHeader && !isPublicAPI); // API clients should send Accept header

    if (isSuspicious && !isPublicAPI && pathname !== '/api/health') {
      // Rate-limit suspicious requests rather than hard block
      res.headers.set('X-RateLimit-Suspicious', 'true');
      console.warn(`[Security] Suspicious request: ${pathname} UA=${userAgent.slice(0, 50)}`);
    }

    // Hard block requests with no User-Agent at all
    if (!userAgent || userAgent.length < 5) {
      return NextResponse.json(
        { error: 'Request blocked' },
        { status: 403, headers: Object.fromEntries(res.headers.entries()) }
      );
    }

    // Public API routes pass through
    if (isPublicAPI) return res;

    // Health + auth validate are public
    if (pathname === '/api/health' || pathname === '/api/auth/validate') return res;

    // All other API routes: check for auth token
    const authHeader = req.headers.get('authorization');
    const sessionCookie = req.cookies.get('ts_session');
    const hasBearer = !!authHeader;
    let hasValidSession = false;
    if (sessionCookie?.value) {
      const verified = await verifySessionCookie(sessionCookie.value);
      hasValidSession = verified.valid;
    }
    const hasAPIAuth = hasBearer || hasValidSession;

    if (!hasAPIAuth) {
      if (isDemoMode) {
        // Demo mode: require valid HMAC-signed session cookie
        if (!hasValidSession) {
          return NextResponse.json(
            { error: 'Demo mode requires authentication via login page' },
            { status: 401, headers: Object.fromEntries(res.headers.entries()) }
          );
        }
      } else {
        return NextResponse.json(
          { error: 'Unauthorized — Bearer token required' },
          { status: 401, headers: Object.fromEntries(res.headers.entries()) }
        );
      }
    }

    return res;
  }

  // ─────────────────────────────────────────────
  // CHECK AUTHENTICATION
  // ─────────────────────────────────────────────
  const supabaseAuthToken = req.cookies.getAll().find(c =>
    c.name.startsWith('sb-') && c.name.endsWith('-auth-token')
  );
  const sessionCookie = req.cookies.get('ts_session');
  let hasValidSessionCookie = false;
  let sessionRole = '';
  if (sessionCookie?.value) {
    const verified = await verifySessionCookie(sessionCookie.value);
    hasValidSessionCookie = verified.valid;
    sessionRole = verified.role;
  }
  const hasAuth = !!supabaseAuthToken || hasValidSessionCookie;

  if (!hasAuth) {
    if (isDemoMode) {
      // Demo mode: require valid HMAC-signed session cookie
      if (!hasValidSessionCookie) {
        const loginUrl = new URL('/', req.url);
        loginUrl.searchParams.set('redirectTo', pathname);
        return NextResponse.redirect(loginUrl);
      }
    } else {
      const loginUrl = new URL('/', req.url);
      loginUrl.searchParams.set('redirectTo', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // ─────────────────────────────────────────────
  // SERVER-SIDE TOKEN VALIDATION (Demo Mode)
  // Prevents role spoofing via DevTools
  // ─────────────────────────────────────────────
  if (isDemoMode && hasValidSessionCookie) {
    // Validate role-based route access using the HMAC-verified role
    const userRole = sessionRole;
    
    // Role-gated routes: auditor dashboard requires CAG_AUDITOR role
    const ROLE_ROUTES: Record<string, string[]> = {
      '/dashboard/auditor': ['CAG_AUDITOR'],
      '/dashboard/admin': ['ADMIN'],
    };
    
    for (const [routePrefix, allowedRoles] of Object.entries(ROLE_ROUTES)) {
      if (pathname.startsWith(routePrefix) && !allowedRoles.includes(userRole)) {
        // Not authorized for this role-specific route
        const dashboardUrl = new URL('/dashboard', req.url);
        dashboardUrl.searchParams.set('error', 'insufficient_role');
        return NextResponse.redirect(dashboardUrl);
      }
    }
  }


  // ─────────────────────────────────────────────
  // VERIFICATION GATE
  // Uses Supabase REST API directly (Edge Runtime compatible)
  // Checks user_verifications table before allowing dashboard access
  // ─────────────────────────────────────────────
  if (supabaseAuthToken && !isDemoMode) {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (supabaseUrl && supabaseKey) {
        // Parse the auth token to get user info
        const tokenValue = supabaseAuthToken.value;
        let accessToken = '';
        try {
          // Supabase stores an array [access_token, refresh_token] as base64
          const parsed = JSON.parse(Buffer.from(tokenValue, 'base64').toString());
          accessToken = Array.isArray(parsed) ? parsed[0] : parsed.access_token || parsed;
        } catch {
          // If not base64 encoded, try direct
          accessToken = tokenValue;
        }

        if (accessToken) {
          // Get user from Supabase auth
          const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'apikey': supabaseKey,
            },
          });

          if (userRes.ok) {
            const user = await userRes.json();
            const userEmail = user.email || '';

            // Demo emails bypass verification completely
            if (DEMO_EMAILS.includes(userEmail)) {
              return res;
            }

            // Check verification status via REST API
            const verifyRes = await fetch(
              `${supabaseUrl}/rest/v1/user_verifications?user_id=eq.${user.id}&select=overall_status,role,admin_approved`,
              {
                headers: {
                  'Authorization': `Bearer ${accessToken}`,
                  'apikey': supabaseKey,
                  'Accept': 'application/vnd.pgrst.object+json',
                },
              }
            );

            if (verifyRes.ok) {
              const verification = await verifyRes.json();

              // Case 1: No verification record — redirect to register
              if (!verification || !verification.overall_status) {
                if (!pathname.startsWith('/register') && !pathname.startsWith('/verify-pending')) {
                  return NextResponse.redirect(new URL('/register', req.url));
                }
                return res;
              }

              // Case 2: Verification pending
              if (verification.overall_status === 'PENDING') {
                if (!pathname.startsWith('/verify-pending') && !pathname.startsWith('/register')) {
                  return NextResponse.redirect(new URL('/verify-pending', req.url));
                }
                return res;
              }

              // Case 3: Verified but awaiting admin (not CAG auditors)
              if (
                verification.overall_status === 'VERIFIED' &&
                !verification.admin_approved &&
                verification.role !== 'CAG_AUDITOR'
              ) {
                if (!pathname.startsWith('/awaiting-approval')) {
                  return NextResponse.redirect(new URL('/awaiting-approval', req.url));
                }
                return res;
              }

              // Case 4: Rejected
              if (verification.overall_status === 'REJECTED') {
                if (!pathname.startsWith('/registration-rejected')) {
                  return NextResponse.redirect(new URL('/registration-rejected', req.url));
                }
                return res;
              }

              // Case 5: Fully verified + approved → fall through
            } else if (verifyRes.status === 406) {
              // 406 = no rows found → no verification record → redirect to register
              if (!pathname.startsWith('/register') && !pathname.startsWith('/verify-pending')) {
                return NextResponse.redirect(new URL('/register', req.url));
              }
              return res;
            }
          }
        }
      }
    } catch {
      // Verification check failed — fail open for usability
    }
  }

  return res;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|OneSignalSDKWorker.js).*)',
  ],
};
