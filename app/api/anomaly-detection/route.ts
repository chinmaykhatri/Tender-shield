import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

// ═══════════════════════════════════════════════════════════
// Anomaly Detection API — DUAL METHOD
// Method 1: Per-tender bid amount Z-Score + IQR (works with 3+ bids)
// Method 2: Time-series volume analysis (works with 4+ weeks)
// ═══════════════════════════════════════════════════════════

export const dynamic = 'force-dynamic';

function computeZScores(values: number[]): number[] {
  if (values.length < 2) return values.map(() => 0);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const std = Math.sqrt(values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length) || 1;
  return values.map(v => (v - mean) / std);
}

function computeIQR(values: number[]): { q1: number; q3: number; iqr: number; lowerFence: number; upperFence: number } {
  const sorted = [...values].sort((a, b) => a - b);
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];
  const iqr = q3 - q1;
  return { q1, q3, iqr, lowerFence: q1 - 1.5 * iqr, upperFence: q3 + 1.5 * iqr };
}

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    const { data: tenders } = await supabase
      .from('tenders')
      .select('id, tender_id, title, status, estimated_value, created_at, ministry_code')
      .order('created_at', { ascending: true });

    const { data: bids } = await supabase
      .from('bids')
      .select('id, tender_id, bidder_name, amount, flagged, created_at')
      .order('created_at', { ascending: true });

    // ── METHOD 1: Per-Tender Bid Amount Analysis (works with 3+ bids) ──
    const bidsByTender = new Map<string, { amounts: number[]; bidders: string[]; tender_title: string }>();
    (bids || []).forEach((b: any) => {
      if (!b.tender_id || !b.amount) return;
      if (!bidsByTender.has(b.tender_id)) {
        bidsByTender.set(b.tender_id, { amounts: [], bidders: [], tender_title: '' });
      }
      const entry = bidsByTender.get(b.tender_id)!;
      entry.amounts.push(Number(b.amount));
      entry.bidders.push(b.bidder_name || 'Unknown');
    });

    // Match tender titles
    (tenders || []).forEach((t: any) => {
      const tid = t.tender_id || t.id;
      if (bidsByTender.has(tid)) {
        bidsByTender.get(tid)!.tender_title = t.title || tid;
      }
    });

    const bidAnomalies: any[] = [];
    for (const [tenderId, data] of bidsByTender.entries()) {
      if (data.amounts.length < 3) continue;

      const zScores = computeZScores(data.amounts);
      const iqrResult = computeIQR(data.amounts);
      const mean = data.amounts.reduce((a, b) => a + b, 0) / data.amounts.length;
      const cv = (Math.sqrt(data.amounts.reduce((a, b) => a + (b - mean) ** 2, 0) / data.amounts.length) / mean) * 100;

      // Detect anomalies via BOTH methods
      data.amounts.forEach((amount, i) => {
        const zScore = Math.abs(zScores[i]);
        const isIQROutlier = amount < iqrResult.lowerFence || amount > iqrResult.upperFence;
        const isZScoreOutlier = zScore > 2.0;

        if (isZScoreOutlier || isIQROutlier) {
          bidAnomalies.push({
            tender_id: tenderId,
            tender_title: data.tender_title,
            bidder: data.bidders[i],
            amount,
            zscore: Math.round(zScore * 100) / 100,
            is_iqr_outlier: isIQROutlier,
            is_zscore_outlier: isZScoreOutlier,
            type: isZScoreOutlier && isIQROutlier ? 'DOUBLE_OUTLIER'
              : isZScoreOutlier ? 'ZSCORE_OUTLIER'
              : 'IQR_OUTLIER',
            detail: `Bid ₹${(amount / 10000000).toFixed(2)} Cr deviated ${zScore.toFixed(1)}σ from mean`,
          });
        }
      });

      // Coefficient of variation check (bid rigging indicator: < 5% = suspicious)
      if (cv < 5 && data.amounts.length >= 3) {
        bidAnomalies.push({
          tender_id: tenderId,
          tender_title: data.tender_title,
          bidder: 'MULTIPLE',
          amount: mean,
          zscore: 0,
          is_iqr_outlier: false,
          is_zscore_outlier: false,
          type: 'LOW_CV_COLLUSION',
          detail: `CV=${cv.toFixed(1)}% — bids suspiciously similar (rigging indicator)`,
        });
      }
    }

    // ── METHOD 2: Time-Series Volume Analysis (original) ──
    const weekMap = new Map<string, { tenders: number; bids: number; totalValue: number; flaggedBids: number; date: string }>();
    const getWeekKey = (d: string) => {
      const date = new Date(d);
      const yearStart = new Date(date.getFullYear(), 0, 1);
      const weekNum = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + yearStart.getDay() + 1) / 7);
      return `${date.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
    };

    (tenders || []).forEach((t: any) => {
      if (!t.created_at) return;
      const wk = getWeekKey(t.created_at);
      if (!weekMap.has(wk)) weekMap.set(wk, { tenders: 0, bids: 0, totalValue: 0, flaggedBids: 0, date: t.created_at });
      const entry = weekMap.get(wk)!;
      entry.tenders++;
      entry.totalValue += Number(t.estimated_value || 0);
    });

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

    let timeSeries: any[] = [];
    let timeSeriesAnomalies: any[] = [];

    if (weeks.length >= 2) {
      const tenderCounts = weeks.map(w => w.tenders);
      const bidCounts = weeks.map(w => w.bids);
      const valueSeries = weeks.map(w => w.totalValue);

      const tenderZScores = computeZScores(tenderCounts);
      const bidZScores = computeZScores(bidCounts);
      const valueZScores = computeZScores(valueSeries);

      timeSeries = weeks.map((w, i) => ({
        ...w,
        tender_zscore: Math.round(tenderZScores[i] * 100) / 100,
        bid_zscore: Math.round(bidZScores[i] * 100) / 100,
        value_zscore: Math.round(valueZScores[i] * 100) / 100,
      }));

      const THRESHOLD = 2.0;
      timeSeriesAnomalies = timeSeries
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
    }

    // ── COMBINE RESULTS ──
    const allAnomalies = [...bidAnomalies, ...timeSeriesAnomalies];
    const tenderCount = tenders?.length || 0;
    const bidCount = bids?.length || 0;

    return NextResponse.json({
      success: true,
      // Bid-level anomalies (primary — works with less data)
      bid_anomalies: bidAnomalies,
      // Time-series anomalies (secondary — requires history)
      time_series: timeSeries,
      time_series_anomalies: timeSeriesAnomalies,
      // Combined
      anomalies: allAnomalies,
      summary: {
        total_weeks: timeSeries.length,
        total_anomalies: allAnomalies.length,
        bid_level_anomalies: bidAnomalies.length,
        time_series_anomalies: timeSeriesAnomalies.length,
        highest_zscore: allAnomalies.length > 0 ? Math.max(...allAnomalies.map(a => a.zscore || 0)) : 0,
        total_tenders: tenderCount,
        total_bids: bidCount,
        tenders_analyzed: bidsByTender.size,
      },
      _data_source: tenderCount > 0 ? 'supabase_live' : 'insufficient_data',
      _methods: ['BID_ZSCORE_IQR', ...(timeSeries.length >= 2 ? ['TIME_SERIES_ZSCORE'] : [])],
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
