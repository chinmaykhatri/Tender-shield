// FILE: app/api/enforcement/auto-lock/route.ts
// PURPOSE: Auto-lock tender when AI risk score exceeds thresholds
// CALLED: After every AI analysis completes

import { logger } from '@/lib/logger';
import { determineLockLevel, generateTxHash } from '@/lib/enforcement/autoLock';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { requirePermission } from '@/lib/rbac';
import { NextRequest } from 'next/server';
import { extractVerifiedRole, extractInternalSystemRole } from '@/lib/auth/extractRole';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  // ── RBAC: Only AI system (via internal secret) or Auditors/Admins can lock tenders ──
  // SECURITY: Internal system calls use a shared secret (not a client header)
  // Human callers are verified via HMAC-signed session cookie
  const internalRole = extractInternalSystemRole(req);
  let effectiveRole: string | undefined = internalRole;

  if (!effectiveRole) {
    // Not an internal call — verify human session
    effectiveRole = await extractVerifiedRole(req);
    const denied = requirePermission(effectiveRole, 'freeze_tender');
    if (denied) return denied;
  }

  try {
    const { tender_id, risk_score, risk_level, flags } = await req.json();

    if (!tender_id || risk_score === undefined) {
      return Response.json(
        { success: false, error: 'tender_id and risk_score are required' },
        { status: 400 }
      );
    }

    const decision = determineLockLevel(risk_score);

    if (!decision.should_lock) {
      return Response.json({ locked: false, decision });
    }

    const txHash = generateTxHash();
    const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

    const lockRecord = {
      tender_id,
      lock_level: decision.lock_level,
      lock_reason: decision.reason,
      risk_score,
      risk_level: risk_level || 'HIGH',
      required_approvers: decision.required_approvers,
      justification_required: decision.justification_required,
      approvals_received: [] as unknown[],
      locked_at: new Date().toISOString(),
      locked_by: 'AI_SYSTEM',
      blockchain_tx: txHash,
      status: 'LOCKED_PENDING_APPROVAL',
    };

    if (!isDemoMode) {
      const supabase = getSupabaseAdmin();

      // Lock the tender
      await supabase
        .from('tenders')
        .update({
          status:
            decision.lock_level === 'FROZEN'
              ? 'FROZEN_BY_AI'
              : 'LOCKED_BY_AI',
          lock_level: decision.lock_level,
          lock_reason: decision.reason,
          locked_at: new Date().toISOString(),
        })
        .eq('tender_id', tender_id);

      // Create lock record
      await supabase.from('tender_locks').insert(lockRecord);

      // Log to blockchain table
      await supabase.from('blockchain_transactions').insert({
        tx_hash: txHash,
        function_name: 'AUTO_LOCK_TENDER',
        args: JSON.stringify({
          tender_id,
          lock_level: decision.lock_level,
          risk_score,
        }),
        created_at: new Date().toISOString(),
      });
    }

    return Response.json({
      locked: true,
      decision,
      lock_record: lockRecord,
      blockchain_tx: txHash,
      message: `Tender locked at ${decision.lock_level} level. Requires approval from: ${decision.required_approvers.join(', ')}`,
    });
  } catch (error) {
    logger.error('[AutoLock] Error:', error);
    return Response.json(
      { success: false, error: 'Auto-lock failed' },
      { status: 500 }
    );
  }
}

