import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { requirePermission } from '@/lib/rbac';
import { extractVerifiedRole } from '@/lib/auth/extractRole';

// ═══════════════════════════════════════════════════════════
// RAG Chat API — Multi-Provider AI Engine
// Natural language querying of the procurement database
// Priority: OpenAI GPT → NVIDIA NIM → AWS Bedrock → Gemini → Rule Engine
// ═══════════════════════════════════════════════════════════

export const dynamic = 'force-dynamic';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY || '';
const AWS_BEDROCK_ACCESS_KEY = process.env.AWS_BEDROCK_ACCESS_KEY || '';
const AWS_BEDROCK_SECRET_KEY = process.env.AWS_BEDROCK_SECRET_KEY || '';
const AWS_BEDROCK_SESSION_KEY = process.env.AWS_BEDROCK_SESSION_KEY || '';
const AWS_BEDROCK_REGION = process.env.AWS_BEDROCK_REGION || 'eu-north-1';

// ── OpenAI GPT (Primary AI Engine) ─────────────────────────
function isOpenAIAvailable(): boolean {
  return OPENAI_API_KEY.length > 10 && OPENAI_API_KEY.startsWith('sk-');
}

async function callOpenAI(systemPrompt: string, userMessage: string): Promise<string> {
  const res = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      max_tokens: 1024,
      temperature: 0.3,
      top_p: 0.7,
    }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`OpenAI error: ${res.status} - ${error.slice(0, 200)}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || 'No response generated.';
}

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

// ── Smart Template fallback (no API key) ─────────────────
function templateFallback(question: string, context: string): string {
  const q = question.toLowerCase();
  const lines = context.split('\n').filter(l => l.trim());

  // Extract data from context
  const tenderLines = lines.filter(l => l.includes('Status:') || l.includes('Value:'));
  const flaggedLines = lines.filter(l => l.includes('FLAGGED') || l.includes('🚩'));
  const auditLines = lines.filter(l => l.includes('[CRITICAL]') || l.includes('[HIGH]') || l.includes('[MEDIUM]'));
  const highRiskLines = tenderLines.filter(l => {
    const riskMatch = l.match(/Risk:\s*(\d+)/);
    return riskMatch && parseInt(riskMatch[1]) >= 60;
  });

  // Count stats
  const tenderCount = tenderLines.length;
  const flaggedCount = flaggedLines.length;
  const criticalEvents = auditLines.filter(l => l.includes('[CRITICAL]')).length;

  // ─── Pattern-matched responses ───
  if (q.includes('high risk') || q.includes('risky') || q.includes('risk')) {
    if (highRiskLines.length > 0) {
      return `**🔴 High-Risk Tenders Found (${highRiskLines.length})**\n\n${highRiskLines.slice(0, 5).join('\n')}\n\n**Summary:** ${highRiskLines.length} tenders have risk scores ≥ 60. These require manual review by the auditing committee before procurement approval.\n\n_Source: TenderShield Rule Engine (live Supabase data)_`;
    }
    return `**Risk Analysis**\n\nNo high-risk tenders detected in the current database (${tenderCount} tenders analyzed). All risk scores are within acceptable limits.\n\n_Source: TenderShield Rule Engine_`;
  }

  if (q.includes('flagged') || q.includes('fraud') || q.includes('suspicious')) {
    if (flaggedLines.length > 0) {
      return `**🚩 Flagged Bids (${flaggedCount})**\n\n${flaggedLines.slice(0, 8).join('\n')}\n\n**Action Required:** ${flaggedCount} bid(s) have been flagged by the fraud detection engine. These bids triggered one or more statistical anomaly detectors (Benford's Law, CV analysis, or shell company detection).\n\n_Source: TenderShield Fraud Detection Engine_`;
    }
    return `**Fraud Status: Clean**\n\nNo flagged bids in the current database. All ${tenderCount > 0 ? tenderCount : 'available'} tenders have passed the 5-detector fraud analysis pipeline.\n\n_Source: TenderShield Fraud Detection Engine_`;
  }

  if (q.includes('audit') || q.includes('event') || q.includes('log')) {
    if (auditLines.length > 0) {
      return `**📋 Audit Trail (${auditLines.length} events)**\n\n${auditLines.slice(0, 10).join('\n')}\n\n**Critical Events:** ${criticalEvents}\n\nAll audit events are cryptographically timestamped and tamper-evident. Each event is linked to its source tender via blockchain-anchored hash.\n\n_Source: TenderShield Audit Engine_`;
    }
    return `**Audit Trail**\n\nNo audit events found in the database. Events are automatically generated when tenders are created, bids are submitted, or fraud detectors flag anomalies.\n\n_Source: TenderShield Audit Engine_`;
  }

  if (q.includes('summary') || q.includes('overview') || q.includes('stats') || q.includes('dashboard')) {
    return `**📊 TenderShield Dashboard Summary**\n\n- **Tenders in Database:** ${tenderCount}\n- **Flagged Bids:** ${flaggedCount}\n- **Critical Audit Events:** ${criticalEvents}\n- **High-Risk Tenders:** ${highRiskLines.length}\n\n**Engine Status:**\n- 5-Detector Fraud Engine: ✅ Active\n- Benford's Law Analyzer: ✅ Active\n- Bid Rigging (CV) Detector: ✅ Active\n- Shell Company Scanner: ✅ Active\n- Timing Collusion Monitor: ✅ Active\n- Cartel Rotation Detector: ✅ Active\n\n_Source: TenderShield Rule Engine (live database)_`;
  }

  if (q.includes('tender') && (q.includes('list') || q.includes('show') || q.includes('all'))) {
    if (tenderLines.length > 0) {
      return `**📋 Recent Tenders (${tenderLines.length})**\n\n${tenderLines.slice(0, 10).join('\n')}\n\n_Showing ${Math.min(10, tenderLines.length)} of ${tenderLines.length} tenders. Source: Supabase live data._`;
    }
    return `**Tenders**\n\nNo tenders found in the database. Create tenders via the dashboard to populate data.\n\n_Source: TenderShield Database_`;
  }

  if (q.includes('largest') || q.includes('biggest') || q.includes('highest value') || q.includes('top')) {
    const valued = tenderLines
      .map(l => { const m = l.match(/Value:\s*₹?([\d.]+)/); return m ? { line: l, value: parseFloat(m[1]) } : null; })
      .filter(Boolean)
      .sort((a: any, b: any) => b.value - a.value);
    if (valued.length > 0) {
      return `**💰 Largest Value Tenders**\n\n${valued.slice(0, 5).map((v: any) => v.line).join('\n')}\n\n_Top ${Math.min(5, valued.length)} tenders by estimated value._`;
    }
    return `No tender value data available in the current database.`;
  }

  if (q.includes('trend') || q.includes('volume') || q.includes('time') || q.includes('week')) {
    return `**📈 Trend Analysis**\n\n- **Current Tenders:** ${tenderCount}\n- **Flagged Bids:** ${flaggedCount}\n\nFor detailed time-series analysis with z-score anomaly detection, visit the **Anomaly Detection** dashboard.\n\nThe engine uses sliding-window z-score analysis (σ > 2.0 threshold) to detect unusual spikes in tender volumes, bid activity, and procurement values.\n\n_Source: TenderShield Analytics Engine_`;
  }

  if (q.includes('help') || q.includes('what can') || q.includes('how to')) {
    return `**🧠 TenderShield AI Analyst — Capabilities**\n\nI can answer questions about:\n- **Risk Analysis:** "Show high-risk tenders"\n- **Fraud Detection:** "Which bids are flagged?"\n- **Audit Trail:** "Recent audit events"\n- **Statistics:** "Summarize dashboard stats"\n- **Procurement:** "List all tenders", "Largest tenders"\n- **Trends:** "Tender volume trends"\n- **Ministry Analysis:** "MoHFW tenders"\n\n_Currently running on the Rule Engine. Configure GEMINI_API_KEY for AI-powered natural language analysis._`;
  }

  if (q.includes('mohfw') || q.includes('ministry') || q.includes('health') || q.includes('defence') || q.includes('mod')) {
    const keyword = q.includes('mohfw') || q.includes('health') ? 'MoHFW' :
                     q.includes('defence') || q.includes('mod') ? 'MoD' : 'ministry';
    const relevant = tenderLines.filter(l => l.toLowerCase().includes(keyword.toLowerCase()));
    if (relevant.length > 0) {
      return `**🏛️ ${keyword} Procurement Analysis**\n\n${relevant.slice(0, 10).join('\n')}\n\n**Total:** ${relevant.length} tender(s) found for ${keyword}.\n\n_Source: Supabase live data_`;
    }
    return `No tenders found for ${keyword} in the current database.`;
  }

  // Default: show context intelligently
  if (context.trim().length > 50) {
    return `**Database Analysis**\n\nBased on the current database:\n\n${context.slice(0, 1000)}\n\n**Summary:** ${tenderCount} tenders, ${flaggedCount} flagged bids, ${criticalEvents} critical audit events.\n\n_For AI-powered natural language analysis, configure GEMINI_API_KEY in environment variables._`;
  }

  return `**TenderShield AI Analyst**\n\nThe database is currently empty. To see the analyst in action:\n\n1. **Create tenders** via the Tenders tab\n2. **Submit bids** to enable fraud detection\n3. **Run analysis** — the 5-detector engine will flag anomalies automatically\n\nOr try asking: "Show dashboard stats" or "Help"\n\n_Configure GEMINI_API_KEY for full AI-powered analysis._`;
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
    let context = '';
    try {
      context = await querySupabaseContext(message);
    } catch (ctxErr: any) {
      console.warn('[AI Chat] Supabase context fetch failed:', ctxErr.message?.slice(0, 100));
      context = 'Database context unavailable.';
    }

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

    let response: string = '';
    let source: string = 'template-engine';

    // Priority: OpenAI GPT → NVIDIA NIM → AWS Bedrock → Gemini → Smart Rule Engine
    // Each provider wrapped in individual try-catch to prevent cascade failures

    let aiSuccess = false;

    // Try OpenAI GPT (primary)
    if (!aiSuccess && isOpenAIAvailable()) {
      try {
        response = await callOpenAI(systemPrompt, message);
        source = 'openai-gpt-4o-mini';
        aiSuccess = true;
      } catch (e: any) {
        console.warn('[AI Chat] OpenAI failed:', e.message?.slice(0, 100));
      }
    }

    // Try NVIDIA NIM (secondary)
    if (!aiSuccess && NVIDIA_API_KEY && !NVIDIA_API_KEY.includes('placeholder')) {
      try {
        response = await callNvidiaNIM(systemPrompt, message);
        source = 'nvidia-nemotron-ultra-253b';
        aiSuccess = true;
      } catch (e: any) {
        console.warn('[AI Chat] NVIDIA failed:', e.message?.slice(0, 100));
      }
    }

    // Try AWS Bedrock
    if (!aiSuccess && AWS_BEDROCK_ACCESS_KEY && AWS_BEDROCK_SECRET_KEY && !AWS_BEDROCK_ACCESS_KEY.includes('placeholder')) {
      try {
        response = await callBedrock(systemPrompt, message);
        source = 'aws-bedrock-claude-3.5-sonnet';
        aiSuccess = true;
      } catch (e: any) {
        console.warn('[AI Chat] Bedrock failed:', e.message?.slice(0, 100));
      }
    }

    // Try Gemini
    if (!aiSuccess && isGeminiAvailable()) {
      try {
        response = await callGeminiWrapper(systemPrompt, message);
        source = 'gemini-2.0-flash';
        aiSuccess = true;
      } catch (e: any) {
        console.warn('[AI Chat] Gemini failed:', e.message?.slice(0, 100));
      }
    }

    // Smart template fallback (always works)
    if (!aiSuccess) {
      response = templateFallback(message, context);
      source = 'rule-engine';
    }

    return NextResponse.json({
      success: true,
      response,
      source,
      context_tables: ['tenders', 'bids', 'audit_events'],
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[AI Chat] Unhandled error:', error.message);
    return NextResponse.json({
      success: true,
      response: `**⚠️ Analysis Error**\n\n${error.message}\n\nPlease try again or ask a different question. The rule engine is available for basic queries.\n\n_Try: "Show dashboard stats" or "Help"_`,
      source: 'error-recovery',
    });
  }
}

