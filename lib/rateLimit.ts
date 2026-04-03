/**
 * TenderShield — API Rate Limiter
 * In-memory sliding window rate limiter for API endpoints.
 * 
 * Usage:
 *   import { rateLimit } from '@/lib/rateLimit';
 *   const limiter = rateLimit({ interval: 60_000, limit: 10 });
 *   
 *   export async function POST(req: NextRequest) {
 *     const ip = req.headers.get('x-forwarded-for') ?? 'unknown';
 *     const { success, remaining } = limiter.check(ip);
 *     if (!success) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
 *     ...
 *   }
 */

interface RateLimitConfig {
  /** Time window in milliseconds (default: 60s) */
  interval: number;
  /** Max requests per window (default: 10) */
  limit: number;
}

interface RateLimitEntry {
  timestamps: number[];
}

interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: number;
}

export function rateLimit(config: RateLimitConfig = { interval: 60_000, limit: 10 }) {
  const store = new Map<string, RateLimitEntry>();

  // Cleanup stale entries every 5 minutes
  if (typeof setInterval !== 'undefined') {
    setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of store) {
        entry.timestamps = entry.timestamps.filter(t => now - t < config.interval);
        if (entry.timestamps.length === 0) store.delete(key);
      }
    }, 5 * 60_000);
  }

  return {
    check(identifier: string): RateLimitResult {
      const now = Date.now();
      const entry = store.get(identifier) || { timestamps: [] };

      // Remove expired timestamps
      entry.timestamps = entry.timestamps.filter(t => now - t < config.interval);

      if (entry.timestamps.length >= config.limit) {
        const oldestInWindow = entry.timestamps[0];
        return {
          success: false,
          remaining: 0,
          resetAt: oldestInWindow + config.interval,
        };
      }

      entry.timestamps.push(now);
      store.set(identifier, entry);

      return {
        success: true,
        remaining: config.limit - entry.timestamps.length,
        resetAt: now + config.interval,
      };
    },

    /** Reset all rate limits (for testing) */
    reset() {
      store.clear();
    },
  };
}

// Pre-configured limiters for different endpoint types
export const aiLimiter = rateLimit({ interval: 60_000, limit: 10 });   // 10 AI calls/min
export const authLimiter = rateLimit({ interval: 60_000, limit: 5 });   // 5 login attempts/min
export const apiLimiter = rateLimit({ interval: 60_000, limit: 30 });   // 30 API calls/min
