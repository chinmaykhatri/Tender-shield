import { NextRequest, NextResponse } from 'next/server';

// ============================================================================
// QR Scan API — Resolves QR data to a verification result
// ============================================================================
// When a user scans a TenderShield QR code, this endpoint resolves
// the encoded tender_id and hash, then redirects to the verify page
// or returns JSON verification data.
// ============================================================================

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tenderId = searchParams.get('tender') || searchParams.get('tender_id');
  const hash = searchParams.get('hash');
  const format = searchParams.get('format') || 'redirect';

  if (!tenderId) {
    return NextResponse.json({ error: 'Missing tender parameter in QR code' }, { status: 400 });
  }

  if (format === 'json') {
    // Forward to the real verification API
    const origin = req.nextUrl.origin;
    const verifyUrl = `${origin}/api/verify/tender?tender_id=${encodeURIComponent(tenderId)}${hash ? `&hash=${encodeURIComponent(hash)}` : ''}`;
    const res = await fetch(verifyUrl);
    const data = await res.json();
    return NextResponse.json(data);
  }

  // Default: redirect to the verify page with params
  const verifyPageUrl = new URL('/verify', req.nextUrl.origin);
  verifyPageUrl.searchParams.set('tender', tenderId);
  if (hash) verifyPageUrl.searchParams.set('hash', hash);
  verifyPageUrl.searchParams.set('source', 'qr');

  return NextResponse.redirect(verifyPageUrl, 307);
}
