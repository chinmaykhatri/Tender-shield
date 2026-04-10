import { NextResponse } from 'next/server';
import { anchorMerkleRoot } from '@/lib/blockchain/polygonAnchor';

// ============================================================================
// TenderShield — Polygon Anchor Cron Job
// ============================================================================
// Called by Vercel Cron every 10 minutes.
// Computes Merkle root of recent audit events and anchors to Polygon Amoy.
// ============================================================================

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET(req: Request) {
  // Verify this is called by Vercel Cron or contains valid secret
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await anchorMerkleRoot();

    if (result) {
      return NextResponse.json({
        success: true,
        ...result,
        message: `Anchored ${result.events_count} events to Polygon Amoy`,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Nothing to anchor — no recent events or POLYGON_PRIVATE_KEY not set',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Anchor Cron] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
