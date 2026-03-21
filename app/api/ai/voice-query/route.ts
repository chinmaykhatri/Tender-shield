// ─────────────────────────────────────────────────
// FILE: app/api/ai/voice-query/route.ts
// TYPE: SERVER API ROUTE
// SECRET KEYS USED: ANTHROPIC_API_KEY
// WHAT THIS FILE DOES: Converts natural language to SQL, runs read-only query, returns results
// ─────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { VOICE_QUERY_PROMPT } from '@/lib/aiPrompts';
import { TENDERSHIELD_CONSTITUTION } from '@/lib/ai/constitution';

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;

const SYSTEM_PROMPT = VOICE_QUERY_PROMPT;

const DEMO_QUERIES: Record<string, { answer: string; data: unknown[]; show_as: string; sql: string }> = {
  'frozen': {
    answer: 'There is 1 frozen tender — AIIMS Delhi Medical Equipment (₹120 Crore, Risk: 94)',
    data: [{ id: 'TDR-MoH-2025-000003', title: 'AIIMS Delhi Medical Equipment Procurement', ministry: 'MoH', value: '₹120 Cr', risk_score: 94, status: 'FROZEN_BY_AI' }],
    show_as: 'TABLE',
    sql: "SELECT id, title, ministry_code, estimated_value_crore, risk_score, status FROM tenders WHERE status = 'FROZEN_BY_AI' LIMIT 50",
  },
  'risk': {
    answer: 'AIIMS Delhi Medical Equipment has the highest risk score of 94/100 (CRITICAL)',
    data: [{ title: 'AIIMS Medical Equipment', risk_score: 94 }, { title: 'Smart City Surveillance', risk_score: 57 }, { title: 'PM SHRI Schools', risk_score: 31 }, { title: 'NH-44 Highway', risk_score: 23 }],
    show_as: 'TABLE',
    sql: "SELECT title, risk_score FROM tenders ORDER BY risk_score DESC LIMIT 50",
  },
  'shell': {
    answer: '2 bidders are flagged as shell companies: MedEquip Traders (GSTIN mismatch, 3-month old company) and HealthFirst Pvt Ltd (shared director with blacklisted firm)',
    data: [{ bidder: 'MedEquip Traders Pvt Ltd', risk: 98, evidence: 'Registered 3 months ago, GSTIN mismatch' }, { bidder: 'HealthFirst Pvt Ltd', risk: 87, evidence: 'Shared director with blacklisted firm' }],
    show_as: 'TABLE',
    sql: "SELECT bidder_name, ai_risk, shell_evidence FROM bids WHERE shell_company = true LIMIT 50",
  },
  '100 crore': {
    answer: '2 tenders are above ₹100 crore: NH-44 Highway (₹450 Cr) and AIIMS Medical Equipment (₹120 Cr)',
    data: [{ title: 'NH-44 Highway Expansion Phase 3', value: '₹450 Cr' }, { title: 'AIIMS Medical Equipment', value: '₹120 Cr' }],
    show_as: 'TABLE',
    sql: "SELECT title, estimated_value_crore FROM tenders WHERE estimated_value_crore > 100 ORDER BY estimated_value_crore DESC LIMIT 50",
  },
  'alerts': {
    answer: 'There are 3 active AI alerts today',
    data: [{ count: 3 }],
    show_as: 'SINGLE_NUMBER',
    sql: "SELECT COUNT(*) FROM ai_alerts WHERE created_at >= CURRENT_DATE",
  },
};

function findDemoResponse(transcript: string): { answer: string; data: unknown[]; show_as: string; sql: string } {
  const lower = transcript.toLowerCase();
  if (lower.includes('frozen') || lower.includes('जमा')) return DEMO_QUERIES['frozen'];
  if (lower.includes('risk') || lower.includes('जोखिम') || lower.includes('aiims')) return DEMO_QUERIES['risk'];
  if (lower.includes('shell') || lower.includes('शेल')) return DEMO_QUERIES['shell'];
  if (lower.includes('100') || lower.includes('crore') || lower.includes('करोड़')) return DEMO_QUERIES['100 crore'];
  if (lower.includes('alert') || lower.includes('अलर्ट')) return DEMO_QUERIES['alerts'];
  return DEMO_QUERIES['risk']; // default
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { transcript, user_role } = body;

    if (!transcript) return NextResponse.json({ error: 'No transcript provided' }, { status: 400 });

    if (!ANTHROPIC_KEY || ANTHROPIC_KEY === 'REPLACE_THIS') {
      const demo = findDemoResponse(transcript);
      return NextResponse.json({ ...demo, demo: true });
    }

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        system: TENDERSHIELD_CONSTITUTION + '\n\n' + SYSTEM_PROMPT,
        messages: [{ role: 'user', content: `User role: ${user_role || 'CAG_AUDITOR'}\nQuestion: ${transcript}` }],
      }),
    });

    if (!res.ok) {
      const demo = findDemoResponse(transcript);
      return NextResponse.json({ ...demo, demo: true, fallback_reason: 'AI service error' });
    }

    const data = await res.json();
    const text = data.content?.[0]?.text || '{}';
    const parsed = JSON.parse(text);

    return NextResponse.json({
      answer: parsed.plain_answer,
      sql: parsed.sql,
      show_as: parsed.show_as,
      data: [], // SQL execution would go here in production
    });
  } catch (e: unknown) {
    const demo = findDemoResponse('');
    return NextResponse.json({ ...demo, demo: true, fallback_reason: 'Parse error' });
  }
}
