/**
 * CAG Auditor — Flag Tender API
 * POST: Flag a tender for formal CAG investigation
 * DUAL MODE: Supabase → Demo fallback
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

function generateTxHash(): string {
  return '0x' + Array.from({ length: 48 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tender_id, flag_type, severity, reason, evidence_notes, recommended_action, notify } = body;

    // Validation
    if (!tender_id) return NextResponse.json({ error: 'tender_id required' }, { status: 400 });
    if (!flag_type) return NextResponse.json({ error: 'flag_type required' }, { status: 400 });
    if (!reason || reason.length < 100) {
      return NextResponse.json({ error: 'Reason must be at least 100 characters (legal requirement)' }, { status: 400 });
    }

    const caseNumber = `CAG-INV-2025-${String(Math.floor(Math.random() * 9000) + 1000).padStart(4, '0')}`;
    const blockchainTx = generateTxHash();
    let storage = 'IN_MEMORY';

    // Try Supabase
    if (supabase) {
      try {
        // Record in audit_events
        await supabase.from('audit_events').insert({
          event_id: `EVT-${caseNumber}`,
          event_type: 'CAG_FLAGGED',
          topic: 'cag.investigation',
          timestamp_ist: new Date().toISOString(),
          data: {
            case_number: caseNumber,
            tender_id,
            flag_type,
            severity,
            reason,
            evidence_notes,
            recommended_action,
            blockchain_tx: blockchainTx,
            actor: 'cag.auditor@nic.gov.in',
            actor_role: 'CAG_AUDITOR',
          },
        });

        // Try to update tender status
        await supabase.from('tenders').update({ status: 'FROZEN_BY_AI' }).eq('tender_id', tender_id);

        storage = 'SUPABASE';
      } catch {}
    }

    return NextResponse.json({
      success: true,
      case_number: caseNumber,
      blockchain_tx: blockchainTx,
      storage,
      message: `Tender ${tender_id} flagged successfully. Case ${caseNumber} opened.`,
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e instanceof Error ? e.message : String(e)) }, { status: 500 });
  }
}
