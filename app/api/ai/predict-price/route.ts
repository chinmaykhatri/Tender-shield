// ─────────────────────────────────────────────────
// FILE: app/api/ai/predict-price/route.ts
// TYPE: SERVER API ROUTE
// SECRET KEYS USED: ANTHROPIC_API_KEY
// WHAT THIS FILE DOES: AI predicts fair bid range for a tender, flags suspicious bids
// ─────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { PRICE_PREDICTOR_PROMPT } from '@/lib/aiPrompts';
import { TENDERSHIELD_CONSTITUTION } from '@/lib/ai/constitution';

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { category, estimated_value_crore, location, description } = body;

    if (!ANTHROPIC_KEY || ANTHROPIC_KEY === 'REPLACE_THIS') {
      const fair = estimated_value_crore * 0.92;
      return NextResponse.json({
        fair_min_crore: +(estimated_value_crore * 0.82).toFixed(1),
        fair_max_crore: +(estimated_value_crore * 0.98).toFixed(1),
        fair_value_crore: +fair.toFixed(1),
        confidence: 0.87,
        based_on_count: 23,
        flag_below_crore: +(estimated_value_crore * 0.70).toFixed(1),
        flag_above_crore: +(estimated_value_crore * 1.05).toFixed(1),
        reasoning: `Based on 23 similar ${category || 'GOODS'} tenders across India in the last 24 months, the statistically fair market bid range for ₹${estimated_value_crore}Cr is ₹${(estimated_value_crore * 0.82).toFixed(1)}Cr–₹${(estimated_value_crore * 0.98).toFixed(1)}Cr. Awards outside this band trigger an anomaly flag. Bids below ₹${(estimated_value_crore * 0.70).toFixed(1)}Cr signal predatory pricing (cartel cover strategy). Bids above ₹${(estimated_value_crore * 1.05).toFixed(1)}Cr indicate overpricing collusion.`,
        demo: true,
      });
    }

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': ANTHROPIC_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514', max_tokens: 1024,
        system: TENDERSHIELD_CONSTITUTION + '\n\n' + PRICE_PREDICTOR_PROMPT,
        messages: [{ role: 'user', content: `Category: ${category}, Estimated Government Budget: ₹${estimated_value_crore}Cr, Location: ${location || 'India'}, Description: ${description || 'Government procurement tender'}` }],
      }),
    });

    const data = await res.json();
    const parsed = JSON.parse(data.content?.[0]?.text || '{}');
    return NextResponse.json(parsed);
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}
