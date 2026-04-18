/**
 * ════════════════════════════════════════════════════════════════
 * TenderShield — Universal NVIDIA NIM Client (OpenAI-compatible)
 * ════════════════════════════════════════════════════════════════
 *
 * PURPOSE:
 *   Single, reusable wrapper around NVIDIA NIM's OpenAI-compatible API.
 *   All AI features now use this instead of direct Anthropic calls.
 *
 * MODELS SUPPORTED:
 *   - nvidia/llama-3.1-nemotron-ultra-253b-v1 (primary, high quality)
 *   - nvidia/llama-3.1-nemotron-70b-instruct  (faster, cheaper)
 *
 * SECURITY:
 *   - Server-side only — never import from client components.
 *   - API key read from OPENAI_API_KEY or NVIDIA_API_KEY env var.
 *   - Timeout enforced via AbortSignal (30s default).
 *
 * USAGE:
 *   import { callNIM, isNIMAvailable } from '@/lib/ai/nimClient';
 *
 *   if (isNIMAvailable()) {
 *     const answer = await callNIM({
 *       systemPrompt: 'You are a fraud analyst.',
 *       userMessage:  'Analyze this tender...',
 *     });
 *   }
 * ════════════════════════════════════════════════════════════════
 */

import { logger } from '@/lib/logger';

// ─── Environment ────────────────────────────────────────────
const NIM_API_KEY = process.env.OPENAI_API_KEY || process.env.NVIDIA_API_KEY || '';
const NIM_BASE_URL = process.env.OPENAI_BASE_URL || 'https://integrate.api.nvidia.com/v1';
const IS_OPENAI = NIM_BASE_URL.includes('api.openai.com');
const DEFAULT_MODEL = IS_OPENAI ? 'gpt-4o-mini' : 'nvidia/llama-3.1-nemotron-ultra-253b-v1';

// ─── Types ──────────────────────────────────────────────────

type NIMModel =
  | 'nvidia/llama-3.1-nemotron-ultra-253b-v1'
  | 'nvidia/llama-3.1-nemotron-70b-instruct'
  | 'meta/llama-3.1-70b-instruct'
  | string;

export interface NIMCallOptions {
  /** System instructions for the model. */
  systemPrompt: string;
  /** The user's question or analysis request. */
  userMessage: string;
  /** Which model to use. Default: nvidia/llama-3.1-nemotron-ultra-253b-v1 */
  model?: NIMModel;
  /** Max tokens in the response. Default: 1024 */
  maxTokens?: number;
  /** Sampling temperature 0–2. Default: 0.3 */
  temperature?: number;
  /** Nucleus sampling. Default: 0.8 */
  topP?: number;
  /** Request timeout in ms. Default: 30 000 */
  timeoutMs?: number;
}

export interface NIMCallResult {
  success: boolean;
  text: string;
  model: string;
  usage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number };
  error?: string;
}

// ─── Availability Check ─────────────────────────────────────

/**
 * Returns true when a valid-looking NVIDIA NIM API key is configured.
 */
export function isNIMAvailable(): boolean {
  return NIM_API_KEY.length > 10 && !NIM_API_KEY.startsWith('sk-placeholder') && !NIM_API_KEY.includes('your-');
}

// ─── Core Call ──────────────────────────────────────────────

/**
 * Send a prompt to NVIDIA NIM (OpenAI-compatible) and return the response text.
 */
export async function callNIM(opts: NIMCallOptions): Promise<NIMCallResult> {
  const {
    systemPrompt,
    userMessage,
    model = DEFAULT_MODEL,
    maxTokens = 1024,
    temperature = 0.3,
    topP = 0.8,
    timeoutMs = 30_000,
  } = opts;

  if (!isNIMAvailable()) {
    return {
      success: false,
      text: '',
      model,
      error: 'NVIDIA NIM API key not configured (set OPENAI_API_KEY or NVIDIA_API_KEY).',
    };
  }

  const url = `${NIM_BASE_URL}/chat/completions`;

  const body = {
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    max_tokens: maxTokens,
    temperature,
    top_p: topP,
    stream: false,
  };

  const startMs = Date.now();

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${NIM_API_KEY}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      logger.error(`[NIM] API error ${res.status}:`, errText.slice(0, 300));
      return {
        success: false,
        text: '',
        model,
        error: `NIM API ${res.status}: ${errText.slice(0, 200)}`,
      };
    }

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || '';

    const usage = data.usage
      ? {
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens,
        }
      : undefined;

    logger.info(`[NIM] ${model} responded in ${Date.now() - startMs}ms (${usage?.totalTokens ?? '?'} tokens)`);

    return { success: true, text, model, usage };
  } catch (err: any) {
    if (err.name === 'TimeoutError' || err.name === 'AbortError') {
      logger.error(`[NIM] Request timed out after ${timeoutMs}ms`);
      return { success: false, text: '', model, error: `Timeout after ${timeoutMs}ms` };
    }
    logger.error('[NIM] Network error:', err.message);
    return { success: false, text: '', model, error: err.message };
  }
}

/**
 * Convenience: call NIM for structured JSON output.
 * Instructs the model to return only valid JSON.
 */
export async function callNIMJSON<T = Record<string, unknown>>(
  opts: Omit<NIMCallOptions, 'systemPrompt'> & { systemPrompt: string }
): Promise<{ success: boolean; data?: T; raw: string; error?: string }> {
  const result = await callNIM({
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
    return { success: false, raw: result.text, error: 'Failed to parse NIM response as JSON.' };
  }
}
