import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { requirePermission } from '@/lib/rbac';
import { extractVerifiedRole } from '@/lib/auth/extractRole';

// ═══════════════════════════════════════════════════════════
// RAG Chat API — Multi-Provider AI Engine
// Natural language querying of the procurement database
// Priority: NVIDIA NIM → AWS Bedrock (Claude) → Gemini → Template
// ═══════════════════════════════════════════════════════════

export const dynamic = 'force-dynamic';

const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY || '';
const AWS_BEDROCK_ACCESS_KEY = process.env.AWS_BEDROCK_ACCESS_KEY || '';
const AWS_BEDROCK_SECRET_KEY = process.env.AWS_BEDROCK_SECRET_KEY || '';
const AWS_BEDROCK_SESSION_KEY = process.env.AWS_BEDROCK_SESSION_KEY || '';
const AWS_BEDROCK_REGION = process.env.AWS_BEDROCK_REGION || 'eu-north-1';
// NOTE: GEMINI_API_KEY is read by lib/ai/geminiClient.ts — no need to read it here.

// ── Supabase Context Fetcher ───────────────────────────────
async function querySupabaseContext(question: string) {
  const sb = getSupabaseAdmin();
  const context: string[] = [];

  const { data: tenders } = await sb
    .from('tenders')
    .select('id, title, status, estimated_value, ministry_code, risk_score, created_at')
    .order('created_at', { ascending: false })
    .limit(20);

  if (tenders?.length) {
    context.push(`RECENT TENDERS (${tenders.length}):\n${tenders.map((t: any) =>
      `- ${t.title || t.id} | Status: ${t.status} | Value: ₹${t.estimated_value} | Ministry: ${t.ministry_code} | Risk: ${t.risk_score || 'N/A'}`
    ).join('\n')}`);
  }

  const { data: bids } = await sb
    .from('bids')
    .select('id, tender_id, bidder_name, amount, flagged, created_at')
    .order('created_at', { ascending: false })
    .limit(30);

  if (bids?.length) {
    const flaggedCount = bids.filter((b: any) => b.flagged).length;
    context.push(`RECENT BIDS (${bids.length}, ${flaggedCount} flagged):\n${bids.slice(0, 10).map((b: any) =>
      `- ${b.bidder_name || 'Unknown'} on ${b.tender_id} | ₹${b.amount} | ${b.flagged ? '🚩 FLAGGED' : '✅ Clean'}`
    ).join('\n')}`);
  }

  const { data: events } = await sb
    .from('audit_events')
    .select('action_type, severity, details, tender_id, timestamp_ist')
    .order('timestamp_ist', { ascending: false })
    .limit(15);

  if (events?.length) {
    context.push(`RECENT AUDIT EVENTS (${events.length}):\n${events.map((e: any) =>
      `- [${e.severity}] ${e.action_type}: ${(e.details || '').slice(0, 80)} ${e.tender_id ? `(${e.tender_id})` : ''}`
    ).join('\n')}`);
  }

  return context.join('\n\n');
}

// ── NVIDIA NIM (OpenAI-compatible) ─────────────────────────
async function callNvidiaNIM(systemPrompt: string, userMessage: string): Promise<string> {
  const res = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${NVIDIA_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'nvidia/llama-3.1-nemotron-ultra-253b-v1',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      max_tokens: 1024,
      temperature: 0.3,
      top_p: 0.7,
      stream: false,
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`NVIDIA NIM error: ${res.status} - ${error.slice(0, 200)}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || 'No response generated.';
}

// ── AWS Bedrock (Claude 3.5 Sonnet via official SDK) ───────
async function callBedrock(systemPrompt: string, userMessage: string): Promise<string> {
  // Dynamic import to avoid bundling issues in edge runtime
  const { BedrockRuntimeClient, ConverseCommand } = await import('@aws-sdk/client-bedrock-runtime');

  const credentials: any = {
    accessKeyId: AWS_BEDROCK_ACCESS_KEY,
    secretAccessKey: AWS_BEDROCK_SECRET_KEY,
  };
  // Include session token if provided (for temporary credentials)
  if (AWS_BEDROCK_SESSION_KEY) {
    credentials.sessionToken = AWS_BEDROCK_SESSION_KEY;
  }

  const client = new BedrockRuntimeClient({
    region: AWS_BEDROCK_REGION,
    credentials,
  });

  const command = new ConverseCommand({
    modelId: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
    messages: [
      {
        role: 'user',
        content: [{ text: `${systemPrompt}\n\nUser Question: ${userMessage}` }],
      },
    ],
    system: [{ text: systemPrompt }],
    inferenceConfig: {
      maxTokens: 1024,
      temperature: 0.3,
      topP: 0.7,
    },
  });

  try {
    const response = await client.send(command);
    const outputText = response.output?.message?.content?.[0]?.text;
    if (outputText) return outputText;

    // Fallback: try to extract from any content block
    const contentBlocks = response.output?.message?.content || [];
    for (const block of contentBlocks) {
      if ('text' in block && block.text) return block.text;
    }
    throw new Error('No text content in Bedrock response');
  } catch (err: any) {
    // If Claude 3.5 Sonnet v2 not available, try v1 or Haiku
    if (err.name === 'ValidationException' || err.name === 'AccessDeniedException') {
      console.warn('[Bedrock] Claude 3.5 Sonnet v2 unavailable, trying Claude 3 Sonnet...');
      const fallbackCmd = new ConverseCommand({
        modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
        messages: [
          {
            role: 'user',
            content: [{ text: `${systemPrompt}\n\nUser Question: ${userMessage}` }],
          },
        ],
        system: [{ text: systemPrompt }],
        inferenceConfig: { maxTokens: 1024, temperature: 0.3 },
      });
      const fallbackRes = await client.send(fallbackCmd);
      return fallbackRes.output?.message?.content?.[0]?.text || 'No response generated.';
    }
    throw err;
  }
}

// ── Gemini (via universal client) ──────────────────────────
// Delegated to lib/ai/geminiClient.ts — single shared implementation.
// See that module for model selection, timeout, and safety filter handling.
import { callGemini as callGeminiClient, isGeminiAvailable } from '@/lib/ai/geminiClient';

async function callGeminiWrapper(systemPrompt: string, userMessage: string): Promise<string> {
  const result = await callGeminiClient({ systemPrompt, userMessage });
  if (!result.success) {
    throw new Error(result.error || 'Gemini call failed');
  }
  return result.text;
}

// ── Template fallback (no API key) ─────────────────────
function templateFallback(question: string, context: string): string {
  const q = question.toLowerCase();
  if (q.includes('high risk') || q.includes('risky')) {
    return `Based on the current database:\n\n${context.split('\n').filter(l => l.includes('Risk:')).join('\n') || 'No risk data available.'}\n\n_AI analyst is in template mode. Configure NVIDIA_API_KEY or AWS_BEDROCK keys for full analysis._`;
  }
  if (q.includes('flagged') || q.includes('fraud')) {
    return `Flagged items from database:\n\n${context.split('\n').filter(l => l.includes('FLAGGED') || l.includes('FRAUD')).join('\n') || 'No flagged items found.'}\n\n_Template mode active._`;
  }
  return `Here is the current database context:\n\n${context.slice(0, 800)}\n\n_Configure NVIDIA_API_KEY or AWS Bedrock credentials for intelligent analysis._`;
}

// ── Main POST Handler ──────────────────────────────────────
export async function POST(req: NextRequest) {
  // SECURITY: Role extracted ONLY from HMAC-signed ts_session cookie
  const role = await extractVerifiedRole(req);
  const denied = requirePermission(role, 'ai_analyze');
  if (denied) return denied;

  try {
    const { message, history = [] } = await req.json();

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // 1. Gather Supabase context
    const context = await querySupabaseContext(message);

    // 2. Build system prompt
    const systemPrompt = `You are TenderShield AI Analyst — an expert in Indian government procurement fraud detection.
You have access to LIVE database context from the TenderShield platform.
Analyze the data and answer the user's question concisely. Use specific numbers and tender IDs when available.
Format your response with bullet points and bold for key findings. Keep it under 300 words.

LIVE DATABASE CONTEXT:
${context}

RULES:
- Reference specific tenders by ID when possible
- Highlight risk scores and fraud flags
- If data is insufficient, say so honestly
- Never fabricate data not in the context above
- Use ₹ for currency, Cr for crore`;

    let response: string;
    let source: string;

    // Priority: NVIDIA NIM → AWS Bedrock → Gemini → Template
    if (NVIDIA_API_KEY) {
      try {
        response = await callNvidiaNIM(systemPrompt, message);
        source = 'nvidia-nemotron-ultra-253b';
      } catch (e: any) {
        console.warn('[AI Chat] NVIDIA failed:', e.message?.slice(0, 100));
        if (AWS_BEDROCK_ACCESS_KEY && AWS_BEDROCK_SECRET_KEY) {
          try {
            response = await callBedrock(systemPrompt, message);
            source = 'aws-bedrock-claude-3.5-sonnet';
          } catch (e2: any) {
            console.warn('[AI Chat] Bedrock failed:', e2.message?.slice(0, 100));
            if (isGeminiAvailable()) {
              response = await callGeminiWrapper(systemPrompt, message);
              source = 'gemini-2.0-flash';
            } else {
              response = templateFallback(message, context);
              source = 'template-engine';
            }
          }
        } else if (isGeminiAvailable()) {
          response = await callGeminiWrapper(systemPrompt, message);
          source = 'gemini-2.0-flash';
        } else {
          response = templateFallback(message, context);
          source = 'template-engine';
        }
      }
    } else if (AWS_BEDROCK_ACCESS_KEY && AWS_BEDROCK_SECRET_KEY) {
      try {
        response = await callBedrock(systemPrompt, message);
        source = 'aws-bedrock-claude-3.5-sonnet';
      } catch (e: any) {
        console.warn('[AI Chat] Bedrock failed:', e.message?.slice(0, 100));
        if (isGeminiAvailable()) {
          response = await callGeminiWrapper(systemPrompt, message);
          source = 'gemini-2.0-flash';
        } else {
          response = templateFallback(message, context);
          source = 'template-engine';
        }
      }
    } else if (isGeminiAvailable()) {
      response = await callGeminiWrapper(systemPrompt, message);
      source = 'gemini-2.0-flash';
    } else {
      response = templateFallback(message, context);
      source = 'template-engine';
    }

    return NextResponse.json({
      success: true,
      response,
      source,
      context_tables: ['tenders', 'bids', 'audit_events'],
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      response: `Analysis failed: ${error.message}. Please try again.`,
      source: 'error',
    }, { status: 500 });
  }
}
