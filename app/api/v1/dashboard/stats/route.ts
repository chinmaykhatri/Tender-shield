import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // Get tender counts
    const { data: allTenders } = await supabase.from('tenders').select('*');
    const tenders = allTenders || [];

    const activeTenders = tenders.filter(t => ['BIDDING_OPEN', 'PUBLISHED'].includes(t.status));
    const flaggedTenders = tenders.filter(t => t.status === 'FROZEN_BY_AI');

    // Get bid count
    const { count: bidCount } = await supabase.from('bids').select('*', { count: 'exact', head: true });

    // Calculate total value
    const totalValuePaise = tenders.reduce((sum: number, t: any) => sum + (t.estimated_value_paise || 0), 0);
    const fraudPreventedPaise = flaggedTenders.reduce((sum: number, t: any) => sum + (t.estimated_value_paise || 0), 0);

    return NextResponse.json({
      stats: {
        total_tenders: tenders.length,
        active_tenders: activeTenders.length,
        total_bids: bidCount || 0,
        flagged_tenders: flaggedTenders.length,
        total_value_crores: totalValuePaise / 1_00_00_00_000,
        fraud_prevented_value_crores: fraudPreventedPaise / 1_00_00_00_000,
      },
    });
  } catch (err: any) {
    return NextResponse.json({
      stats: {
        total_tenders: 0, active_tenders: 0, total_bids: 0,
        flagged_tenders: 0, total_value_crores: 0, fraud_prevented_value_crores: 0,
      },
    }, { status: 500 });
  }
}
