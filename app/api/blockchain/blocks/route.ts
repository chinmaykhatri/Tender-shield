// ─────────────────────────────────────────────────
// FILE: app/api/blockchain/blocks/route.ts
// TYPE: API ROUTE
// SECRET KEYS USED: none
// WHAT THIS FILE DOES: Returns DYNAMIC blockchain blocks+transactions for the visual explorer
// Blocks auto-generate based on real time so the explorer feels "live"
// ─────────────────────────────────────────────────

import { NextResponse } from 'next/server';

// ─── Genesis Configuration ───
const GENESIS_TIMESTAMP = new Date('2025-01-15T00:00:00+05:30').getTime();
const BLOCK_INTERVAL_MS = 8000; // ~8 seconds per block (realistic for Fabric)

// Deterministic hash from a number (consistent across refreshes)
function blockHash(seed: number): string {
  let h = seed * 2654435761;
  const chars = '0123456789abcdef';
  let hash = '0x';
  for (let i = 0; i < 64; i++) {
    h = (h * 31 + i * 17) & 0x7fffffff;
    hash += chars[h % 16];
  }
  return hash;
}

// Cycle through tender IDs and event types deterministically
const TENDER_IDS = [
  'TDR-MoH-2025-000003', 'TDR-MoRTH-2025-000001', 'TDR-MoE-2025-000002',
  'TDR-MoD-2025-000004', 'TDR-MoR-2025-000005', 'TDR-MoUD-2025-000006',
  'TDR-MoWCD-2025-000007', 'TDR-MoIT-2025-000008',
];
const EVENT_TYPES = [
  'BID_COMMITTED', 'BID_COMMITTED', 'TENDER_CREATED', 'BID_REVEALED',
  'COMMITMENT_VERIFIED', 'BID_COMMITTED', 'TENDER_AWARDED', 'AI_ANALYSIS',
  'AUDIT_LOGGED', 'BID_COMMITTED', 'TENDER_CREATED', 'BID_REVEALED',
  'BID_COMMITTED', 'COMMITMENT_VERIFIED', 'BID_COMMITTED', 'TENDER_FROZEN',
];
const INVOKERS = [
  'medtech@medtechsolutions.com', 'admin@biomedicorp.com', 'officer@morth.gov.in',
  'AI_SYSTEM', 'admin@pharmaplus.com', 'officer@railways.gov.in',
  'AI_SYSTEM', 'auditor@cag.gov.in', 'officer@mod.gov.in',
  'admin@alstom.in', 'officer@moud.gov.in', 'AI_SYSTEM',
  'admin@tcs.com', 'officer@meity.gov.in', 'admin@dataforge.in', 'AI_SYSTEM',
];

function generateDynamicBlocks(count: number = 20) {
  const now = Date.now();
  const currentBlockNum = Math.floor((now - GENESIS_TIMESTAMP) / BLOCK_INTERVAL_MS);
  const blocks = [];

  for (let i = 0; i < count; i++) {
    const blockNum = currentBlockNum - i;
    const blockTime = new Date(GENESIS_TIMESTAMP + blockNum * BLOCK_INTERVAL_MS);

    // Format as IST
    const istStr = blockTime.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false,
    });

    const hash = blockHash(blockNum);
    const prevHash = blockHash(blockNum - 1);
    const txCount = 1 + (blockNum % 3); // 1-3 TXs per block
    const eventIdx = blockNum % EVENT_TYPES.length;
    const tenderIdx = blockNum % TENDER_IDS.length;
    const invokerIdx = blockNum % INVOKERS.length;

    const transactions = Array.from({ length: txCount }, (_, t) => {
      const txEventIdx = (eventIdx + t) % EVENT_TYPES.length;
      const txTenderIdx = (tenderIdx + t) % TENDER_IDS.length;
      const txInvokerIdx = (invokerIdx + t) % INVOKERS.length;
      return {
        tx_id: `TX-${blockHash(blockNum * 100 + t).substring(2, 10).toUpperCase()}`,
        type: EVENT_TYPES[txEventIdx],
        tender_id: TENDER_IDS[txTenderIdx],
        invoker: INVOKERS[txInvokerIdx],
        timestamp_ist: istStr,
      };
    });

    blocks.push({
      block_number: blockNum,
      timestamp_ist: istStr,
      tx_count: txCount,
      hash,
      prev_hash: prevHash,
      data_hash: blockHash(blockNum + 999),
      transactions,
    });
  }

  return { blocks, currentBlockNum };
}

// Special known hashes for the hash verifier feature
const AIIMS_FREEZE_HASH = '0x8f3a7b2c1d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e2b1c';
const AADHAAR_FREEZE_HASH = '0xa5b8c1d4e7f0a3b6c9d2e5f8a1b4c7d0e3f6a9c2b5d8e1f4a7b0c3d6e9f2a5';

export async function GET() {
  const { blocks, currentBlockNum } = generateDynamicBlocks(20);

  return NextResponse.json({
    success: true,
    data: {
      network_status: 'LIVE',
      current_block: currentBlockNum,
      total_transactions: currentBlockNum * 2, // ~2 TX per block average
      consensus: 'Raft',
      block_time_ms: BLOCK_INTERVAL_MS,
      peers: [
        { name: 'MinistryOrg', status: 'online', peers: 2, latency_ms: 12 },
        { name: 'BidderOrg', status: 'online', peers: 2, latency_ms: 8 },
        { name: 'AuditorOrg', status: 'online', peers: 2, latency_ms: 15 },
        { name: 'NICOrg', status: 'online', peers: 2, latency_ms: 11 },
      ],
      blocks,
      known_hashes: {
        [AIIMS_FREEZE_HASH]: {
          block: 1337, type: 'TENDER_FROZEN', tender: 'AIIMS Delhi Equipment',
          detail: 'Auto-frozen by AI — Risk Score 94/100. Shell company + bid rigging + timing collusion detected.',
        },
        [AADHAAR_FREEZE_HASH]: {
          block: currentBlockNum - 5, type: 'TENDER_FROZEN', tender: 'Aadhaar Data Centre Expansion',
          detail: 'Auto-frozen by AI — Risk Score 88/100. Front-running + timing collusion detected across 3 bidders.',
        },
      },
    },
  });
}
