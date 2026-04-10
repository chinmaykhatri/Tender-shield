/**
 * ============================================================================
 * TenderShield — Polygon Amoy Merkle Root Anchor Service
 * ============================================================================
 * Every 10 minutes, computes a Merkle root of recent audit events and anchors
 * it to Polygon Amoy testnet as a data transaction. This provides real public
 * blockchain immutability — even if Supabase data is tampered with, the
 * Polygon anchor proves the original Merkle root.
 *
 * Setup:
 *   1. Create MetaMask wallet on Polygon Amoy (chain ID 80002)
 *   2. Get free test MATIC from faucet.polygon.technology
 *   3. Set POLYGON_PRIVATE_KEY in Vercel environment variables
 * ============================================================================
 */

import { createHash } from 'crypto';

const AMOY_RPC = 'https://rpc-amoy.polygon.technology';
const CHAIN_ID = 80002;

function sha256(data: string): string {
  return createHash('sha256').update(data).digest('hex');
}

function buildMerkleRoot(hashes: string[]): string {
  if (hashes.length === 0) return '0'.repeat(64);
  if (hashes.length === 1) return hashes[0];

  const pairs: string[] = [];
  for (let i = 0; i < hashes.length; i += 2) {
    const left = hashes[i];
    const right = hashes[i + 1] ?? hashes[i]; // duplicate last if odd
    pairs.push(sha256(left + right));
  }
  return buildMerkleRoot(pairs);
}

export async function anchorMerkleRoot(): Promise<{
  polygon_tx: string;
  merkle_root: string;
  anchored_at: string;
  events_count: number;
  verify_url: string;
  network: string;
} | null> {
  const privateKey = process.env.POLYGON_PRIVATE_KEY;
  if (!privateKey) {
    console.log('[Anchor] No POLYGON_PRIVATE_KEY — skipping Polygon anchor');
    return null;
  }

  // Dynamic import to avoid bundling ethers when not used
  const { ethers } = await import('ethers');
  const { createClient } = await import('@supabase/supabase-js');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    console.log('[Anchor] Missing Supabase credentials');
    return null;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Fetch recent audit events (last 10 minutes)
  const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { data: events, error } = await supabase
    .from('audit_events')
    .select('event_id, event_type, timestamp_ist')
    .gte('timestamp_ist', tenMinAgo)
    .order('timestamp_ist', { ascending: true });

  if (error || !events || events.length === 0) {
    console.log(`[Anchor] No events to anchor (${error?.message ?? 'none found'})`);
    return null;
  }

  // Build Merkle root from event hashes
  const hashes = events.map(e =>
    sha256(`${e.event_id}|${e.event_type}|${e.timestamp_ist}`)
  );
  const merkleRoot = buildMerkleRoot(hashes);

  // Submit to Polygon as data transaction (send to self, value 0)
  const provider = new ethers.JsonRpcProvider(AMOY_RPC);
  const wallet = new ethers.Wallet(privateKey, provider);

  const anchorData = `TenderShield|${merkleRoot}|events:${events.length}|${new Date().toISOString()}`;
  const data = ethers.hexlify(ethers.toUtf8Bytes(anchorData));

  console.log(`[Anchor] Submitting ${events.length} events, Merkle root: ${merkleRoot.slice(0, 20)}...`);

  const tx = await wallet.sendTransaction({
    to: wallet.address, // self-send data transaction
    value: 0n,
    data,
    chainId: BigInt(CHAIN_ID),
  });

  const receipt = await tx.wait();
  const polygonTx = receipt?.hash ?? tx.hash;

  console.log(`[Anchor] ✅ Anchored to Polygon TX: ${polygonTx}`);

  // Store anchor record in Supabase
  const anchorRecord = {
    polygon_tx: polygonTx,
    merkle_root: merkleRoot,
    events_count: events.length,
    anchored_at: new Date().toISOString(),
    network: 'polygon-amoy',
    verify_url: `https://amoy.polygonscan.com/tx/${polygonTx}`,
  };

  await supabase.from('polygon_anchors').insert(anchorRecord).single();

  return anchorRecord;
}

/**
 * Get recent anchor records from Supabase
 */
export async function getRecentAnchors(limit: number = 20): Promise<{
  anchors: Array<{
    polygon_tx: string;
    merkle_root: string;
    events_count: number;
    anchored_at: string;
    network: string;
    verify_url: string;
  }>;
  total_anchors: number;
}> {
  const { createClient } = await import('@supabase/supabase-js');
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return { anchors: [], total_anchors: 0 };
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data: anchors, error } = await supabase
    .from('polygon_anchors')
    .select('*')
    .order('anchored_at', { ascending: false })
    .limit(limit);

  if (error || !anchors) {
    return { anchors: [], total_anchors: 0 };
  }

  const { count } = await supabase
    .from('polygon_anchors')
    .select('*', { count: 'exact', head: true });

  return {
    anchors,
    total_anchors: count ?? anchors.length,
  };
}
