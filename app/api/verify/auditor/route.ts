// FILE: app/api/verify/auditor/route.ts
// PURPOSE: Server-side verification for CAG Auditors
// INDIA API: Surepass (Aadhaar), Access Code system
// MOCK MODE: YES — demo access code accepted

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { sendAadhaarOTP, verifyAadhaarOTP } from '@/lib/verification/aadhaar';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    // ── Validate CAG email ────────────────────────
    if (action === 'validate_email') {
      const email = (body.email || '').trim().toLowerCase();
      const domain = email.split('@')[1] || '';
      const isCag = domain === 'cag.gov.in';
      return NextResponse.json({
        valid: isCag,
        domain,
        error: isCag ? null : 'Only @cag.gov.in email addresses are accepted for CAG Auditors.',
      });
    }

    // ── Aadhaar OTP Send ──────────────────────────
    if (action === 'send_aadhaar_otp') {
      const result = await sendAadhaarOTP(body.aadhaar_number);
      return NextResponse.json(result.data);
    }

    // ── Aadhaar OTP Verify ────────────────────────
    if (action === 'verify_aadhaar_otp') {
      const result = await verifyAadhaarOTP(body.aadhaar_number, body.otp, body.txn_id);
      return NextResponse.json(result.data);
    }

    // ── Validate Employee ID ──────────────────────
    if (action === 'validate_employee') {
      const empId = (body.employee_id || '').trim();
      const isValid = /^CAG-\d{4}-\d{4,6}$/.test(empId) || empId.length >= 5;
      return NextResponse.json({
        valid: isValid,
        employee_id: empId,
        error: isValid ? null : 'CAG Employee ID format: CAG-YYYY-XXXXXX',
      });
    }

    // ── Verify Access Code ────────────────────────
    if (action === 'verify_access_code') {
      const code = (body.access_code || '').trim().toUpperCase();
      const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

      // Demo mode: accept any code matching format TS-AUD-XXXXXX
      if (isDemoMode && /^TS-AUD-[A-Z0-9]{6}$/.test(code)) {
        return NextResponse.json({
          valid: true,
          code,
          message: 'Access code verified (demo mode)',
        });
      }

      // Real mode: check against database
      const { data: codeRecord } = await supabase
        .from('auditor_access_codes')
        .select('*')
        .eq('code', code)
        .single();

      if (!codeRecord) {
        return NextResponse.json({ valid: false, error: 'Access code not found.' });
      }
      if (codeRecord.is_used) {
        return NextResponse.json({ valid: false, error: 'Access code has already been used.' });
      }
      if (new Date(codeRecord.expires_at) < new Date()) {
        return NextResponse.json({ valid: false, error: 'Access code has expired.' });
      }

      // Mark as used
      await supabase.from('auditor_access_codes').update({
        is_used: true,
        used_by: body.user_id,
        used_at: new Date().toISOString(),
      }).eq('id', codeRecord.id);

      return NextResponse.json({ valid: true, code, message: 'Access code verified!' });
    }

    // ── Submit (auditors get immediate access) ────
    if (action === 'submit') {
      const { user_id, email, aadhaar_data, employee_data, access_code } = body;

      await supabase.from('user_verifications').upsert({
        user_id,
        role: 'CAG_AUDITOR',
        email,
        email_domain: 'cag.gov.in',
        email_verified: true,
        email_verified_at: new Date().toISOString(),
        aadhaar_last4: aadhaar_data?.aadhaar_number || '',
        aadhaar_name: aadhaar_data?.name || '',
        aadhaar_verified: !!aadhaar_data,
        aadhaar_verified_at: new Date().toISOString(),
        employee_id: employee_data?.employee_id || '',
        ministry_code: 'CAG',
        department: employee_data?.designation || 'CAG Audit',
        employee_verified: true,
        access_code_used: access_code,
        access_code_verified: true,
        overall_status: 'VERIFIED', // Auditors are approved immediately via access code
        admin_approved: true,
        admin_approved_at: new Date().toISOString(),
      });

      return NextResponse.json({
        success: true,
        immediate_access: true,
        message: '🎉 Account created immediately — access code pre-authorized your registration.',
      });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Verification failed' }, { status: 500 });
  }
}
