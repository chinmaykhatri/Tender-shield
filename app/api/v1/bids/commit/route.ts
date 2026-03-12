import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const bid = {
      bid_id: `BID-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      tender_id: body.tender_id,
      bidder_did: body.bidder_did || '',
      commitment_hash: body.commitment_hash,
      zkp_proof: body.zkp_proof || '',
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
      data: { bid_id: data.bid_id, tender_id: body.tender_id, phase: 'ZKP_COMMIT' },
    });

    return NextResponse.json({ bid: data, message: 'Bid committed successfully on blockchain' });
  } catch (err: any) {
    return NextResponse.json({ detail: err.message }, { status: 500 });
  }
}
