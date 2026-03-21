// FILE: app/api/ai/scan-document/route.ts
// SECURITY: SERVER ONLY
// API KEYS USED: ANTHROPIC_API_KEY
// PURPOSE: Receives PDF (base64 or text), sends to Claude Vision, returns structured tender extraction + bias analysis

import { NextRequest, NextResponse } from 'next/server';
import { TENDERSHIELD_CONSTITUTION } from '@/lib/ai/constitution';
import { DOCUMENT_SCANNER_PROMPT } from '@/lib/aiPrompts';

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;

const VISION_PROMPT = `You are a senior Indian government procurement auditor with 20 years of experience reviewing tender documents.

Analyze this document carefully. Look for:
- Official government letterhead and stamps
- Tender reference numbers and dates
- Financial values and bid submission deadlines  
- Technical specifications and qualification criteria
- Any language that appears to favour a specific vendor (brand names, narrow qualifications, unrealistic timelines)

CRITICAL: Respond with ONLY valid JSON — no markdown, no explanation, no text before or after the JSON object.

Return this exact JSON structure:
{
  "extracted": {
    "title": "",
    "tender_number": "",
    "ministry": "",
    "department": "",
    "category": "WORKS|GOODS|SERVICES|CONSULTANCY",
    "estimated_value_lakhs": 0,
    "deadline_ist": "YYYY-MM-DDTHH:MM:00+05:30",
    "gem_category": "",
    "gfr_rule_reference": "",
    "description": "",
    "qualification_criteria": [],
    "technical_specifications": [],
    "has_government_stamp": false,
    "has_authorized_signature": false
  },
  "bias_analysis": {
    "bias_score": 0,
    "is_suspicious": false,
    "red_flags": [
      {
        "type": "BRAND_SPECIFIC|NARROW_QUALIFICATION|SHORT_TIMELINE|UNUSUAL_SPEC|INSIDER_KNOWLEDGE_SPEC",
        "severity": "LOW|MEDIUM|HIGH|CRITICAL",
        "exact_quote": "exact text from document",
        "why_suspicious": "statistical basis and legal reference",
        "suggested_fix": "GFR-compliant alternative wording"
      }
    ]
  },
  "gfr_compliance": {
    "issues_found": [],
    "missing_mandatory_fields": [],
    "timeline_compliant": true
  },
  "risk_score": 0,
  "risk_level": "CLEAN|LOW|MEDIUM|HIGH|CRITICAL",
  "recommended_action": "APPROVE|MONITOR|FLAG|FREEZE|ESCALATE_CAG"
}`;

const SYSTEM_PROMPT = TENDERSHIELD_CONSTITUTION + '\n\n' + DOCUMENT_SCANNER_PROMPT;

// ── Demo fallback when API key not set ───────────────────────────────────────
const DEMO_RESULT = {
  extracted: {
    title: 'AIIMS Delhi Medical Equipment Procurement',
    tender_number: 'AIIMS/PUR/MED/2025/001',
    ministry: 'Ministry of Health & Family Welfare',
    department: 'AIIMS New Delhi',
    category: 'GOODS',
    estimated_value_lakhs: 12000,
    deadline_ist: '2025-03-10T17:00:00+05:30',
    gem_category: 'Medical Diagnostic Equipment',
    gfr_rule_reference: 'GFR Rule 149',
    description: 'Procurement of advanced medical diagnostic equipment including MRI machines (3T), CT Scanners (128-slice), and ICU equipment for AIIMS New Delhi.',
    qualification_criteria: ['ISO 13485 certified manufacturer', 'Minimum 5 years in medical equipment supply to GoI', 'Annual turnover ≥ ₹50 Crore in last 3 years'],
    technical_specifications: ['MRI: 3 Tesla, minimum 48 RF channels, ONLY Siemens Magnetom Vida compatible', 'CT: 128-slice minimum, 0.35s gantry rotation', 'Warranty: 5 years onsite service'],
    has_government_stamp: true,
    has_authorized_signature: true,
  },
  bias_analysis: {
    bias_score: 73,
    is_suspicious: true,
    red_flags: [
      { type: 'BRAND_SPECIFIC', severity: 'HIGH', exact_quote: 'ONLY Siemens Magnetom Vida compatible housing dimensions required', why_suspicious: 'This specification limits competition to a single OEM, excluding 8+ qualified 3T MRI manufacturers. GFR Rule 149 requires fair competition.', suggested_fix: '"3T MRI system with minimum 48 RF channels, compatible with standard 60cm bore housing" — removes brand bias while preserving clinical requirement.' },
      { type: 'SHORT_TIMELINE', severity: 'MEDIUM', exact_quote: '7-day bid submission window from date of notification', why_suspicious: 'GFR Rule 144 requires minimum 21 days for open tenders above ₹25 Lakh. This 7-day window violates mandatory rules and statistically correlates with 67% higher fraud probability.', suggested_fix: 'Extend bid submission deadline to minimum 21 days from publication date.' },
      { type: 'NARROW_QUALIFICATION', severity: 'HIGH', exact_quote: 'Annual turnover ≥ ₹50 Crore in last 3 consecutive financial years', why_suspicious: 'This turnover requirement eliminates 80% of qualified medical equipment suppliers and all MSME firms. MSME Development Act 2006 mandates EMD waiver for registered MSMEs.', suggested_fix: '"Annual turnover ≥ ₹15 Crore OR registered MSME with equivalent product experience" — GFR Rule 149 compliant.' },
    ],
  },
  gfr_compliance: {
    issues_found: ['Bid window 7 days — violates GFR Rule 144 minimum 21 days', 'No EMD waiver clause for MSME bidders — violates MSME Act 2006', 'Brand-specific specification — violates GFR Rule 149 fair competition clause'],
    missing_mandatory_fields: ['Bid security percentage (Section 5.1)', 'Performance guarantee clause (Section 8)', 'Dispute resolution mechanism'],
    timeline_compliant: false,
  },
  risk_score: 73,
  risk_level: 'HIGH',
  recommended_action: 'FLAG',
  demo: true,
};

export async function POST(request: NextRequest) {
  if (!ANTHROPIC_KEY) {
    console.log('[TenderShield] scan-document: No API key — returning demo result');
    return NextResponse.json(DEMO_RESULT);
  }

  try {
    const body = await request.json();
    const { document_base64, document_text, pages_base64 } = body;

    // Build message content for Claude
    type ContentBlock = { type: 'text'; text: string } | { type: 'image'; source: { type: 'base64'; media_type: 'image/jpeg'; data: string } };
    const content: ContentBlock[] = [];

    // If we have rendered page images (Feature 4 — Vision)
    if (pages_base64 && Array.isArray(pages_base64)) {
      for (const pageBase64 of pages_base64.slice(0, 5)) {
        content.push({
          type: 'image',
          source: { type: 'base64', media_type: 'image/jpeg', data: pageBase64 },
        });
      }
      content.push({ type: 'text', text: VISION_PROMPT });
    } else if (document_text) {
      content.push({ type: 'text', text: `Analyze this tender document:\n\n${document_text}` });
    } else if (document_base64) {
      content.push({ type: 'text', text: `Analyze this tender document (text extracted from PDF):\n\n${document_base64.substring(0, 15000)}` });
    } else {
      return NextResponse.json({ error: 'No document provided' }, { status: 400 });
    }

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-5',
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content }],
      }),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      console.error('[TenderShield] scan-document API error:', res.status, error);
      return NextResponse.json(DEMO_RESULT);
    }

    const data = await res.json();
    const text: string = data.content?.[0]?.text || '{}';

    // Safe JSON extraction
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start === -1 || end === -1) return NextResponse.json(DEMO_RESULT);

    const parsed = JSON.parse(text.slice(start, end + 1));
    return NextResponse.json(parsed);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    console.error('[TenderShield] scan-document error:', message);
    return NextResponse.json(DEMO_RESULT);
  }
}
