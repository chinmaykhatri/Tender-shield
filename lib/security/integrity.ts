// FILE: lib/security/integrity.ts
// SECURITY LAYER: Tamper detection on critical data (AI risk scores)
// BREAKS IF REMOVED: NO — just no tamper detection

import crypto from 'crypto';

const INTEGRITY_SECRET = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET;

if (!INTEGRITY_SECRET && typeof window === 'undefined') {
  console.error('[TenderShield Security] CRITICAL: JWT_SECRET not configured — integrity checks disabled');
}

/**
 * Generate an HMAC-SHA256 checksum for any data object.
 * Keys are sorted to ensure deterministic JSON serialization.
 */
export function generateChecksum(data: unknown): string {
  if (!INTEGRITY_SECRET) {
    return 'no-secret-configured';
  }
  const json = JSON.stringify(data, Object.keys(data as object).sort());
  return crypto
    .createHmac('sha256', INTEGRITY_SECRET)
    .update(json)
    .digest('hex')
    .slice(0, 16); // Short checksum — first 16 hex chars
}

/**
 * Verify a checksum matches the given data.
 * Uses timing-safe comparison to prevent timing attacks.
 */
export function verifyChecksum(data: unknown, checksum: string): boolean {
  const expected = generateChecksum(data);
  if (expected.length !== checksum.length) return false;
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected),
      Buffer.from(checksum)
    );
  } catch {
    return false;
  }
}

/**
 * Sign an AI analysis result before storing in the database.
 * Returns the HMAC checksum string.
 */
export function signAnalysisResult(analysis: {
  tender_id: string;
  risk_score: number;
  flags: unknown[];
  recommended_action: string;
}): string {
  return generateChecksum({
    tender_id: analysis.tender_id,
    risk_score: analysis.risk_score,
    flags: analysis.flags,
    recommended_action: analysis.recommended_action,
  });
}

/**
 * Verify a stored AI analysis result has not been tampered with.
 * The stored object must include a `checksum` field.
 */
export function verifyAnalysisResult(
  stored: {
    tender_id: string;
    risk_score: number;
    flags: unknown[];
    recommended_action: string;
    checksum: string;
  }
): boolean {
  const { checksum, ...data } = stored;
  return verifyChecksum(data, checksum);
}
