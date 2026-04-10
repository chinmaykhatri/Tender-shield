import { NextResponse } from 'next/server';
import { getRecentAnchors } from '@/lib/blockchain/polygonAnchor';

// ============================================================================
// TenderShield — Polygon Anchors API
// ============================================================================
// Returns list of Polygon Amoy anchor records for dashboard display.
// Each anchor contains a Merkle root committed to a real public blockchain.
// ============================================================================

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { anchors, total_anchors } = await getRecentAnchors(20);

    return NextResponse.json({
      anchors,
      total_anchors,
      network: 'polygon-amoy',
      chain_id: 80002,
      anchor_interval: '10 minutes',
      explorer_base: 'https://amoy.polygonscan.com/tx/',
      polygon_configured: !!process.env.POLYGON_PRIVATE_KEY,
      description: 'Merkle roots of TenderShield audit events anchored to Polygon Amoy testnet for public verifiability.',
    });
  } catch (error) {
    return NextResponse.json({
      anchors: [],
      total_anchors: 0,
      network: 'polygon-amoy',
      chain_id: 80002,
      anchor_interval: '10 minutes',
      explorer_base: 'https://amoy.polygonscan.com/tx/',
      polygon_configured: !!process.env.POLYGON_PRIVATE_KEY,
      error: error instanceof Error ? error.message : 'Failed to fetch anchors',
    });
  }
}
