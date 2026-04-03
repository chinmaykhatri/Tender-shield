/**
 * TenderShield — Auth Utilities (Security-Hardened)
 * 
 * PBKDF2 password hashing (100k iterations, SHA-256)
 * Session tokens with embedded expiry (24h)
 * Password reset tokens with 1h expiry
 * 
 * Uses Web Crypto API — works in Edge Runtime + Node.js
 */

import { logger } from '@/lib/logger';

// ── Constants ────────────────────────────────────────────────────
const PBKDF2_ITERATIONS = 100_000;
const SALT_LENGTH = 16; // bytes
const HASH_LENGTH = 32; // bytes
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;     // 24 hours
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;       // 1 hour

// ── Password Hashing ─────────────────────────────────────────────

/**
 * Hash a password using PBKDF2 with a random salt.
 * Returns "iterations:salt_hex:hash_hex" format.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']
  );
  const derivedBits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    HASH_LENGTH * 8
  );
  const saltHex = Buffer.from(salt).toString('hex');
  const hashHex = Buffer.from(derivedBits).toString('hex');
  return `${PBKDF2_ITERATIONS}:${saltHex}:${hashHex}`;
}

/**
 * Verify a password against a stored hash.
 * Timing-safe comparison to prevent timing attacks.
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  try {
    const parts = storedHash.split(':');
    if (parts.length !== 3) return false;

    const iterations = parseInt(parts[0], 10);
    const salt = Buffer.from(parts[1], 'hex');
    const expectedHash = Buffer.from(parts[2], 'hex');

    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']
    );
    const derivedBits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt: new Uint8Array(salt), iterations, hash: 'SHA-256' },
      keyMaterial,
      HASH_LENGTH * 8
    );
    const actualHash = Buffer.from(derivedBits);

    // Timing-safe comparison
    if (actualHash.length !== expectedHash.length) return false;
    let diff = 0;
    for (let i = 0; i < actualHash.length; i++) {
      diff |= actualHash[i] ^ expectedHash[i];
    }
    return diff === 0;
  } catch (err) {
    logger.error('[Auth] Password verification failed:', err);
    return false;
  }
}

// ── Session Tokens ───────────────────────────────────────────────

export interface SessionToken {
  token: string;
  expiresAt: number; // Unix timestamp in ms
  createdAt: number;
}

/**
 * Generate a cryptographically secure session token with embedded expiry.
 */
export function generateSessionToken(ttlMs: number = SESSION_TTL_MS): SessionToken {
  const now = Date.now();
  const token = `ts_${crypto.randomUUID()}_${now}`;
  return {
    token,
    expiresAt: now + ttlMs,
    createdAt: now,
  };
}

/**
 * Check if a session token is expired.
 */
export function isSessionExpired(expiresAt: number): boolean {
  return Date.now() > expiresAt;
}

// ── Password Reset Tokens ────────────────────────────────────────

export interface ResetToken {
  token: string;
  expiresAt: number;
  email: string;
}

/**
 * Generate a password reset token (1h expiry).
 */
export function generateResetToken(email: string): ResetToken {
  return {
    token: `rst_${crypto.randomUUID()}`,
    expiresAt: Date.now() + RESET_TOKEN_TTL_MS,
    email,
  };
}

/**
 * Validate a reset token hasn't expired.
 */
export function isResetTokenValid(token: ResetToken): boolean {
  return Date.now() <= token.expiresAt;
}

// ── Demo Account Hashes ──────────────────────────────────────────
// Pre-computed hashes for demo accounts (never send passwords to client)

/** 
 * In a real system these would be in the database.
 * Here we store them server-side only. The passwords are:
 * officer@morth.gov.in → Tender@2025
 * medtech@medtechsolutions.com → Bid@2025  
 * auditor@cag.gov.in → Audit@2025
 * admin@nic.gov.in → Admin@2025
 * 
 * Since PBKDF2 hashes are generated at runtime with random salts,
 * we use a fallback plain comparison wrapped in a constant-time check
 * for the demo mode only. In production, Supabase handles hashing.
 */
const DEMO_PASSWORDS: Record<string, string> = {
  'officer@morth.gov.in': 'Tender@2025',
  'medtech@medtechsolutions.com': 'Bid@2025',
  'auditor@cag.gov.in': 'Audit@2025',
  'admin@nic.gov.in': 'Admin@2025',
};

/**
 * Verify demo password with constant-time comparison.
 * This prevents timing attacks even in demo mode.
 */
export function verifyDemoPassword(email: string, password: string): boolean {
  const expected = DEMO_PASSWORDS[email];
  if (!expected) return false;

  // Constant-time string comparison
  const a = new TextEncoder().encode(password);
  const b = new TextEncoder().encode(expected);

  if (a.length !== b.length) {
    // Still do a dummy comparison to prevent timing leak on length
    let dummy = 0;
    for (let i = 0; i < b.length; i++) dummy |= b[i] ^ b[i];
    return dummy !== dummy; // always false but prevents optimization
  }

  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}
