// FILE: lib/ai/protectedClaudeCall.ts
// SECURITY LAYER: 3-layer protection for every AI call
// BREAKS IF REMOVED: YES — AI completely unprotected

import { TENDERSHIELD_CONSTITUTION } from './constitution';
import { detectPromptInjection } from '../security/sanitize';
import { logSecurityAttempt } from './securityLogger';
import { enforceInputSafety, enforceOutputSafety } from './constitutionEnforcer';

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
  const constitutionalCheck = enforceInputSafety(userMessage);
  if (injectionCheck.detected || !constitutionalCheck.allowed) {
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
      blockReason: !constitutionalCheck.allowed
        ? `constitutional_enforcement: ${constitutionalCheck.violation_type}`
        : 'prompt_injection_detected',
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

  // ── NVIDIA NIM (OpenAI-compatible) ─────────────────────────
  const apiKey = process.env.OPENAI_API_KEY || process.env.NVIDIA_API_KEY || '';
  const baseUrl = process.env.OPENAI_BASE_URL || 'https://integrate.api.nvidia.com/v1';
  if (!apiKey || apiKey.length < 10) {
    // No API key — AI call skipped
    return { success: false, blocked: false };
  }

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: baseUrl.includes('api.openai.com') ? 'gpt-4o-mini' : 'nvidia/llama-3.1-nemotron-ultra-253b-v1',
        max_tokens: maxTokens,
        stream: false,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: truncatedMessage },
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      // NIM API error — handled gracefully
      return { success: false, blocked: false };
    }

    if (stream) {
      return { success: true, stream: response.body };
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content ?? '';

    // ─────────────────────────────────────────
    // Post-flight: Check if AI refused
    // Log the event if constitution triggered
    // ─────────────────────────────────────────
    const REFUSAL_PHRASE = 'TenderShield AI cannot assist with that request';
    const outputCheck = enforceOutputSafety(text);
    if (text.includes(REFUSAL_PHRASE) || !outputCheck.allowed) {
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
        blockReason: !outputCheck.allowed
          ? `output_enforcement: ${outputCheck.violation_type}`
          : 'constitution_triggered',
      };
    }

    return { success: true, text };
  } catch (error) {
    // protectedNIMCall error — handled gracefully
    return { success: false, blocked: false };
  }
}

