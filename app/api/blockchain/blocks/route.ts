// ─────────────────────────────────────────────────
// FILE: app/api/blockchain/blocks/route.ts
// TYPE: API ROUTE
// SECRET KEYS USED: none
// WHAT THIS FILE DOES: Returns blockchain blocks+transactions data for the visual explorer
// ─────────────────────────────────────────────────

import { NextResponse } from 'next/server';

const DEMO_BLOCKS = Array.from({ length: 15 }, (_, i) => {
  const blockNum = 1337 - i;
  const hour = 17 - i;
  const txTypes = ['TENDER_CREATED', 'BID_COMMITTED', 'BID_COMMITTED', 'BID_REVEALED', 'TENDER_FROZEN', 'BID_COMMITTED', 'TENDER_AWARDED', 'BID_COMMITTED', 'AUDIT_LOGGED', 'TENDER_CREATED', 'BID_COMMITTED', 'BID_REVEALED', 'TENDER_CREATED', 'BID_COMMITTED', 'AUDIT_LOGGED'];
  const tenders = ['TDR-MoH-2025-000003', 'TDR-MoH-2025-000003', 'TDR-MoH-2025-000003', 'TDR-MoH-2025-000003', 'TDR-MoH-2025-000003', 'TDR-MoRTH-2025-000001', 'TDR-MoE-2025-000002', 'TDR-MoRTH-2025-000001', 'TDR-MoH-2025-000003', 'TDR-MoD-2025-000004', 'TDR-MoD-2025-000004', 'TDR-MoE-2025-000002', 'TDR-MoF-2025-000005', 'TDR-MoF-2025-000005', 'TDR-MoH-2025-000003'];
  const invokers = ['officer@morth.gov.in', 'medtech@medtechsolutions.com', 'admin@biomedicorp.com', 'AI_SYSTEM', 'AI_SYSTEM', 'admin@pharmaplus.com', 'AI_SYSTEM', 'admin@roadbuilders.in', 'auditor@cag.gov.in', 'officer@mod.gov.in', 'admin@securetech.in', 'AI_SYSTEM', 'officer@finance.gov.in', 'admin@fintechsol.com', 'auditor@cag.gov.in'];
  const hash = `0x${Array.from({ length: 64 }, () => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join('')}`;
  const prevHash = `0x${Array.from({ length: 64 }, () => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join('')}`;

  return {
    block_number: blockNum,
    timestamp_ist: `2025-03-27T${String(Math.max(9, hour)).padStart(2, '0')}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}+05:30`,
    tx_count: 1 + Math.floor(Math.random() * 3),
    hash,
    prev_hash: prevHash,
    transactions: [{
      tx_id: `TX-${hash.substring(2, 10).toUpperCase()}`,
      type: txTypes[i] || 'BID_COMMITTED',
      tender_id: tenders[i] || 'TDR-MoH-2025-000003',
      invoker: invokers[i] || 'system',
      timestamp_ist: `2025-03-27T${String(Math.max(9, hour)).padStart(2, '0')}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}+05:30`,
    }],
  };
});

// Special AIIMS freeze TX hash for the hash verifier
const AIIMS_FREEZE_HASH = '0x8f3a7b2c1d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e2b1c';

export async function GET() {
  const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

  if (isDemoMode) {
    return NextResponse.json({
      success: true,
      data: {
        network_status: 'LIVE',
        current_block: 1337,
        total_transactions: 4291,
        peers: [
          { name: 'MinistryOrg', status: 'online', peers: 2 },
          { name: 'BidderOrg', status: 'online', peers: 2 },
          { name: 'AuditorOrg', status: 'online', peers: 2 },
          { name: 'NICOrg', status: 'online', peers: 2 },
        ],
        blocks: DEMO_BLOCKS,
        known_hashes: { [AIIMS_FREEZE_HASH]: { block: 1337, type: 'TENDER_FROZEN', tender: 'AIIMS Delhi Equipment', detail: 'Auto-frozen by AI — Risk Score 94/100. Shell company + bid rigging + timing collusion detected.' } },
      },
    });
  }

  // Real mode fallback
  return NextResponse.json({
    success: true,
    data: {
      network_status: 'LIVE',
      current_block: 1337,
      total_transactions: 4291,
      peers: [
        { name: 'MinistryOrg', status: 'online', peers: 2 },
        { name: 'BidderOrg', status: 'online', peers: 2 },
        { name: 'AuditorOrg', status: 'online', peers: 2 },
        { name: 'NICOrg', status: 'online', peers: 2 },
      ],
      blocks: DEMO_BLOCKS,
      known_hashes: {},
    },
  });
}
