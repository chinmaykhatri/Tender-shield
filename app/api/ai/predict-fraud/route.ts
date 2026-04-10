// ─────────────────────────────────────────────────
// FILE: app/api/ai/predict-fraud/route.ts
// TYPE: SERVER API ROUTE
// SECRET KEYS USED: ANTHROPIC_API_KEY
// WHAT THIS FILE DOES: Predicts fraud probability BEFORE bids are submitted for a new tender
// ─────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { PREDICTIVE_FRAUD_PROMPT } from '@/lib/aiPrompts';
import { TENDERSHIELD_CONSTITUTION } from '@/lib/ai/constitution';

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;

function buildMeta(modelUsed: string, startTime: number) {
  return {
    model_used: modelUsed,
    detection_ms: Date.now() - startTime,
    timestamp_ist: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
    endpoint: '/api/ai/predict-fraud',
  };
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await request.json();
    const { title, ministry, estimated_value_crore, deadline, specs, category } = body;

    if (!ANTHROPIC_KEY || ANTHROPIC_KEY === 'REPLACE_THIS') {
      return NextResponse.json({
        fraud_probability: 0.73,
        risk_factors: [
          'Ministry of Health had 2 rigged tenders this year',
          '7-day deadline violates GFR Rule 144 (minimum 21 days)',
          'Specification contains brand-specific language ("Siemens Magnetom")',
          'Estimated value is 40% higher than similar recent tenders',
          'Single-source qualification criteria limits competition',
        ],
        recommendations: [
          'Extend deadline to minimum 21 days (GFR compliance)',
          'Replace brand names with performance-based specifications',
          'Reduce turnover requirement to allow MSME participation',
          'Add mandatory EMD waiver clause for registered MSMEs',
          'Assign independent technical committee for specification review',
        ],
        urgency: 'HIGH',
        demo: true,
        _meta: buildMeta('LOCAL_5_DETECTORS (demo fallback)', startTime),
      });
    }

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': ANTHROPIC_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514', max_tokens: 2048,
        system: TENDERSHIELD_CONSTITUTION + '\n\n' + PREDICTIVE_FRAUD_PROMPT,
        messages: [{ role: 'user', content: `Title: ${title}, Ministry: ${ministry}, Value: ₹${estimated_value_crore}Cr, Category: ${category}, Deadline: ${deadline}, Specs: ${specs || 'standard'}` }],
      }),
    });

    const data = await res.json();
    const parsed = JSON.parse(data.content?.[0]?.text || '{}');
    return NextResponse.json({
      ...parsed,
      _meta: buildMeta(`Claude claude-sonnet-4-20250514 (Anthropic API)`, startTime),
    });
  } catch {
    return NextResponse.json({
      fraud_probability: 0.5,
      risk_factors: ['Analysis failed'],
      recommendations: ['Manual review recommended'],
      urgency: 'MEDIUM',
      _meta: buildMeta('ERROR_FALLBACK', startTime),
    });
  }
}

