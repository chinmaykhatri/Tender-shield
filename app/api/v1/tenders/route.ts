import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const statusFilter = url.searchParams.get('status_filter');

    let query = supabase.from('tenders').select('*').order('created_at', { ascending: false });

    if (statusFilter) {
      query = query.eq('status', statusFilter);
    }

    const { data: tenders, error } = await query;

    if (error) {
      return NextResponse.json({ tenders: [], error: error.message }, { status: 500 });
    }

    return NextResponse.json({ tenders: tenders || [] });
  } catch (err: any) {
    return NextResponse.json({ tenders: [], error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const tender = {
      tender_id: `TDR-${body.ministry_code}-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`,
      title: body.title,
      description: body.description || '',
      ministry_code: body.ministry_code,
      category: body.category || 'WORKS',
      estimated_value_paise: body.estimated_value_paise || 0,
      procurement_method: body.procurement_method || 'OPEN_TENDER',
      status: 'DRAFT',
      bid_start_date: body.bid_start_date,
      bid_end_date: body.bid_end_date,
    };

    const { data, error } = await supabase.from('tenders').insert(tender).select().single();

    if (error) {
      return NextResponse.json({ detail: error.message }, { status: 500 });
    }

    // Log audit event
    await supabase.from('audit_events').insert({
      event_id: `EVT-${Date.now()}`,
      event_type: 'TENDER_CREATED',
      topic: 'tender-events',
      timestamp_ist: new Date().toISOString(),
      data: { tender_id: data.tender_id, ministry: data.ministry_code },
    });

    return NextResponse.json({ tender: data, message: 'Tender created successfully' });
  } catch (err: any) {
    return NextResponse.json({ detail: err.message }, { status: 500 });
  }
}
