import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

// ═══════════════════════════════════════════════════════════
// RAG Chat API — Gemini + Supabase Context
// Natural language querying of the procurement database
// ═══════════════════════════════════════════════════════════

export const dynamic = 'force-dynamic';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

async function querySupabaseContext(question: string) {
  const sb = getSupabaseAdmin();
  const context: string[] = [];

  // Fetch latest tenders
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

  // Fetch bid stats
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

  // Fetch recent audit events
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

async function callGemini(systemPrompt: string, userMessage: string): Promise<string> {
  const res = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        { role: 'user', parts: [{ text: `${systemPrompt}\n\nUser Question: ${userMessage}` }] },
      ],
      generationConfig: {
        maxOutputTokens: 1024,
        temperature: 0.3,
      },
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Gemini API error: ${res.status} - ${error.slice(0, 200)}`);
  }

  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated.';
}

function templateFallback(question: string, context: string): string {
  const q = question.toLowerCase();
  if (q.includes('high risk') || q.includes('risky')) {
    return `Based on the current database:\n\n${context.split('\n').filter(l => l.includes('Risk:')).join('\n') || 'No risk data available.'}\n\n_Note: AI analyst is in template mode. Set GEMINI_API_KEY for full natural language analysis._`;
  }
  if (q.includes('flagged') || q.includes('fraud')) {
    return `Flagged items from database:\n\n${context.split('\n').filter(l => l.includes('FLAGGED') || l.includes('FRAUD')).join('\n') || 'No flagged items found.'}\n\n_Template mode active._`;
  }
  return `Here is the current database context:\n\n${context.slice(0, 800)}\n\n_Set GEMINI_API_KEY for intelligent analysis._`;
}

export async function POST(req: Request) {
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

    if (GEMINI_API_KEY) {
      response = await callGemini(systemPrompt, message);
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
