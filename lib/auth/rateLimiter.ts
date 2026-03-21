// FILE: lib/auth/rateLimiter.ts
// SECURITY LAYER: Blocks brute force password guessing
// BREAKS IF REMOVED: NO — just less secure

/**
 * Simple in-memory rate limiter for Vercel Edge/Serverless.
 * Tracks login attempts per identifier (IP or email).
 * In production, this should use Redis.
 */

const attempts = new Map<string, { count: number; resetAt: number }>();

// Clean up expired entries periodically
const CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 min
let lastCleanup = Date.now();

function cleanupExpired() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [key, record] of attempts.entries()) {
    if (record.resetAt < now) attempts.delete(key);
  }
}

export function checkRateLimit(
  identifier: string,
  maxAttempts: number = 5,
  windowMs: number = 15 * 60 * 1000 // 15 minutes
): { allowed: boolean; remainingAttempts: number; resetAt: number } {
  cleanupExpired();
  const now = Date.now();
  const key = `login:${identifier}`;
  const record = attempts.get(key);

  // Clean up if expired
  if (record && record.resetAt < now) {
    attempts.delete(key);
  }

  const current = attempts.get(key);

  if (!current) {
    attempts.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remainingAttempts: maxAttempts - 1, resetAt: now + windowMs };
  }

  if (current.count >= maxAttempts) {
    return { allowed: false, remainingAttempts: 0, resetAt: current.resetAt };
  }

  current.count++;
  return {
    allowed: true,
    remainingAttempts: maxAttempts - current.count,
    resetAt: current.resetAt,
  };
}

export function clearRateLimit(identifier: string): void {
  attempts.delete(`login:${identifier}`);
}
