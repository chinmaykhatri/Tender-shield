// FILE: lib/ai/protectedClaudeCall.ts
// SECURITY LAYER: 3-layer protection for every AI call
// BREAKS IF REMOVED: YES — AI completely unprotected

import { TENDERSHIELD_CONSTITUTION } from './constitution';
import { detectPromptInjection } from '../security/sanitize';
import { logSecurityAttempt } from './securityLogger';

interface ClaudeCallOptions {
  taskInstructions: string;
  userMessage: string;
  maxTokens?: number;
  stream?: boolean;
  userId?: string;
  endpoint?: string;
  ipAddress?: string;
}

interface ClaudeCallResult {
  success: boolean;
  text?: string;
  stream?: ReadableStream | null;
  blocked?: boolean;
  blockReason?: string;
}

/**
 * Protected Claude API call with 3 layers of security:
 * 
 * LAYER 1: Pre-flight injection check
 *   - Checks user message for prompt injection patterns BEFORE sending to Claude
 *   - Logs blocked attempts to security_log table
 * 
 * LAYER 2: Constitutional constraint
 *   - Every call includes the full TenderShield constitution as system prompt
 *   - Claude is constrained to procurement analysis only
 * 
 * LAYER 3: Message length limit
 *   - Truncates messages to 8000 chars to prevent token exhaustion attacks
 *   - Post-flight: checks if Claude triggered constitutional refusal
 */
export async function protectedClaudeCall(
  options: ClaudeCallOptions
): Promise<ClaudeCallResult> {
  const {
    taskInstructions,
    userMessage,
    maxTokens = 1000,
    stream = false,
    userId,
    endpoint = '/api/ai/unknown',
    ipAddress,
  } = options;

  // ─────────────────────────────────────────
  // LAYER 1: Pre-flight injection check
  // ─────────────────────────────────────────
  const injectionCheck = detectPromptInjection(userMessage);
  if (injectionCheck.detected) {
    if (userId) {
      await logSecurityAttempt({
        user_id: userId,
        endpoint,
        user_message: userMessage.slice(0, 500),
        ip_address: ipAddress ?? undefined,
      });
    }
    console.warn(`[TenderShield] 🚨 Prompt injection blocked on ${endpoint}:`, injectionCheck.pattern);
    return {
      success: false,
      blocked: true,
      blockReason: 'prompt_injection_detected',
    };
  }

  // ─────────────────────────────────────────
  // LAYER 2: Constitutional constraint
  // Every call includes the full constitution
  // ─────────────────────────────────────────
  const systemPrompt = TENDERSHIELD_CONSTITUTION + '\n\n' + taskInstructions;

  // ─────────────────────────────────────────
  // LAYER 3: Message length limit
  // Prevents token exhaustion attacks
  // ─────────────────────────────────────────
  const truncatedMessage = userMessage.slice(0, 8000);

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn('[TenderShield] No ANTHROPIC_API_KEY — AI call skipped');
    return { success: false, blocked: false };
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: maxTokens,
        stream,
        system: systemPrompt,
        messages: [{ role: 'user', content: truncatedMessage }],
      }),
    });

    if (!response.ok) {
      console.error('[TenderShield] Anthropic API error:', response.status);
      return { success: false, blocked: false };
    }

    if (stream) {
      return { success: true, stream: response.body };
    }

    const data = await response.json();
    const text = data.content?.[0]?.text ?? '';

    // ─────────────────────────────────────────
    // Post-flight: Check if Claude refused
    // Log the event if constitution triggered
    // ─────────────────────────────────────────
    const REFUSAL_PHRASE = 'TenderShield AI cannot assist with that request';
    if (text.includes(REFUSAL_PHRASE)) {
      if (userId) {
        await logSecurityAttempt({
          user_id: userId,
          endpoint,
          user_message: userMessage.slice(0, 500),
          ip_address: ipAddress ?? undefined,
        });
      }
      return {
        success: false,
        blocked: true,
        blockReason: 'constitution_triggered',
      };
    }

    return { success: true, text };
  } catch (error) {
    console.error('[TenderShield] protectedClaudeCall error:', error);
    return { success: false, blocked: false };
  }
}
