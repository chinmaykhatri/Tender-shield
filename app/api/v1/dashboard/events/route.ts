import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const topic = url.searchParams.get('topic');

    let query = supabase.from('audit_events').select('*').order('created_at', { ascending: false }).limit(50);

    if (topic) {
      query = query.eq('topic', topic);
    }

    const { data: events, error } = await query;

    if (error) {
      return NextResponse.json({ events: [] }, { status: 500 });
    }

    return NextResponse.json({ events: events || [] });
  } catch (err: unknown) {
    return NextResponse.json({ events: [] }, { status: 500 });
  }
}
