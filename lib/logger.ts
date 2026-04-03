/**
 * TenderShield — Production Logger
 * Replaces console.error/warn/log across API routes with a structured logger.
 * 
 * In production: uses structured JSON logs for monitoring tools (Grafana, Datadog, etc.)
 * In development: uses familiar console output with timestamp + context
 *
 * Usage:
 *   import { logger } from '@/lib/logger';
 *   logger.error('[AutoLock] Error:', error);
 *   logger.warn('[TenderShield] Rate limit hit');
 *   logger.info('[TenderShield] Analysis complete');
 */

type LogLevel = 'ERROR' | 'WARN' | 'INFO' | 'DEBUG';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  service: string;
  message: string;
  context?: Record<string, unknown>;
}

const IS_DEV = process.env.NODE_ENV === 'development';

function formatLog(entry: LogEntry): string {
  if (IS_DEV) {
    const ctx = entry.context ? ` ${JSON.stringify(entry.context)}` : '';
    return `[${entry.timestamp}] ${entry.level} ${entry.service}: ${entry.message}${ctx}`;
  }
  // Production: structured JSON for log aggregators
  return JSON.stringify(entry);
}

function createLogEntry(level: LogLevel, args: unknown[]): LogEntry {
  const firstArg = typeof args[0] === 'string' ? args[0] : '';
  const serviceMatch = firstArg.match(/\[([^\]]+)\]/);
  const service = serviceMatch ? serviceMatch[1] : 'TenderShield';
  const message = args.map(a => (typeof a === 'string' ? a : a instanceof Error ? a.message : JSON.stringify(a))).join(' ');

  return {
    timestamp: new Date().toISOString(),
    level,
    service,
    message,
    context: args.length > 1 && typeof args[args.length - 1] === 'object' && !(args[args.length - 1] instanceof Error)
      ? args[args.length - 1] as Record<string, unknown>
      : undefined,
  };
}

export const logger = {
  error(...args: unknown[]) {
    const entry = createLogEntry('ERROR', args);
    if (IS_DEV) {
      // eslint-disable-next-line no-console
      console.error(formatLog(entry));
    } else {
      // In production, write to stderr for container log collection  
      process.stderr?.write?.(formatLog(entry) + '\n');
    }
  },

  warn(...args: unknown[]) {
    const entry = createLogEntry('WARN', args);
    if (IS_DEV) {
      // eslint-disable-next-line no-console
      console.warn(formatLog(entry));
    }
    // In production: warnings are suppressed (or sent to log aggregator)
  },

  info(...args: unknown[]) {
    const entry = createLogEntry('INFO', args);
    if (IS_DEV) {
      // eslint-disable-next-line no-console
      console.log(formatLog(entry));
    }
    // In production: info logs are suppressed
  },

  debug(...args: unknown[]) {
    if (IS_DEV) {
      const entry = createLogEntry('DEBUG', args);
      // eslint-disable-next-line no-console
      console.debug(formatLog(entry));
    }
    // Debug is always suppressed in production
  },
};
