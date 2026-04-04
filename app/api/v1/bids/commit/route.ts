import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { bidCommitSchema } from '@/lib/validation/schemas';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // ── Input Validation (Zod) ─────────────────────────────────
    const parsed = bidCommitSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { detail: 'Invalid request body', issues: parsed.error.issues.map(i => i.message) },
        { status: 400 }
      );
    }

    const bid = {
      bid_id: `BID-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      tender_id: parsed.data.tender_id,
      bidder_did: parsed.data.bidder_did,
      commitment_hash: parsed.data.commitment_hash,
      zkp_proof: parsed.data.zkp_proof,
      status: 'COMMITTED',
    };

    const { data, error } = await supabase.from('bids').insert(bid).select().single();

    if (error) {
      return NextResponse.json({ detail: error.message }, { status: 500 });
    }

    // Log audit event
    await supabase.from('audit_events').insert({
      event_id: `EVT-${Date.now()}`,
      event_type: 'BID_COMMITTED',
      topic: 'bid-events',
      timestamp_ist: new Date().toISOString(),
      data: { bid_id: data.bid_id, tender_id: body.tender_id, phase: 'SEALED_COMMIT' },
    });

    return NextResponse.json({ bid: data, message: 'Bid committed successfully on blockchain' });
  } catch (err: unknown) {
    return NextResponse.json({ detail: (err instanceof Error ? err.message : String(err)) }, { status: 500 });
  }
}
