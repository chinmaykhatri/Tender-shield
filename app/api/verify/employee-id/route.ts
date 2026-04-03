import { logger } from '@/lib/logger';
// FILE: app/api/verify/employee-id/route.ts
// PURPOSE: Save employee details and mark verification complete
// DEMO MODE: Accepts any employee ID

import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';


export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { employee_id, ministry_code, department, designation, user_id } = body;

    if (!employee_id || !ministry_code || !user_id) {
      return Response.json(
        { success: false, error: 'Employee ID, ministry, and user ID are required' },
        { status: 400 }
      );
    }

    if (employee_id.trim().length < 3) {
      return Response.json(
        { success: false, error: 'Employee ID must be at least 3 characters' },
        { status: 400 }
      );
    }

    // Save to user_verifications
    const { error } = await getSupabaseAdmin().from('user_verifications').upsert({
      user_id,
      employee_id: employee_id.trim(),
      ministry_code,
      department: department?.trim() ?? '',
      designation: designation?.trim() ?? '',
      employee_verified: true,
      overall_status: 'VERIFIED',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

    if (error) {
      logger.error('[TenderShield Employee ID] Supabase error:', error);
      return Response.json(
        { success: false, error: 'Failed to save employee details' },
        { status: 500 }
      );
    }

    // Add to pending_registrations for admin review
    await getSupabaseAdmin().from('pending_registrations').upsert({
      user_id,
      role: 'MINISTRY_OFFICER',
      ministry_code,
      employee_id: employee_id.trim(),
      status: 'WAITING',
      submitted_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

    return Response.json({
      success: true,
      message: 'Employee details saved. Awaiting admin approval.',
      next_step: 'admin_approval',
    });
  } catch (error) {
    logger.error('[TenderShield Employee ID] Error:', error);
    return Response.json(
      { success: false, error: 'Failed to save details.' },
      { status: 500 }
    );
  }
}
