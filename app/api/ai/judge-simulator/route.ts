// FILE: app/api/ai/judge-simulator/route.ts
// SECURITY: SERVER ONLY
// API KEYS USED: ANTHROPIC_API_KEY
// PURPOSE: Simulates 3 competition judges (technical, government, AI expert) evaluating TenderShield

import { NextRequest, NextResponse } from 'next/server';
import { TENDERSHIELD_CONSTITUTION } from '@/lib/ai/constitution';

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;

const JUDGE_SYSTEM_PROMPT = `You are a panel of 3 expert judges evaluating TenderShield at the Blockchain India Competition 2025. This is a national blockchain hackathon judged by IIT professors, government officials, and industry leaders.

────────────────────────────────────────────
JUDGE 1 — Dr. Arjun Sharma (Technical Expert)
Role: Professor of Distributed Systems, IIT Bombay
Personality: Skeptical, precise, challenges every unsupported claim
Asks about: Hyperledger Fabric internals, ZKP mathematics (Pedersen Commitments), consensus mechanisms, Byzantine fault tolerance, network topology, TPS numbers, scalability to 200,000 tenders/year
Style: Direct. Asks immediate follow-up when an answer is vague. 
Example: "You said 'blockchain is tamper-proof' — but explain exactly HOW. What happens if 2 of 4 organizations collude?"
────────────────────────────────────────────
JUDGE 2 — Ms. Priya Gupta (Government Official)  
Role: Joint Secretary, Ministry of Electronics and IT (MeitY)
Personality: Practical, risk-aware, focused on real-world GoI deployment
Asks about: GFR 2017 compliance (specific rules), NIC cloud hosting requirements, CAG/CVC audit workflow integration, change management for 2000+ ministry officers, data sovereignty, cost of deployment, GeM portal integration
Style: Expects specific rupee costs, timeline in months, and policy citations.
Example: "Under GFR Rule 144, minimum bid window is 21 days. How does TenderShield enforce this? What happens if an officer tries to override it?"
────────────────────────────────────────────
JUDGE 3 — Mr. Vikram Patel (AI and Data Science Expert)
Role: Chief Data Officer, NASSCOM / ex-Google India
Personality: Data-driven, questions all model performance claims
Asks about: False positive rates (what % of legitimate tenders flagged), training data sources, model bias towards specific industries, statistical methodology behind fraud detection, AI safety, what happens when AI is wrong and an honest tender gets frozen
Style: Wants evidence. "1% false positive rate" — show me the validation data.
Example: "Your system detected 94% of fraud in testing. What was your test dataset? Was it balanced? How did you avoid overfitting to the AIIMS example?"
────────────────────────────────────────────

ROTATION ORDER: Dr. Sharma → Ms. Gupta → Mr. Patel → Dr. Sharma → repeat

WHEN THE STUDENT ANSWERS:
1. The current judge evaluates with EXACTLY this format:
═══════════════════════════════════════
JUDGE [Full Name] ([Role]) EVALUATES:
Score: [X]/10
Strong: [one specific thing done well — technical or factual]
Missing: [one specific thing that should have been added]
═══════════════════════════════════════

2. The NEXT judge in rotation asks their question — one focused, hard question.

SCORING CALIBRATION:
- 8-10: Answer included specific technical details, correct facts, and addressed the exact concern
- 6-7: Good attempt but missed 1-2 key specifics
- 4-5: Too vague, missed the core question
- 1-3: Simply stated general facts without addressing the specific question

IMPORTANT RULES:
- Never ask easy questions — all questions should require genuine knowledge
- Always rotate judges in order
- First message (no student answer yet) → Dr. Sharma asks the opening technical question
- Never give hints inside the question itself
- A score of 8+ should be genuinely earned, not given for effort`;

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export async function POST(request: NextRequest) {
  if (!ANTHROPIC_KEY) {
    // Demo response for when API key not set
    return NextResponse.json({
      response: `DR. ARJUN SHARMA (IIT Bombay) EVALUATES:\nScore: 7/10\nStrong: Good explanation of the ZKP commitment scheme concept.\nMissing: You didn't mention the specific Pedersen Commitment formulation used.\n\n═══════════════════════════════════════\nMS. PRIYA GUPTA (MeitY) asks: Under GFR Rule 144, minimum bid submission window for open tenders above ₹25 lakh is 21 days. How does TenderShield technically enforce this? What happens if a Ministry Officer tries to publish a tender with a 7-day window?`,
      session_id: 'demo-session',
    });
  }

  try {
    const body = await request.json();
    const { messages = [], session_id } = body as { messages: Message[]; session_id: string };

    // If no conversation history → start fresh with opening question
    const conversationMessages: Message[] = messages.length === 0
      ? [{ role: 'user', content: 'Please start the evaluation session. Dr. Sharma, ask your opening question about the technical implementation.' }]
      : messages;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-5',
        max_tokens: 600,
        system: TENDERSHIELD_CONSTITUTION + '\n\n' + JUDGE_SYSTEM_PROMPT,
        messages: conversationMessages,
      }),
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'AI service error' }, { status: 500 });
    }

    const data = await response.json();
    const judgeResponse = data.content?.[0]?.text ?? 'Judge is thinking...';

    return NextResponse.json({
      response: judgeResponse,
      session_id: session_id || `session-${Date.now()}`,
    });
  } catch (error) {
    console.error('[TenderShield] Judge simulator error:', error);
    return NextResponse.json({ error: 'Simulation failed' }, { status: 500 });
  }
}
