// FILE: app/api/v1/tenders/route.ts
// SECURITY LAYER: Input sanitization on tender creation
// BREAKS IF REMOVED: YES — tenders cannot be listed or created

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { sanitizeTenderInput, sanitizeText } from '@/lib/security/sanitize';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const statusFilter = sanitizeText(url.searchParams.get('status_filter') || '', 50);

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
    const raw = await req.json();

    // ─── Sanitize ALL input fields ──────────
    const sanitized = sanitizeTenderInput(raw);

    if (!sanitized.valid) {
      // Log injection attempt if detected
      if (sanitized.injectionDetected) {
        console.error('[TenderShield] 🚨 INJECTION ATTEMPT on /api/v1/tenders:', sanitized.errors);
      }
      return NextResponse.json(
        { detail: 'Invalid input', errors: sanitized.errors },
        { status: 400 }
      );
    }

    const data = sanitized.data!;

    const tender = {
      tender_id: `TDR-${data.ministry_code}-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`,
      title: data.title,
      description: data.description,
      ministry_code: data.ministry_code,
      category: data.category,
      estimated_value_paise: data.estimated_value_paise,
      procurement_method: sanitizeText(raw.procurement_method, 50) || 'OPEN_TENDER',
      status: 'DRAFT',
      bid_start_date: raw.bid_start_date,
      bid_end_date: raw.bid_end_date,
    };

    const { data: created, error } = await supabase.from('tenders').insert(tender).select().single();

    if (error) {
      return NextResponse.json({ detail: error.message }, { status: 500 });
    }

    // Log audit event
    await supabase.from('audit_events').insert({
      event_id: `EVT-${Date.now()}`,
      event_type: 'TENDER_CREATED',
      topic: 'tender-events',
      timestamp_ist: new Date().toISOString(),
      data: { tender_id: created.tender_id, ministry: created.ministry_code },
    });

    return NextResponse.json({ tender: created, message: 'Tender created successfully' });
  } catch (err: any) {
    return NextResponse.json({ detail: err.message }, { status: 500 });
  }
}
