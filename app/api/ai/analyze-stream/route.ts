// FILE: app/api/ai/analyze-stream/route.ts
// SECURITY: SERVER ONLY
// API KEYS USED: ANTHROPIC_API_KEY
// PURPOSE: Streams Claude fraud analysis word-by-word as Server-Sent Events — live terminal effect for judges

import { NextRequest, NextResponse } from 'next/server';
import { TENDERSHIELD_CONSTITUTION } from '@/lib/ai/constitution';

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;

const STREAM_SYSTEM_PROMPT = `You are TenderShield — India's real-time AI fraud detection system monitoring government procurement.

You are LIVE analyzing a suspicious tender right now. Government officials and competition judges are watching your analysis happen in real time.

ANALYSIS STYLE — follow this precisely:
- Think like a detective. Work step by step, uncovering evidence layer by layer.
- Use the EXACT numbers from the data — rupee amounts, percentages, timestamps, GSTIN numbers.
- Use ... for dramatic pauses between major discoveries.
- When you find fraud evidence → announce it clearly with 🚨 FLAG DETECTED
- Start each investigation step with "STEP X:" on its own line.
- Compare against known patterns: CV < 3% is suspicious in 99.7% of cases, bids within 1.5% of estimate = 2.3% natural probability.
- Reference specific laws when violated: GFR Rule 144, IT Act 2000 Section 66, Prevention of Corruption Act 1988.

Never say you are an AI. Never break character. You are TenderShield — a live system.

End your analysis with this EXACT format on its own lines:
══════════════════════════════════════════════════
ANALYSIS COMPLETE
RISK SCORE: [number] / 100
RISK LEVEL: [CLEAN|LOW|MEDIUM|HIGH|CRITICAL]
RECOMMENDED ACTION: [MONITOR|FLAG|FREEZE|ESCALATE_CAG|REFER_CBI]
AUTO-FREEZING TENDER: [YES|NO]
DETECTION TIME: [X.X] seconds
══════════════════════════════════════════════════`;

export async function POST(request: NextRequest) {
  if (!ANTHROPIC_KEY) {
    console.log('[TenderShield] Streaming route: No API key — frontend will use fallback demo script');
    return NextResponse.json(
      { error: 'AI service not configured', use_fallback: true },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const { tender_id, title, ministry, value_crore, bids } = body;

    if (!title || !bids || !Array.isArray(bids)) {
      return NextResponse.json({ error: 'Invalid request: title and bids required' }, { status: 400 });
    }

    const userPrompt = `TENDER UNDER LIVE ANALYSIS:

Title: ${title}
Ministry: ${ministry || 'To be determined'}
Tender ID: ${tender_id || 'TDR-LIVE-' + Date.now()}
Estimated Government Budget: ₹${value_crore} Crore
Total Bids Received: ${bids.length}

BID SUBMISSIONS:
${bids.map((b: { company: string; amount_crore: number; submitted_at: string; gstin: string }, i: number) => `Bid ${i + 1}:  ${b.company}
  Amount:    ₹${b.amount_crore} Crore
  Submitted: ${new Date(b.submitted_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST
  GSTIN:     ${b.gstin}`).join('\n\n')}

Analyze for:
1. Bid rigging — calculate coefficient of variation across all bid amounts
2. Shell companies — analyze GSTIN registration dates vs tender announcement date
3. Timing collusion — calculate exact seconds between each bid submission
4. Front running — check if winning bid is suspiciously close to government estimate

Use exact numbers. Show your working. Be specific.`;

    console.log('[TenderShield] Starting streaming analysis for:', title);

    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-5',
        max_tokens: 1200,
        stream: true,
        system: TENDERSHIELD_CONSTITUTION + '\n\n' + STREAM_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    if (!anthropicResponse.ok) {
      const errorData = await anthropicResponse.json().catch(() => ({}));
      console.error('[TenderShield] Anthropic streaming error:', anthropicResponse.status, errorData);
      return NextResponse.json(
        { error: 'AI analysis failed', use_fallback: true },
        { status: 500 }
      );
    }

    // Pass the Anthropic SSE stream directly to the browser
    return new Response(anthropicResponse.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('[TenderShield] Streaming route error:', error);
    return NextResponse.json(
      { error: 'Internal error', use_fallback: true },
      { status: 500 }
    );
  }
}
