/**
 * API Route: /api/auth/signout
 * Clears the HMAC-signed session cookie and returns success.
 */

import { NextResponse } from 'next/server';

function clearSessionCookieHeader(): string {
  return 'ts_session=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict';
}

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.headers.set('Set-Cookie', clearSessionCookieHeader());
  return response;
}

export async function GET() {
  const response = NextResponse.json({ success: true });
  response.headers.set('Set-Cookie', clearSessionCookieHeader());
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.headers.set('Set-Cookie', clearSessionCookieHeader());
  return response;
}
