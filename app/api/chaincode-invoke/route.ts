import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';
import { z } from 'zod';

// ── Input Validation ─────────────────────────────────────────────
const chaincodeInvokeSchema = z.object({
  function_name: z.string().min(1, 'function_name required').max(64),
  args: z.array(z.string().max(4096)).max(10).default([]),
  user_id: z.string().max(128).default('anonymous'),
  channel: z.string().max(64).optional(),
});

// ============================================================================
// TenderShield — Chaincode Invoke API
// ============================================================================
// Wires frontend tender/bid actions to the backend Fabric service.
//
// Flow:
//   Frontend action → POST /api/chaincode-invoke
//     → Try: backend FastAPI → fabric_service.py → real Fabric peer
//     → Fallback: generate real SHA-256 TX hash locally
//     → Always: store result in Supabase for fast reads
//
// Supported invocations:
//   CreateTender, PublishTender, SubmitBid, RevealBid,
//   FreezeTender, AwardTender, EscalateToCAG, VerifyCommitment
// ============================================================================

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || process.env.AI_ENGINE_URL || '';
const FABRIC_CHANNEL = 'tenderchannel';
const FABRIC_CHAINCODE = 'tendershield';

/**
 * Generate a real SHA-256 transaction hash.
 * Even in fallback mode, these are genuine cryptographic hashes.
 */
function generateTxHash(functionName: string, args: any[], userId: string): string {
  const data = JSON.stringify({
    fn: functionName,
    args,
    user: userId,
    ts: Date.now(),
    channel: FABRIC_CHANNEL,
    chaincode: FABRIC_CHAINCODE,
  });
  return createHash('sha256').update(data).digest('hex');
}

/**
 * Store the blockchain transaction record in Supabase for fast reads.
 */
async function storeTransactionInSupabase(
  txHash: string,
  blockNumber: number,
  functionName: string,
  args: any[],
  mode: string,
  userId: string
) {
  try {
    await supabase.from('blockchain_transactions').insert({
      tx_hash: txHash,
      block_number: blockNumber,
      function_name: functionName,
      args: JSON.stringify(args),
      channel: FABRIC_CHANNEL,
      chaincode: FABRIC_CHAINCODE,
      blockchain_mode: mode,
      created_by: userId,
      timestamp_ist: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
    });
  } catch {
    console.warn('[chaincode-invoke] Supabase write skipped (table may not exist)');
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // ── Input Validation (Zod) ─────────────────────────────────
    const parsed = chaincodeInvokeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', issues: parsed.error.issues.map(i => i.message) },
        { status: 400 }
      );
    }
    const { function_name, args, user_id } = parsed.data;

    // Validate function name against known chaincode functions
    const validFunctions = [
      'CreateTender', 'PublishTender', 'SubmitBid', 'RevealBid',
      'FreezeTender', 'AwardTender', 'EscalateToCAG', 'VerifyCommitment',
      'EvaluateBids', 'GetTenderHistory', 'QueryTenderByID',
      'InitLedger', 'GetDashboardStats',
    ];

    if (!validFunctions.includes(function_name)) {
      return NextResponse.json(
        { error: `Unknown chaincode function: ${function_name}`, valid_functions: validFunctions },
        { status: 400 }
      );
    }

    // ─── Strategy 1: Try real backend → Fabric peer ───
    if (BACKEND_URL) {
      try {
        const backendResponse = await fetch(`${BACKEND_URL}/api/v1/chaincode/invoke`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Request-Source': 'tendershield-frontend',
          },
          body: JSON.stringify({
            function_name,
            args,
            user_id,
            channel: FABRIC_CHANNEL,
            chaincode: FABRIC_CHAINCODE,
          }),
          signal: AbortSignal.timeout(10000), // 10s timeout
        });

        if (backendResponse.ok) {
          const data = await backendResponse.json();
          const txHash = data.tx_hash || data.transaction_id || generateTxHash(function_name, args, user_id);
          const blockNum = data.block_number || 0;
          const mode = data.blockchain_mode || data.mode || 'FABRIC_LIVE';

          // Write-through to Supabase
          await storeTransactionInSupabase(txHash, blockNum, function_name, args, mode, user_id);

          return NextResponse.json({
            success: true,
            tx_hash: txHash,
            block_number: blockNum,
            blockchain_mode: mode,
            channel: FABRIC_CHANNEL,
            chaincode: FABRIC_CHAINCODE,
            function_name,
            can_verify: true,
            verify_url: `/api/blockchain?tx=${txHash}`,
          });
        }
      } catch (e) {
        console.warn(`[chaincode-invoke] Backend unavailable: ${e}. Using local SHA-256 fallback.`);
      }
    }

    // ─── Strategy 2: Local SHA-256 fallback ───
    // Without a Fabric peer, we generate a real SHA-256 hash of the
    // invocation payload. This is cryptographically honest but NOT
    // a distributed ledger write — it's a local audit record.
    const txHash = generateTxHash(function_name, args, user_id);
    const mode = 'LOCAL_SHA256_FALLBACK';

    // Get real chain height from audit_events count
    let blockNumber = 0;
    try {
      const { count } = await supabase
        .from('audit_events')
        .select('*', { count: 'exact', head: true });
      blockNumber = (count || 0) + 1;
    } catch {
      blockNumber = 0;
    }

    // Write-through to Supabase
    await storeTransactionInSupabase(txHash, blockNumber, function_name, args, mode, user_id);

    return NextResponse.json({
      success: true,
      tx_hash: txHash,
      block_number: blockNumber,
      blockchain_mode: mode,
      channel: FABRIC_CHANNEL,
      chaincode: FABRIC_CHAINCODE,
      function_name,
      can_verify: false,
      verify_url: `/api/blockchain/verify`,
      _note: 'Fabric peer not connected. TX hash is a real SHA-256 of the invocation payload, stored in Supabase audit trail. This is NOT a distributed ledger write — it is a local cryptographic record.',
    });
  } catch (err) {
    console.error('[chaincode-invoke] Error:', err);
    return NextResponse.json(
      { error: 'Internal server error', details: String(err) },
      { status: 500 }
    );
  }
}
