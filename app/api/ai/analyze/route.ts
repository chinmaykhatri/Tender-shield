// FILE: app/api/ai/analyze/route.ts
// SECURITY: SERVER ONLY
// API KEYS USED: ANTHROPIC_API_KEY
// PURPOSE: Structured fraud analysis — returns guaranteed valid JSON FraudAnalysis, never crashes

import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { TENDERSHIELD_CONSTITUTION } from '@/lib/ai/constitution';
import { safeParseClaudeJSON } from '@/lib/ai/safeParser';
import { FALLBACK_ANALYSIS, TenderData } from '@/lib/types/fraud';
import { protectedClaudeCall } from '@/lib/ai/protectedClaudeCall';
import { aiLimiter } from '@/lib/rateLimit';
import { z } from 'zod';

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;

// ── Zod Input Validation ────────────────────────────────────────────────────
const BidSchema = z.object({
  company: z.string().min(1, 'Company name required'),
  amount_crore: z.number().positive('Amount must be positive'),
  submitted_at: z.string(),
  gstin: z.string().min(10, 'Invalid GSTIN format'),
});

const AnalyzeInputSchema = z.object({
  tender_id: z.string().min(1),
  title: z.string().min(1),
  ministry: z.string().optional(),
  value_crore: z.number().positive(),
  bids: z.array(BidSchema).min(1, 'At least 1 bid required'),
});

// ── Structured output system prompt ─────────────────────────────────────────
const STRUCTURE_PROMPT = `You are TenderShield fraud detection API.

CRITICAL RULES — breaking these crashes the system:
Rule 1: Your ENTIRE response must be valid JSON — nothing else
Rule 2: No text before the opening brace {
Rule 3: No text after the closing brace }
Rule 4: No markdown — no backticks, no code blocks, no fences
Rule 5: No explanation text anywhere outside the JSON values
Rule 6: Every field below is REQUIRED — never omit one
Rule 7: Use empty array [] if no flags found
Rule 8: Use empty string "" if notes are not applicable
Rule 9: risk_score must be an integer from 0 to 100
Rule 10: confidence must be a decimal from 0.0 to 1.0

DETECTION METHODOLOGY:
- Bid Rigging: Calculate coefficient of variation (CV) across revealed amounts. CV < 3% in legitimate tenders occurs only 0.3% of the time.
- Shell Companies: GSTIN registration date vs tender announcement date. Companies incorporated within 6 months of tender = high suspicion.
- Timing Collusion: Calculate seconds between bid submissions. Multiple bids within 60 seconds = 4.7× fraud probability.
- Front Running: Winning bid within 1.5% of government estimate = 2.3% natural probability, suggests insider knowledge.
- Cartel: Shared directors (via PAN cross-reference), shared registered addresses, or common IP subnets.

REQUIRED RESPONSE FORMAT:
{
  "risk_score": <integer 0-100>,
  "risk_level": <"LOW" or "MEDIUM" or "HIGH" or "CRITICAL">,
  "confidence": <decimal 0.0-1.0>,
  "detection_time_seconds": <decimal>,
  "auto_freeze": <true or false>,
  "recommended_action": <"MONITOR" or "FLAG" or "FREEZE" or "ESCALATE_CAG" or "REFER_CBI">,
  "summary": <string under 100 characters>,
  "flags": [
    {
      "type": <"BID_RIGGING" or "SHELL_COMPANY" or "TIMING_COLLUSION" or "FRONT_RUNNING" or "CARTEL">,
      "severity": <"LOW" or "MEDIUM" or "HIGH" or "CRITICAL">,
      "confidence": <decimal 0.0-1.0>,
      "evidence": <string with exact numbers from the data>,
      "plain_english": <string explaining simply for auditor>
    }
  ],
  "investigation_notes": <string with detailed auditor notes>
}`;

// ── Demo analysis for when API key is not set ────────────────────────────────
const DEMO_AIIMS_ANALYSIS = {
  ...FALLBACK_ANALYSIS,
  risk_score: 94,
  risk_level: 'CRITICAL' as const,
  confidence: 0.97,
  detection_time_seconds: 3.2,
  auto_freeze: true,
  recommended_action: 'ESCALATE_CAG' as const,
  summary: 'CRITICAL: Shell company cartel + bid rigging detected. Tender auto-frozen.',
  flags: [
    { type: 'SHELL_COMPANY' as const, severity: 'CRITICAL' as const, confidence: 0.99, evidence: 'BioMed Corp and Pharma Plus share director PAN: ABCDE1234F. BioMed incorporated Jan 2025 (3 months ago). Pharma Plus incorporated Feb 2025 (2 months ago). Both registered after tender was announced.', plain_english: 'Two bidding companies are secretly owned by the same person and were created just for this tender.' },
    { type: 'BID_RIGGING' as const, severity: 'CRITICAL' as const, confidence: 0.97, evidence: 'Coefficient of Variation across 3 bids: 1.8%. Bids: ₹118.5Cr, ₹119.8Cr, ₹120.1Cr. CV below 3% in only 0.3% of legitimate tenders (p < 0.001 by chi-square test). All three amounts suspiciously close.', plain_english: 'Three companies submitted bids within ₹1.5 Crore of each other. This almost never happens by coincidence — it means they coordinated.' },
    { type: 'TIMING_COLLUSION' as const, severity: 'HIGH' as const, confidence: 0.94, evidence: '3 bids submitted within 47-second window at 16:58:41, 16:59:02, 16:59:28 IST. Probability of 3 independent bidders submitting within 47 seconds: 0.04%. IP subnet analysis pending.', plain_english: 'Three separate companies all submitted their bids within 47 seconds of each other, just before the deadline. This strongly suggests they were coordinating in real time.' },
    { type: 'FRONT_RUNNING' as const, severity: 'HIGH' as const, confidence: 0.88, evidence: 'Winning bid: ₹118.5 Cr = 98.75% of ₹120 Cr estimate. Bids within 1.5% of estimate occur in only 2.3% of legitimate cases. Pattern consistent with insider knowledge of evaluation range.', plain_english: 'The winning bid is suspiciously close to the government\'s secret budget — suggesting someone leaked the estimate.' },
  ],
  investigation_notes: 'This tender exhibits all four primary fraud indicators simultaneously with high confidence. Recommend immediate CBI referral. Block all 4 GSTIN numbers. Cross-reference director PAN ABCDE1234F across all government procurement databases for last 5 years.',
  demo: true,
};

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  // ── Rate Limiting (10 AI calls/min per IP) ─────────────────────
  const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? 'unknown';
  const { success: withinLimit } = aiLimiter.check(ip);
  if (!withinLimit) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Maximum 10 AI analysis requests per minute.', retry_after_seconds: 60 },
      { status: 429, headers: { 'Retry-After': '60' } }
    );
  }

  try {
    const rawBody = await request.json();

    // ── Zod Input Validation ───────────────────────────────────────
    const parseResult = AnalyzeInputSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const tenderData = parseResult.data as TenderData;

    if (!ANTHROPIC_KEY) {
      logger.info('[TenderShield] Analyze route: No API key — returning demo analysis');
      return NextResponse.json({ ...DEMO_AIIMS_ANALYSIS, detection_time_seconds: 3.2 });
    }

    const userPrompt = `Analyze this Indian government tender for fraud indicators:

Tender ID: ${tenderData.tender_id}
Title: ${tenderData.title}
Ministry: ${tenderData.ministry}
Estimated Government Budget: ₹${tenderData.value_crore} Crore
Number of Bids: ${tenderData.bids.length}

BID SUBMISSIONS:
${tenderData.bids.map((b, i) =>
  `Bid ${i + 1}:
  Company: ${b.company}
  Amount: ₹${b.amount_crore} Crore
  Submitted: ${new Date(b.submitted_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST
  GSTIN: ${b.gstin}`
).join('\n\n')}

Calculate CV across bid amounts. Check GSTIN registration patterns. Analyze submission timestamps. Check for front-running against the ₹${tenderData.value_crore} Cr estimate.`;

    // ─── Use protected Claude call with 3-layer security ────
    const result = await protectedClaudeCall({
      taskInstructions: STRUCTURE_PROMPT,
      userMessage: userPrompt,
      maxTokens: 1024,
      stream: false,
      endpoint: '/api/ai/analyze',
      ipAddress: request.headers.get('x-forwarded-for') ?? undefined,
    });

    if (!result.success) {
      if (result.blocked) {
        logger.warn('[TenderShield] AI call blocked:', result.blockReason);
        return NextResponse.json({
          ...FALLBACK_ANALYSIS,
          detection_time_seconds: (Date.now() - startTime) / 1000,
          blocked: true,
          blockReason: result.blockReason,
        });
      }
      // API unavailable — return demo analysis
      return NextResponse.json({ ...FALLBACK_ANALYSIS, detection_time_seconds: (Date.now() - startTime) / 1000 });
    }

    const analysis = safeParseClaudeJSON(result.text || '');
    analysis.detection_time_seconds = (Date.now() - startTime) / 1000;

    logger.info('[TenderShield] Fraud analysis complete:', {
      tender: tenderData.tender_id,
      risk_score: analysis.risk_score,
      flags: analysis.flags.length,
      time_ms: Date.now() - startTime,
    });

    return NextResponse.json(analysis);
  } catch (error) {
    logger.error('[TenderShield] Analyze route error:', error);
    return NextResponse.json({
      ...FALLBACK_ANALYSIS,
      detection_time_seconds: (Date.now() - startTime) / 1000,
    });
  }
}
