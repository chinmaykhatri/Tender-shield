import { logger } from '@/lib/logger';
// FILE: app/api/enforcement/approve-unlock/route.ts
// PURPOSE: Multi-party approval to unlock AI-locked tenders
// Tender unlocks ONLY when ALL required approvers have signed

import { generateTxHash } from '@/lib/enforcement/autoLock';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

interface Approval {
  approver_id: string;
  approver_role: string;
  justification: string;
  approved_at: string;
  blockchain_tx: string;
}

export async function POST(req: Request) {
  try {
    const { tender_id, approver_id, approver_role, justification } =
      await req.json();

    if (!tender_id || !approver_id || !approver_role) {
      return Response.json(
        { success: false, error: 'tender_id, approver_id, and approver_role are required' },
        { status: 400 }
      );
    }

    if (!justification || justification.trim().length < 50) {
      return Response.json(
        {
          success: false,
          error:
            'Justification must be at least 50 characters. This is recorded permanently on blockchain.',
        },
        { status: 400 }
      );
    }

    const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
    const txHash = generateTxHash();

    if (isDemoMode) {
      return Response.json({
        success: true,
        approval_recorded: true,
        all_approvals_complete: false,
        approvals_received: 1,
        approvals_needed: 2,
        message: 'Approval recorded. Waiting for remaining approvers.',
        blockchain_tx: txHash,
        demo: true,
      });
    }

    // Real mode: record approval in Supabase
    const supabase = getSupabaseAdmin();

    const { data: lock } = await supabase
      .from('tender_locks')
      .select('*')
      .eq('tender_id', tender_id)
      .eq('status', 'LOCKED_PENDING_APPROVAL')
      .single();

    if (!lock) {
      return Response.json(
        { success: false, error: 'No pending lock found for this tender' },
        { status: 404 }
      );
    }

    const newApproval: Approval = {
      approver_id,
      approver_role,
      justification: justification.trim(),
      approved_at: new Date().toISOString(),
      blockchain_tx: txHash,
    };

    const updatedApprovals: Approval[] = [
      ...((lock.approvals_received as Approval[]) ?? []),
      newApproval,
    ];

    // Check if all required approvers have signed
    const requiredRoles = lock.required_approvers as string[];
    const allApproved = requiredRoles.every((role: string) =>
      updatedApprovals.some((a: Approval) => a.approver_role === role)
    );

    await supabase
      .from('tender_locks')
      .update({
        approvals_received: updatedApprovals,
        status: allApproved ? 'UNLOCKED_BY_APPROVAL' : 'LOCKED_PENDING_APPROVAL',
        unlocked_at: allApproved ? new Date().toISOString() : null,
      })
      .eq('id', lock.id);

    if (allApproved) {
      await supabase
        .from('tenders')
        .update({
          status: 'BIDDING_OPEN',
          lock_level: null,
          lock_reason: null,
        })
        .eq('tender_id', tender_id);
    }

    // Log to blockchain
    await supabase.from('blockchain_transactions').insert({
      tx_hash: txHash,
      function_name: 'APPROVE_UNLOCK',
      args: JSON.stringify({
        tender_id,
        approver_role,
        all_approved: allApproved,
      }),
      created_at: new Date().toISOString(),
    });

    return Response.json({
      success: true,
      all_approvals_complete: allApproved,
      approvals_received: updatedApprovals.length,
      approvals_needed: requiredRoles.length,
      message: allApproved
        ? 'All approvals received. Tender unlocked.'
        : `Approval recorded. ${requiredRoles.length - updatedApprovals.length} more approval(s) needed.`,
      blockchain_tx: txHash,
    });
  } catch (error) {
    logger.error('[ApproveUnlock] Error:', error);
    return Response.json(
      { success: false, error: 'Approval failed' },
      { status: 500 }
    );
  }
}
