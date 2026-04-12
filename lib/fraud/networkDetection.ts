// ═══════════════════════════════════════════════════════════
// TenderShield — Director Network Detection
// Detects shell company relationships via shared directors/PAN
// ═══════════════════════════════════════════════════════════

import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

interface DirectorLink {
  source_company: string;
  target_company: string;
  shared_director: string;
  shared_pan: string;
  link_type: 'SHARED_DIRECTOR' | 'SHARED_PAN' | 'SHARED_ADDRESS';
  confidence: number;
}

interface NetworkNode {
  id: string;
  label: string;
  type: 'company' | 'director' | 'tender';
  risk_score?: number;
  metadata?: Record<string, any>;
}

interface NetworkEdge {
  source: string;
  target: string;
  label: string;
  type: string;
  weight: number;
}

/**
 * Detect director networks from the database.
 * Checks: shared PAN, shared directors, shared addresses across bidding companies.
 */
export async function detectDirectorNetwork(): Promise<{
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  data_source: string;
  total_links: number;
}> {
  const supabase = getSupabaseAdmin();

  try {
    // 1. Check for director_network table (real detection)
    const { data: directorLinks, error: dirError } = await supabase
      .from('director_network')
      .select('*')
      .limit(200);

    if (!dirError && directorLinks && directorLinks.length > 0) {
      return buildGraphFromDirectorTable(directorLinks);
    }

    // 2. Fall back to bid-level cross-referencing
    const { data: bids } = await supabase
      .from('bids')
      .select('id, tender_id, bidder_name, bidder_gstin, amount, flagged, verification_data')
      .order('created_at', { ascending: false })
      .limit(500);

    if (bids && bids.length >= 3) {
      return buildGraphFromBids(bids);
    }

    // 3. Seed data with honest labeling
    return getHonestSeedData();

  } catch {
    return getHonestSeedData();
  }
}

function buildGraphFromDirectorTable(links: any[]): {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  data_source: string;
  total_links: number;
} {
  const nodes = new Map<string, NetworkNode>();
  const edges: NetworkEdge[] = [];

  for (const link of links) {
    // Company nodes
    if (!nodes.has(link.company_a)) {
      nodes.set(link.company_a, {
        id: link.company_a,
        label: link.company_a_name || link.company_a,
        type: 'company',
        risk_score: link.risk_score_a,
      });
    }
    if (!nodes.has(link.company_b)) {
      nodes.set(link.company_b, {
        id: link.company_b,
        label: link.company_b_name || link.company_b,
        type: 'company',
        risk_score: link.risk_score_b,
      });
    }

    // Director node
    const dirId = `DIR-${link.shared_identifier || link.id}`;
    if (!nodes.has(dirId)) {
      nodes.set(dirId, {
        id: dirId,
        label: link.director_name || link.shared_identifier || 'Unknown Director',
        type: 'director',
        metadata: { pan: link.shared_pan, din: link.shared_din },
      });
    }

    // Edges
    edges.push({
      source: link.company_a,
      target: dirId,
      label: `Shared ${link.link_type || 'Director'}`,
      type: link.link_type || 'SHARED_DIRECTOR',
      weight: link.confidence || 0.9,
    });
    edges.push({
      source: dirId,
      target: link.company_b,
      label: `Shared ${link.link_type || 'Director'}`,
      type: link.link_type || 'SHARED_DIRECTOR',
      weight: link.confidence || 0.9,
    });
  }

  return {
    nodes: Array.from(nodes.values()),
    edges,
    data_source: 'DATABASE_DIRECTOR_TABLE',
    total_links: links.length,
  };
}

function buildGraphFromBids(bids: any[]): {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  data_source: string;
  total_links: number;
} {
  const nodes = new Map<string, NetworkNode>();
  const edges: NetworkEdge[] = [];

  // Group bids by GSTIN prefix (first 12 chars = PAN + state)
  const gstinMap = new Map<string, Set<string>>();
  for (const bid of bids) {
    if (!bid.bidder_gstin || bid.bidder_gstin.length < 12) continue;
    const panPart = bid.bidder_gstin.slice(2, 12); // Extract PAN from GSTIN
    if (!gstinMap.has(panPart)) gstinMap.set(panPart, new Set());
    gstinMap.get(panPart)!.add(bid.bidder_name || bid.id);

    // Add company node
    const companyId = bid.bidder_name || bid.id;
    if (!nodes.has(companyId)) {
      nodes.set(companyId, {
        id: companyId,
        label: companyId,
        type: 'company',
        risk_score: bid.flagged ? 85 : 30,
      });
    }
  }

  // Find shared PANs (companies with same PAN = shell company indicator)
  let linkCount = 0;
  for (const [pan, companies] of gstinMap.entries()) {
    if (companies.size < 2) continue;
    const arr = Array.from(companies);
    const panNode: NetworkNode = {
      id: `PAN-${pan}`,
      label: `PAN: ${pan.slice(0, 4)}****${pan.slice(-1)}`,
      type: 'director',
      metadata: { pan, type: 'SHARED_PAN' },
    };
    nodes.set(panNode.id, panNode);

    for (const company of arr) {
      edges.push({
        source: company,
        target: panNode.id,
        label: 'Shared PAN',
        type: 'SHARED_PAN',
        weight: 0.95,
      });
      linkCount++;
    }
  }

  return {
    nodes: Array.from(nodes.values()),
    edges,
    data_source: 'GSTIN_CROSS_REFERENCE',
    total_links: linkCount,
  };
}

function getHonestSeedData() {
  return {
    nodes: [
      { id: 'biomed', label: 'BioMed Corp India', type: 'company' as const, risk_score: 92 },
      { id: 'pharma', label: 'Pharma Plus Equipment', type: 'company' as const, risk_score: 88 },
      { id: 'medicare', label: 'MediCare India Pvt Ltd', type: 'company' as const, risk_score: 12 },
      { id: 'dir-rks', label: 'Ramesh K. Sharma', type: 'director' as const, metadata: { pan: 'ABCDE1234F', din: '09876543' } },
      { id: 'aiims-tender', label: 'AIIMS Delhi ₹120Cr', type: 'tender' as const, risk_score: 94 },
    ],
    edges: [
      { source: 'biomed', target: 'dir-rks', label: 'Director (DIN: 09876543)', type: 'SHARED_DIRECTOR', weight: 0.95 },
      { source: 'pharma', target: 'dir-rks', label: 'Director (DIN: 09876543)', type: 'SHARED_DIRECTOR', weight: 0.95 },
      { source: 'biomed', target: 'aiims-tender', label: 'Bid: ₹119.8 Cr', type: 'BID', weight: 0.6 },
      { source: 'pharma', target: 'aiims-tender', label: 'Bid: ₹120.1 Cr', type: 'BID', weight: 0.6 },
      { source: 'medicare', target: 'aiims-tender', label: 'Bid: ₹115.5 Cr', type: 'BID', weight: 0.3 },
    ],
    data_source: 'DEMO_SEED',
    total_links: 5,
  };
}
