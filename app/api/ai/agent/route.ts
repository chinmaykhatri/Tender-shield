// FILE: app/api/ai/agent/route.ts
// FEATURE: Feature 1 — Claude Agentic Fraud Investigation
// DEMO MODE: Runs scripted investigation with mock tool results (no API key needed)
// REAL MODE: Real Claude agentic loop + real tool execution

import { NextRequest } from 'next/server';
import { INVESTIGATION_TOOLS } from '@/lib/ai/agentTools';
import { executeTool, type ToolResult } from '@/lib/ai/toolExecutor';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
const HAS_CLAUDE_KEY = !!process.env.ANTHROPIC_API_KEY;

function buildDemoTenderContext() {
  return {
    tender_id: 'TDR-MoH-2025-000003',
    title: 'AIIMS Delhi Medical Equipment Procurement',
    ministry: 'Ministry of Health', ministry_code: 'MoH',
    value_crore: 120, status: 'BIDS_REVEALED',
    bids: [
      { company: 'MedTech Solutions', amount_crore: 118.5, gstin: '07AABCM1234A1ZK', submitted_at: '2025-03-10T16:45:23+05:30' },
      { company: 'BioMed Corp India', amount_crore: 119.8, gstin: '07AABCB5678B1ZP', submitted_at: '2025-03-10T16:58:41+05:30' },
      { company: 'Pharma Plus Equipment', amount_crore: 120.1, gstin: '07AABCP9012C1ZM', submitted_at: '2025-03-10T16:59:02+05:30' },
    ],
    ai_flags: ['SHELL_COMPANY', 'BID_RIGGING', 'TIMING_COLLUSION'],
    risk_score: 94,
  };
}

// Scripted demo investigation — no Claude API needed
async function runDemoInvestigation(
  send: (event: string, data: unknown) => void
) {
  const steps = [
    { delay: 800, event: 'agent_thinking', data: { text: 'Analyzing fraud indicators on AIIMS tender... Risk score 94 indicates high probability of bid rigging. I need to search for related tenders and investigate the bidders.', step: 1 } },
    { delay: 1200, event: 'tool_called', data: { tool: 'search_related_tenders', input: { ministry_code: 'MoH', date_range_months: 12 }, step: 2 } },
    { delay: 1500, event: 'tool_result', data: { tool: 'search_related_tenders', success: true, data: { found: 2, tenders: [{ tender_id: 'TDR-MoH-2025-000001', title: 'AIIMS Patna Medical Supplies', value_crore: 85, same_bidders: ['BioMed Corp', 'Pharma Plus'], risk_score: 78 }, { tender_id: 'TDR-MoH-2024-000089', title: 'AIIMS Jodhpur Equipment', value_crore: 62, same_bidders: ['BioMed Corp'], risk_score: 65 }] } } },
    { delay: 800, event: 'agent_thinking', data: { text: 'Found 2 related tenders with overlapping bidders. BioMed Corp and Pharma Plus appear together in multiple MoH tenders. This suggests a possible cartel. Let me investigate these companies.', step: 3 } },
    { delay: 1000, event: 'tool_called', data: { tool: 'get_bidder_profile', input: { bidder_id: 'biomed' }, step: 4 } },
    { delay: 1200, event: 'tool_result', data: { tool: 'get_bidder_profile', success: true, data: { company: 'BioMed Corp India', gstin: '07AABCB5678B1ZP', age_months: 3, fraud_flags: ['SHELL_COMPANY'], director_pan: 'ABCDE1234F', shared_director_with: ['Pharma Plus Equipment Ltd'], trust_score: 15 } } },
    { delay: 1000, event: 'tool_called', data: { tool: 'get_bidder_profile', input: { bidder_id: 'pharmaplus' }, step: 5 } },
    { delay: 1200, event: 'tool_result', data: { tool: 'get_bidder_profile', success: true, data: { company: 'Pharma Plus Equipment Ltd', gstin: '07AABCP9012C1ZM', age_months: 2, fraud_flags: ['SHELL_COMPANY'], director_pan: 'ABCDE1234F', shared_director_with: ['BioMed Corp India'], trust_score: 12 } } },
    { delay: 800, event: 'agent_thinking', data: { text: 'CRITICAL FINDING: BioMed Corp (3 months old) and Pharma Plus (2 months old) share the SAME director PAN: ABCDE1234F. Both are shell companies created to rig bids. I need to freeze all related tenders immediately.', step: 6 } },
    { delay: 1000, event: 'tool_called', data: { tool: 'freeze_tender', input: { tender_id: 'TDR-MoH-2025-000003', reason: 'Shell company cartel detected — BioMed Corp & Pharma Plus share director PAN ABCDE1234F', confidence: 0.96 }, step: 7 } },
    { delay: 1500, event: 'tool_result', data: { tool: 'freeze_tender', success: true, data: { frozen: true, tender_id: 'TDR-MoH-2025-000003', blockchain_tx: '0x2e5c8b1d4f7a9c3e', message: 'Tender TDR-MoH-2025-000003 FROZEN' } } },
    { delay: 800, event: 'tool_called', data: { tool: 'freeze_tender', input: { tender_id: 'TDR-MoH-2025-000001', reason: 'Related to AIIMS Delhi cartel — same bidders involved', confidence: 0.88 }, step: 8 } },
    { delay: 1200, event: 'tool_result', data: { tool: 'freeze_tender', success: true, data: { frozen: true, tender_id: 'TDR-MoH-2025-000001', blockchain_tx: '0x4f7a3b2c1e8d5a9f', message: 'Tender TDR-MoH-2025-000001 FROZEN' } } },
    { delay: 800, event: 'tool_called', data: { tool: 'flag_bidder', input: { bidder_id: 'biomed', flag_type: 'SHELL_COMPANY', evidence: '3-month old company with same director PAN as Pharma Plus. Trust score: 15/100.' }, step: 9 } },
    { delay: 800, event: 'tool_result', data: { tool: 'flag_bidder', success: true, data: { flagged: true, bidder_id: 'biomed', flag_type: 'SHELL_COMPANY' } } },
    { delay: 600, event: 'tool_called', data: { tool: 'flag_bidder', input: { bidder_id: 'pharmaplus', flag_type: 'SHELL_COMPANY', evidence: '2-month old company with same director PAN as BioMed Corp. Trust score: 12/100.' }, step: 10 } },
    { delay: 800, event: 'tool_result', data: { tool: 'flag_bidder', success: true, data: { flagged: true, bidder_id: 'pharmaplus', flag_type: 'SHELL_COMPANY' } } },
    { delay: 600, event: 'tool_called', data: { tool: 'flag_bidder', input: { bidder_id: 'biomed', flag_type: 'BID_RIGGING', evidence: 'Coordinated bid timing — BioMed at 16:58:41 and Pharma Plus at 16:59:02 — 21 seconds apart.' }, step: 11 } },
    { delay: 800, event: 'tool_result', data: { tool: 'flag_bidder', success: true, data: { flagged: true, bidder_id: 'biomed', flag_type: 'BID_RIGGING' } } },
    { delay: 800, event: 'tool_called', data: { tool: 'generate_evidence_report', input: { tender_ids: ['TDR-MoH-2025-000003', 'TDR-MoH-2025-000001'], flagged_bidder_ids: ['biomed', 'pharmaplus'], fraud_types: ['SHELL_COMPANY', 'BID_RIGGING', 'CARTEL'], investigation_summary: 'BioMed Corp and Pharma Plus are shell companies (3 and 2 months old) controlled by the same director (PAN: ABCDE1234F). They submitted coordinated bids 21 seconds apart on ₹120 Cr AIIMS Delhi tender. Same pattern found on AIIMS Patna (₹85 Cr). Total public funds at risk: ₹267 Crore.' }, step: 12 } },
    { delay: 1500, event: 'tool_result', data: { tool: 'generate_evidence_report', success: true, data: { report_id: 'RPT-1741234567', message: 'Evidence report RPT-1741234567 generated and stored' } } },
    { delay: 800, event: 'tool_called', data: { tool: 'escalate_to_cag', input: { tender_ids: ['TDR-MoH-2025-000003', 'TDR-MoH-2025-000001'], case_summary: 'Organized bid rigging through shell companies in MoH medical equipment procurement. Two shell companies (BioMed Corp, Pharma Plus) controlled by same director submitted coordinated bids across multiple AIIMS tenders. Estimated fraud: ₹267 Crore.', estimated_fraud_value_crore: 267, recommended_action: 'FIR' }, step: 13 } },
    { delay: 1200, event: 'tool_result', data: { tool: 'escalate_to_cag', success: true, data: { case_number: 'CAG-AI-2025-4521', escalated: true, message: 'CAG investigation case CAG-AI-2025-4521 opened' } } },
    { delay: 800, event: 'tool_called', data: { tool: 'send_fraud_alert', input: { tender_ids: ['TDR-MoH-2025-000003', 'TDR-MoH-2025-000001'], summary: 'Shell company cartel frozen — ₹267 Cr at risk. Case: CAG-AI-2025-4521. 2 tenders frozen, 2 bidders flagged.', total_value_crore: 267, severity: 'CRITICAL' }, step: 14 } },
    { delay: 1200, event: 'tool_result', data: { tool: 'send_fraud_alert', success: true, data: { sent: true, phone: '+91****9134', message: 'WhatsApp alert sent — 2 tenders, ₹267 Crore at risk' } } },
    { delay: 1000, event: 'tool_called', data: { tool: 'record_on_blockchain', input: { investigation_id: 'INV-AIIMS-2025-001', actions_taken: ['Searched related MoH tenders', 'Profiled BioMed Corp (shell company)', 'Profiled Pharma Plus (shell company)', 'Found shared director PAN ABCDE1234F', 'Froze TDR-MoH-2025-000003', 'Froze TDR-MoH-2025-000001', 'Flagged BioMed Corp (SHELL_COMPANY, BID_RIGGING)', 'Flagged Pharma Plus (SHELL_COMPANY)', 'Generated evidence report RPT-1741234567', 'Escalated to CAG: CAG-AI-2025-4521', 'Sent WhatsApp alert to auditor'], final_verdict: 'CONFIRMED FRAUD — Organized bid rigging through shell company cartel. ₹267 Crore protected. Case escalated for FIR.' }, step: 15 } },
    { delay: 1500, event: 'tool_result', data: { tool: 'record_on_blockchain', success: true, data: { tx_hash: '0x7b3d9e2c1f4a8b5d6e3c7a9f0b2d4e6a8c1f3b5d7e9a0c2e4f6a8b0d2e4f6a', block_number: 1421, recorded: true, immutable: true, message: 'Investigation permanently recorded on blockchain — Block #1421' } } },
  ];

  for (const step of steps) {
    await new Promise(resolve => setTimeout(resolve, step.delay));
    send(step.event, step.data);
  }

  send('agent_complete', {
    message: 'INVESTIGATION COMPLETE',
    total_actions: 11,
    duration_seconds: '28',
    tenders_frozen: 2, bidders_flagged: 3,
    value_protected_crore: 267,
    cag_case: 'CAG-AI-2025-4521',
    blockchain_tx: '0x7b3d9e2c1f4a8b5d',
  });
}

// Real Claude agentic loop
async function runRealInvestigation(
  tenderId: string,
  send: (event: string, data: unknown) => void
) {
  const context = buildDemoTenderContext();
  const agentLog: ToolResult[] = [];

  type MessageContent = { type: string; text?: string; id?: string; name?: string; input?: Record<string, unknown>; tool_use_id?: string; content?: string };
  const messages: Array<{ role: string; content: string | MessageContent[] }> = [
    {
      role: 'user',
      content: `FRAUD DETECTED — BEGIN INVESTIGATION\n\nTender ID: ${tenderId}\nDetection Time: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}\n\nTender Data:\n${JSON.stringify(context, null, 2)}\n\nYou are the TenderShield AI Investigation Agent. Begin your investigation. Use the tools. Be thorough — check for related fraudulent tenders. Take all necessary actions. Record everything on blockchain as your final step.`,
    },
  ];

  let iteration = 0;
  while (iteration < 15) {
    iteration++;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        tools: INVESTIGATION_TOOLS,
        system: `You are TenderShield AI Investigation Agent. Investigate fraud in Indian government procurement. Be systematic: search related tenders, profile bidders, freeze fraudulent tenders, flag bad actors, generate evidence reports, escalate to CAG, alert auditors via WhatsApp, and record everything on blockchain. Always end by recording your complete investigation on blockchain.`,
        messages,
      }),
    });

    const claudeResponse = await response.json();
    messages.push({ role: 'assistant', content: claudeResponse.content });

    const textBlocks = (claudeResponse.content as MessageContent[]).filter((b) => b.type === 'text');
    const toolUseBlocks = (claudeResponse.content as MessageContent[]).filter((b) => b.type === 'tool_use');

    if (textBlocks.length > 0) {
      send('agent_thinking', { text: textBlocks.map((b) => b.text || '').join('\n'), step: iteration });
    }

    if (toolUseBlocks.length === 0) {
      send('agent_complete', {
        message: 'INVESTIGATION COMPLETE',
        total_actions: agentLog.length,
        duration_seconds: 'N/A',
        actions: agentLog.map(l => l.tool_name),
      });
      break;
    }

    const toolResults: MessageContent[] = [];
    for (const toolUse of toolUseBlocks) {
      send('tool_called', { tool: toolUse.name, input: toolUse.input, step: iteration });
      const result = await executeTool(toolUse.name!, toolUse.input as Record<string, unknown>);
      agentLog.push(result);
      send('tool_result', { tool: toolUse.name, success: result.success, data: result.data, timestamp_ist: result.timestamp_ist });
      toolResults.push({ type: 'tool_result', tool_use_id: toolUse.id!, content: JSON.stringify(result.data) });
    }

    messages.push({ role: 'user', content: toolResults });
    await new Promise(resolve => setTimeout(resolve, 300));
  }
}

export async function POST(req: NextRequest) {
  const { tender_id } = await req.json();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        try {
          controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ event, data })}\n\n`));
        } catch { /* stream closed */ }
      };

      send('agent_started', {
        tender_id,
        message: 'TenderShield AI Agent started investigation',
        timestamp_ist: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
      });

      if (DEMO_MODE || !HAS_CLAUDE_KEY) {
        await runDemoInvestigation(send);
      } else {
        await runRealInvestigation(tender_id, send);
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
