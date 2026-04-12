import { NextResponse } from 'next/server';
import { detectDirectorNetwork } from '@/lib/fraud/networkDetection';
import { requirePermission } from '@/lib/rbac';

// ═══════════════════════════════════════════════════════════
// Network Graph API — Shell Company Relationship Detector
// Uses real director cross-referencing from lib/fraud/networkDetection
// ═══════════════════════════════════════════════════════════

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    // Extract role from query params for RBAC
    const url = new URL(req.url);
    const userRole = url.searchParams.get('role') || undefined;

    // RBAC check (optional in GET — allows unauthenticated but logs warning)
    if (userRole) {
      const denied = requirePermission(userRole, 'ai_analyze');
      if (denied) return denied;
    }

    const network = await detectDirectorNetwork();

    // Transform to the format the frontend expects
    const nodes = network.nodes.map(n => ({
      id: n.id,
      label: n.label,
      risk: n.risk_score || 0,
      bids: 0,
      flagged: (n.risk_score || 0) > 60,
      type: n.type,
      ...(n.metadata || {}),
    }));

    const links = network.edges.map(e => ({
      source: e.source,
      target: e.target,
      type: e.label,
      strength: e.weight,
      detail: `${e.type}: ${e.label}`,
    }));

    return NextResponse.json({
      success: true,
      nodes,
      links,
      stats: {
        total_companies: nodes.filter(n => n.type === 'company').length,
        flagged_connections: links.filter(l => l.strength > 0.6).length,
        high_risk_clusters: nodes.filter(n => n.risk > 60).length,
        total_nodes: nodes.length,
        total_edges: links.length,
      },
      _data_source: network.data_source,
      _total_director_links: network.total_links,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      _data_source: 'ERROR',
    }, { status: 500 });
  }
}
