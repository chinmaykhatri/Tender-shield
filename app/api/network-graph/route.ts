import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

// ═══════════════════════════════════════════════════════════
// Network Graph API — Shell Company Relationship Detector
// Builds nodes (companies) and edges (shared attributes)
// ═══════════════════════════════════════════════════════════

export const dynamic = 'force-dynamic';

// Seed data for when Supabase has < 5 bidders
const SEED_DATA = {
  nodes: [
    { id: 'MedTech-Solutions', label: 'MedTech Solutions Pvt Ltd', risk: 82, bids: 14, flagged: true, pan: 'MEDTK1234M', state: 'Maharashtra' },
    { id: 'HealthEquip-India', label: 'HealthEquip India Ltd', risk: 75, bids: 11, flagged: true, pan: 'HEQIP5678K', state: 'Maharashtra' },
    { id: 'PharmaPlus-Corp', label: 'PharmaPlus Corp', risk: 68, bids: 9, flagged: true, pan: 'PHARM9012P', state: 'Delhi' },
    { id: 'InfraBuilders-Ltd', label: 'InfraBuilders Ltd', risk: 35, bids: 22, flagged: false, pan: 'INFRA3456B', state: 'Karnataka' },
    { id: 'GreenTech-Energy', label: 'GreenTech Energy Pvt Ltd', risk: 15, bids: 8, flagged: false, pan: 'GRENT7890E', state: 'Tamil Nadu' },
    { id: 'DataSystems-India', label: 'DataSystems India', risk: 45, bids: 6, flagged: false, pan: 'DATSY2345D', state: 'Telangana' },
    { id: 'SecureNET-Pvt', label: 'SecureNET Pvt Ltd', risk: 55, bids: 4, flagged: true, pan: 'SECNT6789S', state: 'Delhi' },
    { id: 'OmniTrade-Global', label: 'OmniTrade Global', risk: 90, bids: 3, flagged: true, pan: 'OMNIT1111O', state: 'Gujarat' },
  ],
  links: [
    { source: 'MedTech-Solutions', target: 'HealthEquip-India', type: 'Shared Director', strength: 0.9, detail: 'Rajesh Sharma (DIN: 09876543)' },
    { source: 'MedTech-Solutions', target: 'PharmaPlus-Corp', type: 'Same Address', strength: 0.7, detail: 'Plot 42, Andheri East, Mumbai' },
    { source: 'HealthEquip-India', target: 'PharmaPlus-Corp', type: 'Bid Pattern Match', strength: 0.6, detail: '87% bid timing correlation in MoHFW tenders' },
    { source: 'PharmaPlus-Corp', target: 'SecureNET-Pvt', type: 'GSTIN Prefix', strength: 0.5, detail: 'Same GSTIN prefix 07AABCP' },
    { source: 'SecureNET-Pvt', target: 'OmniTrade-Global', type: 'Shared Director', strength: 0.85, detail: 'Vijay Malhotra (DIN: 12345678)' },
    { source: 'MedTech-Solutions', target: 'OmniTrade-Global', type: 'Financial Flow', strength: 0.4, detail: '₹2.3 Cr transferred via intermediary' },
  ],
  _data_source: 'seed_demonstration',
  _note: 'Seed data showing fraud network patterns. Live Supabase data used when available.',
};

export async function GET() {
  try {
    const { data: bids } = await getSupabaseAdmin()
      .from('bids')
      .select('bidder_name, bidder_id, tender_id, amount, flagged, created_at')
      .order('created_at', { ascending: false })
      .limit(200);

    if (!bids || bids.length < 5) {
      return NextResponse.json({
        success: true,
        ...SEED_DATA,
        stats: {
          total_companies: SEED_DATA.nodes.length,
          flagged_connections: SEED_DATA.links.filter(l => l.strength > 0.6).length,
          high_risk_clusters: 2,
        },
      });
    }

    // Build network from real data
    const bidderMap = new Map<string, { bids: number; flagged: number; tenders: Set<string> }>();
    bids.forEach((b: any) => {
      const key = b.bidder_name || b.bidder_id || 'Unknown';
      if (!bidderMap.has(key)) bidderMap.set(key, { bids: 0, flagged: 0, tenders: new Set() });
      const entry = bidderMap.get(key)!;
      entry.bids++;
      if (b.flagged) entry.flagged++;
      entry.tenders.add(b.tender_id);
    });

    const nodes = Array.from(bidderMap.entries()).map(([id, data]) => ({
      id: id.replace(/\s+/g, '-'),
      label: id,
      risk: Math.min(100, Math.round((data.flagged / data.bids) * 100)),
      bids: data.bids,
      flagged: data.flagged > 0,
      tenders: data.tenders.size,
    }));

    // Find connections: bidders on same tenders
    const links: any[] = [];
    const nodeArray = Array.from(bidderMap.entries());
    for (let i = 0; i < nodeArray.length; i++) {
      for (let j = i + 1; j < nodeArray.length; j++) {
        const [id1, data1] = nodeArray[i];
        const [id2, data2] = nodeArray[j];
        const sharedTenders = [...data1.tenders].filter(t => data2.tenders.has(t));
        if (sharedTenders.length > 0) {
          links.push({
            source: id1.replace(/\s+/g, '-'),
            target: id2.replace(/\s+/g, '-'),
            type: 'Co-Bidders',
            strength: Math.min(1, sharedTenders.length / 3),
            detail: `Co-bid on ${sharedTenders.length} tender(s)`,
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      nodes,
      links,
      stats: {
        total_companies: nodes.length,
        flagged_connections: links.filter(l => l.strength > 0.5).length,
        high_risk_clusters: nodes.filter(n => n.risk > 60).length,
      },
      _data_source: 'supabase_live',
    });
  } catch (error: any) {
    return NextResponse.json({
      success: true,
      ...SEED_DATA,
      stats: { total_companies: SEED_DATA.nodes.length, flagged_connections: SEED_DATA.links.length, high_risk_clusters: 2 },
      _data_source: 'seed_fallback',
      _error: error.message,
    });
  }
}
