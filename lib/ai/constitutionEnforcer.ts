/**
 * Constitutional AI Safety Enforcer
 *
 * Three-layer enforcement:
 *   1. PRE-CALL: Input sanitization — block prompt injection attempts
 *   2. SYSTEM PROMPT: Constitution prepended to every Claude call
 *   3. POST-CALL: Output validation — scan for violations
 */
import { TENDERSHIELD_CONSTITUTION } from './constitution';

// Blocked input patterns (prompt injection, jailbreaks)
const BLOCKED_INPUT_PATTERNS = [
  /ignore.*(?:previous|above|system).*(?:instructions|prompt)/i,
  /forget.*(?:everything|rules|constraints)/i,
  /you are now/i,
  /pretend you/i,
  /act as (?:if|though)/i,
  /disregard.*(?:safety|guidelines)/i,
  /\bDAN\b/,
  /bypass.*(?:filter|safety|restriction)/i,
];

// Blocked output patterns (information leaks, off-scope)
const BLOCKED_OUTPUT_PATTERNS = [
  /system prompt/i,
  /my instructions are/i,
  /here (?:is|are) (?:my|the) (?:prompt|instructions)/i,
];

export interface EnforcementResult {
  allowed: boolean;
  violation?: string;
  violation_type?: 'INPUT_INJECTION' | 'OUTPUT_LEAK' | 'OFF_SCOPE';
  logged_at_ist: string;
}

export function enforceInputSafety(userInput: string): EnforcementResult {
  const now = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

  for (const pattern of BLOCKED_INPUT_PATTERNS) {
    if (pattern.test(userInput)) {
      return {
        allowed: false,
        violation: `Input blocked: matches injection pattern ${pattern.source}`,
        violation_type: 'INPUT_INJECTION',
        logged_at_ist: now,
      };
    }
  }

  return { allowed: true, logged_at_ist: now };
}

export function enforceOutputSafety(aiOutput: string): EnforcementResult {
  const now = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

  for (const pattern of BLOCKED_OUTPUT_PATTERNS) {
    if (pattern.test(aiOutput)) {
      return {
        allowed: false,
        violation: `Output blocked: potential system prompt leak`,
        violation_type: 'OUTPUT_LEAK',
        logged_at_ist: now,
      };
    }
  }

  return { allowed: true, logged_at_ist: now };
}

export function buildConstrainedPrompt(systemContext: string): string {
  return `${TENDERSHIELD_CONSTITUTION}\n\n---\n\n${systemContext}`;
}
