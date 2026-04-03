/**
 * TenderShield — Statistical Fraud Analysis API
 * POST /api/fraud-analyze
 * 
 * Runs 5 real statistical detectors on bid data.
 * Unlike /api/ai-analyze (Claude LLM), this uses pure math:
 *   - Benford's Law (chi-squared test)
 *   - Coefficient of Variation (bid clustering)
 *   - Shell Company heuristics
 *   - Timing Collusion (interval analysis)
 *   - Cartel Rotation (Shannon entropy)
 */
import { NextRequest, NextResponse } from 'next/server';
import { runAllDetectors, type Bid } from '@/lib/fraudDetectors';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { bids, estimated_value, historical_winners, tender_id } = body;

    // Validate input
    if (!bids || !Array.isArray(bids) || bids.length === 0) {
      return NextResponse.json(
        { error: 'bids array is required (need ≥2 bids for analysis)' },
        { status: 400 }
      );
    }

    // Normalize bid data
    const normalizedBids: Bid[] = bids.map((b: Record<string, unknown>) => ({
      bidder_name: String(b.bidder_name || b.name || 'Unknown'),
      amount: parseFloat(String(b.amount)) || 0,
      gstin: b.gstin ? String(b.gstin) : undefined,
      pan: b.pan ? String(b.pan) : undefined,
      cin: b.cin ? String(b.cin) : undefined,
      incorporation_date: b.incorporation_date ? String(b.incorporation_date) : undefined,
      registered_address: String(b.registered_address || b.address || ''),
      submitted_at: String(b.submitted_at || b.timestamp || ''),
      past_wins: Number(b.past_wins) || 0,
    }));

    // Run all 5 statistical detectors
    const analysis = runAllDetectors(
      normalizedBids,
      parseFloat(estimated_value) || undefined,
      historical_winners
    );

    return NextResponse.json({
      ...analysis,
      tender_id: tender_id || 'live-analysis',
      source: 'statistical-engine',
      engine_version: '3.0',
      detectors_run: 5,
      bids_analyzed: normalizedBids.length,
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Analysis failed';
    console.error('[Fraud-Analyze] Error:', error);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
