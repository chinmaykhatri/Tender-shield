import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { tenderId: string } }
) {
  try {
    const tenderId = params.tenderId;

    const { data: bids, error } = await supabase
      .from('bids')
      .select('*')
      .eq('tender_id', tenderId)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ bids: [] }, { status: 500 });
    }

    return NextResponse.json({ bids: bids || [] });
  } catch (err: any) {
    return NextResponse.json({ bids: [] }, { status: 500 });
  }
}
