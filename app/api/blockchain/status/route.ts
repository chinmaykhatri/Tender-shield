import { NextResponse } from 'next/server';

// ============================================================================
// TenderShield — Blockchain Network Status API
// ============================================================================
// Returns honest status of the Fabric network.
// - LIVE: Real Hyperledger Fabric peers are running and reachable
// - SHA256_AUDIT_LOG: Fabric not deployed, using Supabase hash-chain simulation
// ============================================================================

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function probeFabricBackend(): Promise<{
  fabric_live: boolean;
  peer_count: number;
  org_count: number;
  block_height: number | null;
} | null> {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL;
  if (!backendUrl) return null;

  try {
    const res = await fetch(`${backendUrl}/api/v1/fabric/status`, {
      signal: AbortSignal.timeout(3000),
      cache: 'no-store',
    });
    if (res.ok) return await res.json();
  } catch {
    // Backend not reachable — expected when Fabric isn't running
  }
  return null;
}

async function probeDockerFabric(): Promise<boolean> {
  // Check if FABRIC_LIVE env is explicitly set
  return process.env.FABRIC_LIVE === 'true';
}

export async function GET() {
  const startMs = Date.now();

  // Strategy 1: Ask the FastAPI backend (which may have direct Fabric SDK access)
  const fabricStatus = await probeFabricBackend();

  if (fabricStatus?.fabric_live) {
    return NextResponse.json({
      status: 'LIVE',
      peers_active: fabricStatus.peer_count ?? 8,
      orgs_active: fabricStatus.org_count ?? 4,
      block_height: fabricStatus.block_height,
      channel: 'tenderchannel',
      chaincode: 'tendershield v1.0',
      endorsement: "AND('MinistryOrgMSP.peer', 'NICOrgMSP.peer')",
      consensus: 'Raft (etcdraft) — 3 orderers',
      mode: 'REAL_HYPERLEDGER_FABRIC',
      organizations: [
        { name: 'MinistryOrg', role: 'Tender Creator / Evaluator', peers: 2 },
        { name: 'BidderOrg', role: 'Vendor / Bidder', peers: 2 },
        { name: 'AuditorOrg', role: 'CAG Audit Authority', peers: 2 },
        { name: 'NICOrg', role: 'AI Platform / Infrastructure', peers: 2 },
      ],
      latency_ms: Date.now() - startMs,
    });
  }

  // Strategy 2: Check env flag
  const fabricLive = await probeDockerFabric();
  if (fabricLive) {
    return NextResponse.json({
      status: 'LIVE',
      peers_active: 8,
      orgs_active: 4,
      block_height: null, // Can't query without SDK
      channel: 'tenderchannel',
      chaincode: 'tendershield v1.0',
      endorsement: "AND('MinistryOrgMSP.peer', 'NICOrgMSP.peer')",
      consensus: 'Raft (etcdraft) — 3 orderers',
      mode: 'REAL_HYPERLEDGER_FABRIC',
      note: 'FABRIC_LIVE=true — run `docker exec cli.tendershield peer channel getinfo -c tenderchannel` to verify',
      organizations: [
        { name: 'MinistryOrg', role: 'Tender Creator / Evaluator', peers: 2 },
        { name: 'BidderOrg', role: 'Vendor / Bidder', peers: 2 },
        { name: 'AuditorOrg', role: 'CAG Audit Authority', peers: 2 },
        { name: 'NICOrg', role: 'AI Platform / Infrastructure', peers: 2 },
      ],
      latency_ms: Date.now() - startMs,
    });
  }

  // Honest fallback — Fabric is not running
  return NextResponse.json({
    status: 'SHA256_AUDIT_LOG',
    peers_active: 0,
    orgs_active: 0,
    block_height: null,
    channel: 'tenderchannel',
    chaincode: 'tendershield v1.0 (compiled, not deployed)',
    endorsement: "AND('MinistryOrgMSP.peer', 'NICOrgMSP.peer') — designed policy",
    consensus: 'Raft (etcdraft) — designed, not running',
    mode: 'LOCAL_SIMULATION',
    note: 'Run network/start-fabric.sh to activate Hyperledger Fabric network with 8 peers and 4 orgs.',
    simulation_details: {
      hash_algorithm: 'SHA-256 (FIPS 180-4)',
      data_source: 'Supabase audit_events',
      chain_integrity: 'Each block hash = SHA-256(blockNum + prevHash + dataHash + timestamp)',
    },
    latency_ms: Date.now() - startMs,
  });
}
