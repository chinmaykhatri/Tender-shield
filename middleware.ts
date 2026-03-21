// FILE: middleware.ts
// SECURITY LAYER: Auth check + Verification Gate + Security Headers
// ─────────────────────────────────────────────

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

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
  '/api/verify/',
  '/api/admin/approve',
  '/api/mode/status',
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
  res.headers.set('X-XSS-Protection', '1; mode=block');
  res.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(self), geolocation=()'
  );
  res.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://fonts.googleapis.com https://cdn.onesignal.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://fonts.gstatic.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.anthropic.com https://onesignal.com",
      "frame-ancestors 'none'",
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
  // API routes handle their own auth
  // ─────────────────────────────────────────────
  const isAPIRoute = pathname.startsWith('/api/');
  if (isAPIRoute) return res;

  // ─────────────────────────────────────────────
  // CHECK AUTHENTICATION
  // ─────────────────────────────────────────────
  const supabaseAuthToken = req.cookies.getAll().find(c =>
    c.name.startsWith('sb-') && c.name.endsWith('-auth-token')
  );
  const tsAuthCookie = req.cookies.get('ts_authenticated');
  const hasAuth = !!supabaseAuthToken || tsAuthCookie?.value === 'true';
  const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

  if (!hasAuth && !isDemoMode) {
    const loginUrl = new URL('/', req.url);
    loginUrl.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(loginUrl);
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
    } catch (e) {
      // If verification check fails, allow through (fail open for usability)
      console.error('[Middleware] Verification gate error:', e);
    }
  }

  return res;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|OneSignalSDKWorker.js).*)',
  ],
};
