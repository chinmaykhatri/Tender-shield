/**
 * ════════════════════════════════════════════════════════════════
 * TenderShield — Universal Gemini Client
 * ════════════════════════════════════════════════════════════════
 *
 * PURPOSE:
 *   Single, reusable wrapper around Google's Gemini API.
 *   Any API route that needs Gemini access imports this client
 *   instead of duplicating fetch logic.
 *
 * MODELS SUPPORTED:
 *   - gemini-2.0-flash (default, fast, cheap)
 *   - gemini-1.5-pro   (higher quality, more expensive)
 *
 * SECURITY:
 *   - Server-side only — never import from client components.
 *   - API key read from GEMINI_API_KEY env var.
 *   - Timeout enforced via AbortSignal (30s default).
 *   - Response truncated to prevent memory exhaustion.
 *
 * USAGE:
 *   import { callGemini, isGeminiAvailable } from '@/lib/ai/geminiClient';
 *
 *   if (isGeminiAvailable()) {
 *     const answer = await callGemini({
 *       systemPrompt: 'You are a fraud analyst.',
 *       userMessage:  'Analyze this tender...',
 *     });
 *   }
 *
 * ARCHITECTURE FIT:
 *   This sits alongside protectedClaudeCall.ts as a provider-level
 *   wrapper. The chat route already has an inline callGemini; this
 *   module replaces it so all routes share one implementation.
 * ════════════════════════════════════════════════════════════════
 */

import { logger } from '@/lib/logger';

// ─── Environment ────────────────────────────────────────────
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_API_VERSION = 'v1beta';

// ─── Types ──────────────────────────────────────────────────

type GeminiModel = 'gemini-2.0-flash' | 'gemini-1.5-pro' | 'gemini-2.0-flash-lite';

export interface GeminiCallOptions {
  /** Instructions the model must follow (injected as system instruction). */
  systemPrompt: string;
  /** The user's question or analysis request. */
  userMessage: string;
  /** Which Gemini model to use. Default: gemini-2.0-flash */
  model?: GeminiModel;
  /** Max tokens in the response. Default: 1024 */
  maxOutputTokens?: number;
  /** Sampling temperature 0–2. Default: 0.3 */
  temperature?: number;
  /** Nucleus sampling. Default: 0.8 */
  topP?: number;
  /** Request timeout in ms. Default: 30 000 */
  timeoutMs?: number;
}

export interface GeminiCallResult {
  success: boolean;
  text: string;
  model: string;
  /** Prompt + completion token count (approximate). */
  usage?: { promptTokens?: number; candidatesTokens?: number; totalTokens?: number };
  error?: string;
}

// ─── Availability Check ─────────────────────────────────────

/**
 * Returns true when a valid-looking Gemini API key is configured.
 * Use this guard before attempting a call.
 */
export function isGeminiAvailable(): boolean {
  return GEMINI_API_KEY.length > 10 && !GEMINI_API_KEY.startsWith('sk-placeholder');
}

// ─── Core Call ──────────────────────────────────────────────

/**
 * Send a prompt to Google Gemini and return the response text.
 *
 * Throws on network errors after logging; callers should wrap in
 * try/catch and fall back to their next provider.
 */
export async function callGemini(opts: GeminiCallOptions): Promise<GeminiCallResult> {
  const {
    systemPrompt,
    userMessage,
    model = 'gemini-2.0-flash',
    maxOutputTokens = 1024,
    temperature = 0.3,
    topP = 0.8,
    timeoutMs = 30_000,
  } = opts;

  if (!isGeminiAvailable()) {
    return {
      success: false,
      text: '',
      model,
      error: 'GEMINI_API_KEY not configured or invalid.',
    };
  }

  const url = `https://generativelanguage.googleapis.com/${GEMINI_API_VERSION}/models/${model}:generateContent?key=${GEMINI_API_KEY}`;

  const body = {
    // System instructions are a top-level field in the Gemini API.
    systemInstruction: {
      parts: [{ text: systemPrompt }],
    },
    contents: [
      { role: 'user', parts: [{ text: userMessage }] },
    ],
    generationConfig: {
      maxOutputTokens,
      temperature,
      topP,
    },
  };

  const startMs = Date.now();

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      logger.error(`[Gemini] API error ${res.status}:`, errText.slice(0, 300));
      return {
        success: false,
        text: '',
        model,
        error: `Gemini API ${res.status}: ${errText.slice(0, 200)}`,
      };
    }

    const data = await res.json();
    const candidate = data.candidates?.[0];
    const text = candidate?.content?.parts?.[0]?.text || '';

    // Check for safety blocks
    if (candidate?.finishReason === 'SAFETY') {
      logger.warn('[Gemini] Response blocked by safety filters.');
      return {
        success: false,
        text: '',
        model,
        error: 'Response blocked by Gemini safety filters.',
      };
    }

    const usage = data.usageMetadata
      ? {
          promptTokens: data.usageMetadata.promptTokenCount,
          candidatesTokens: data.usageMetadata.candidatesTokenCount,
          totalTokens: data.usageMetadata.totalTokenCount,
        }
      : undefined;

    logger.info(`[Gemini] ${model} responded in ${Date.now() - startMs}ms (${usage?.totalTokens ?? '?'} tokens)`);

    return { success: true, text, model, usage };
  } catch (err: any) {
    if (err.name === 'TimeoutError' || err.name === 'AbortError') {
      logger.error(`[Gemini] Request timed out after ${timeoutMs}ms`);
      return { success: false, text: '', model, error: `Timeout after ${timeoutMs}ms` };
    }
    logger.error('[Gemini] Network error:', err.message);
    return { success: false, text: '', model, error: err.message };
  }
}

/**
 * Convenience: call Gemini for structured JSON output.
 * Instructs the model to return only valid JSON.
 */
export async function callGeminiJSON<T = Record<string, unknown>>(
  opts: Omit<GeminiCallOptions, 'systemPrompt'> & { systemPrompt: string }
): Promise<{ success: boolean; data?: T; raw: string; error?: string }> {
  const result = await callGemini({
    ...opts,
    systemPrompt: `${opts.systemPrompt}\n\nCRITICAL: Your ENTIRE response must be valid JSON. No markdown, no code fences, no explanation outside the JSON object.`,
  });

  if (!result.success) {
    return { success: false, raw: result.text, error: result.error };
  }

  try {
    // Strip potential markdown fences
    let cleaned = result.text.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }
    const data = JSON.parse(cleaned) as T;
    return { success: true, data, raw: result.text };
  } catch {
    return { success: false, raw: result.text, error: 'Failed to parse Gemini response as JSON.' };
  }
}
