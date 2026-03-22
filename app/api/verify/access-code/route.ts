// FILE: app/api/verify/access-code/route.ts
// PURPOSE: Verify CAG auditor access code — auto-approves auditors
// DEMO MODE: Accepts code "TS-AUD-DEMO01"

import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';


export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { code, user_id } = body;

    if (!code || !user_id) {
      return Response.json(
        { success: false, error: 'Access code and user ID are required' },
        { status: 400 }
      );
    }

    const cleaned = code.trim().toUpperCase();
    const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

    // DEMO MODE — accept demo code
    if (isDemoMode && cleaned === 'TS-AUD-DEMO01') {
      await getSupabaseAdmin().from('user_verifications').upsert({
        user_id,
        access_code_verified: true,
        overall_status: 'VERIFIED',
        admin_approved: true,
        admin_approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

      return Response.json({
        success: true,
        message: 'Access code verified. Your CAG Auditor account is now active.',
        redirect: '/dashboard',
      });
    }

    // REAL MODE — check auditor_access_codes table
    const { data: accessCode, error: fetchError } = await getSupabaseAdmin()
      .from('auditor_access_codes')
      .select('*')
      .eq('code', cleaned)
      .single();

    if (fetchError || !accessCode) {
      return Response.json(
        { success: false, error: 'Invalid access code. Contact your NIC administrator.' },
        { status: 400 }
      );
    }

    if (accessCode.is_used) {
      return Response.json(
        { success: false, error: 'This access code has already been used.' },
        { status: 400 }
      );
    }

    if (new Date(accessCode.expires_at) < new Date()) {
      return Response.json(
        { success: false, error: 'This access code has expired. Request a new one.' },
        { status: 400 }
      );
    }

    // Mark code as used
    await getSupabaseAdmin().from('auditor_access_codes')
      .update({ is_used: true, used_by: user_id, used_at: new Date().toISOString() })
      .eq('id', accessCode.id);

    // Auto-approve auditor
    await getSupabaseAdmin().from('user_verifications').upsert({
      user_id,
      access_code_verified: true,
      overall_status: 'VERIFIED',
      admin_approved: true,
      admin_approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

    return Response.json({
      success: true,
      message: 'Access code verified. Your CAG Auditor account is now active.',
      redirect: '/dashboard',
    });
  } catch (error) {
    console.error('[TenderShield Access Code] Error:', error);
    return Response.json(
      { success: false, error: 'Verification failed.' },
      { status: 500 }
    );
  }
}
