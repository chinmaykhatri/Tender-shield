/**
 * TenderShield — Security Event Logger
 * 
 * Structured logging for security-relevant events:
 * - Authentication attempts (success/failure)
 * - IDOR violation attempts
 * - Rate limit hits
 * - Unusual traffic patterns
 * 
 * GDPR-safe: logs hashed IPs, never raw PII.
 */

import { logger } from '@/lib/logger';

// ── Types ────────────────────────────────────────────────────────

type SecurityEventType =
  | 'AUTH_LOGIN_SUCCESS'
  | 'AUTH_LOGIN_FAILED'
  | 'AUTH_SESSION_EXPIRED'
  | 'AUTH_TOKEN_INVALID'
  | 'AUTH_ROLE_MISMATCH'
  | 'IDOR_VIOLATION'
  | 'RATE_LIMIT_HIT'
  | 'CSRF_VIOLATION'
  | 'BOT_DETECTED'
  | 'SUSPICIOUS_PATTERN';

interface SecurityEvent {
  type: SecurityEventType;
  timestamp: string;
  ipHash: string;
  email?: string;
  endpoint?: string;
  details?: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

// ── IP Hashing (GDPR-safe) ──────────────────────────────────────

async function hashIP(ip: string): Promise<string> {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(ip + 'tendershield-salt-2025');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.slice(0, 8).map(b => b.toString(16).padStart(2, '0')).join('');
  } catch {
    return 'hash-error';
  }
}

// ── Anomaly Detection ────────────────────────────────────────────

const failedLoginTracker = new Map<string, { count: number; firstAt: number }>();
const ANOMALY_THRESHOLD = 10; // 10 failures in 15 min = alert
const ANOMALY_WINDOW_MS = 15 * 60 * 1000;

function checkForAnomalies(ipHash: string): boolean {
  const now = Date.now();
  const record = failedLoginTracker.get(ipHash);

  if (!record || now - record.firstAt > ANOMALY_WINDOW_MS) {
    failedLoginTracker.set(ipHash, { count: 1, firstAt: now });
    return false;
  }

  record.count++;
  return record.count >= ANOMALY_THRESHOLD;
}

// ── Public API ───────────────────────────────────────────────────

export async function logSecurityEvent(
  type: SecurityEventType,
  rawIP: string,
  details?: {
    email?: string;
    endpoint?: string;
    message?: string;
  }
): Promise<void> {
  const ipHash = await hashIP(rawIP);

  const severityMap: Record<SecurityEventType, SecurityEvent['severity']> = {
    AUTH_LOGIN_SUCCESS: 'LOW',
    AUTH_LOGIN_FAILED: 'MEDIUM',
    AUTH_SESSION_EXPIRED: 'LOW',
    AUTH_TOKEN_INVALID: 'MEDIUM',
    AUTH_ROLE_MISMATCH: 'HIGH',
    IDOR_VIOLATION: 'CRITICAL',
    RATE_LIMIT_HIT: 'MEDIUM',
    CSRF_VIOLATION: 'HIGH',
    BOT_DETECTED: 'MEDIUM',
    SUSPICIOUS_PATTERN: 'CRITICAL',
  };

  const event: SecurityEvent = {
    type,
    timestamp: new Date().toISOString(),
    ipHash,
    email: details?.email ? `${details.email.slice(0, 3)}***` : undefined,
    endpoint: details?.endpoint,
    details: details?.message,
    severity: severityMap[type],
  };

  // Log based on severity
  if (event.severity === 'CRITICAL' || event.severity === 'HIGH') {
    logger.error(`[SECURITY:${event.severity}] ${event.type}`, event);
  } else if (event.severity === 'MEDIUM') {
    logger.warn(`[SECURITY:${event.severity}] ${event.type}`, event);
  } else {
    logger.info(`[SECURITY:${event.severity}] ${event.type}`, event);
  }

  // Anomaly detection for failed logins
  if (type === 'AUTH_LOGIN_FAILED') {
    const isAnomaly = checkForAnomalies(ipHash);
    if (isAnomaly) {
      logger.error('[SECURITY:CRITICAL] SUSPICIOUS_PATTERN', {
        type: 'SUSPICIOUS_PATTERN',
        timestamp: new Date().toISOString(),
        ipHash,
        details: `${ANOMALY_THRESHOLD}+ failed logins from same IP in ${ANOMALY_WINDOW_MS / 60000} minutes`,
        severity: 'CRITICAL',
      });
    }
  }
}

// ── CSRF Protection ──────────────────────────────────────────────

/**
 * Validate Origin/Referer header against allowed origins.
 * Should be called on all state-changing (POST/PUT/DELETE) requests.
 */
export function validateOrigin(request: Request): { valid: boolean; error?: string } {
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');

  // Allow same-origin requests (no origin header = same origin)
  if (!origin && !referer) return { valid: true };

  const allowedOrigins = [
    process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    'http://localhost:3000',
    'http://localhost:3001',
  ];

  if (origin && allowedOrigins.some(ao => origin.startsWith(ao))) {
    return { valid: true };
  }

  if (referer && allowedOrigins.some(ao => referer.startsWith(ao))) {
    return { valid: true };
  }

  return { valid: false, error: `Origin rejected: ${origin || referer}` };
}
