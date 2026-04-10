import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

// ═══════════════════════════════════════════════════════════
// Anomaly Detection API — Time-Series Z-Score Analysis
// Detects unusual patterns in tender/bid timing and volumes
// ═══════════════════════════════════════════════════════════

export const dynamic = 'force-dynamic';

function computeZScores(values: number[]): number[] {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const std = Math.sqrt(values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length) || 1;
  return values.map(v => (v - mean) / std);
}

export async function GET() {
  try {
    const { data: tenders } = await getSupabaseAdmin()
      .from('tenders')
      .select('id, title, status, estimated_value, created_at, ministry_code')
      .order('created_at', { ascending: true });

    const { data: bids } = await getSupabaseAdmin()
      .from('bids')
      .select('id, tender_id, amount, flagged, created_at')
      .order('created_at', { ascending: true });

    // Group by week
    const weekMap = new Map<string, { tenders: number; bids: number; totalValue: number; flaggedBids: number; date: string }>();
    const getWeekKey = (d: string) => {
      const date = new Date(d);
      const yearStart = new Date(date.getFullYear(), 0, 1);
      const weekNum = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + yearStart.getDay() + 1) / 7);
      return `${date.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
    };

    // Process tenders
    (tenders || []).forEach((t: any) => {
      if (!t.created_at) return;
      const wk = getWeekKey(t.created_at);
      if (!weekMap.has(wk)) weekMap.set(wk, { tenders: 0, bids: 0, totalValue: 0, flaggedBids: 0, date: t.created_at });
      const entry = weekMap.get(wk)!;
      entry.tenders++;
      entry.totalValue += Number(t.estimated_value || 0);
    });

    // Process bids
    (bids || []).forEach((b: any) => {
      if (!b.created_at) return;
      const wk = getWeekKey(b.created_at);
      if (!weekMap.has(wk)) weekMap.set(wk, { tenders: 0, bids: 0, totalValue: 0, flaggedBids: 0, date: b.created_at });
      const entry = weekMap.get(wk)!;
      entry.bids++;
      if (b.flagged) entry.flaggedBids++;
    });

    const weeks = Array.from(weekMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([week, data]) => ({ week, ...data }));

    // Compute z-scores
    const tenderCounts = weeks.map(w => w.tenders);
    const bidCounts = weeks.map(w => w.bids);
    const valueSeries = weeks.map(w => w.totalValue);

    const tenderZScores = computeZScores(tenderCounts);
    const bidZScores = computeZScores(bidCounts);
    const valueZScores = computeZScores(valueSeries);

    const timeSeries = weeks.map((w, i) => ({
      ...w,
      tender_zscore: Math.round(tenderZScores[i] * 100) / 100,
      bid_zscore: Math.round(bidZScores[i] * 100) / 100,
      value_zscore: Math.round(valueZScores[i] * 100) / 100,
    }));

    // Detect anomalies (|z| > 2)
    const THRESHOLD = 2.0;
    const anomalies = timeSeries
      .filter(w =>
        Math.abs(w.tender_zscore) > THRESHOLD ||
        Math.abs(w.bid_zscore) > THRESHOLD ||
        Math.abs(w.value_zscore) > THRESHOLD
      )
      .map(w => ({
        week: w.week,
        date: w.date,
        type: Math.abs(w.tender_zscore) > THRESHOLD ? 'Tender Volume Spike'
            : Math.abs(w.bid_zscore) > THRESHOLD ? 'Bid Activity Anomaly'
            : 'Value Outlier',
        zscore: Math.max(Math.abs(w.tender_zscore), Math.abs(w.bid_zscore), Math.abs(w.value_zscore)),
        detail: `Tenders: ${w.tenders}, Bids: ${w.bids}, Value: ₹${(w.totalValue / 10000000).toFixed(1)} Cr`,
      }));

    return NextResponse.json({
      success: true,
      time_series: timeSeries,
      anomalies,
      summary: {
        total_weeks: timeSeries.length,
        total_anomalies: anomalies.length,
        highest_zscore: anomalies.length > 0 ? Math.max(...anomalies.map(a => a.zscore)) : 0,
        total_tenders: tenderCounts.reduce((a, b) => a + b, 0),
        total_bids: bidCounts.reduce((a, b) => a + b, 0),
      },
      _data_source: (tenders?.length || 0) > 0 ? 'supabase_live' : 'insufficient_data',
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
