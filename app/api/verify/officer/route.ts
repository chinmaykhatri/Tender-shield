// FILE: app/api/verify/officer/route.ts
// PURPOSE: Server-side verification for Ministry & Senior Officers
// INDIA API: Surepass (Aadhaar), Email domain validation
// MOCK MODE: YES — demo data accepted

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { sendAadhaarOTP, verifyAadhaarOTP } from '@/lib/verification/aadhaar';
import { MINISTRY_DOMAINS } from '@/lib/verification/types';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    // ── STEP 1: Validate government email ─────────
    if (action === 'validate_email') {
      const email = (body.email || '').trim().toLowerCase();
      const domain = email.split('@')[1] || '';
      const isGov = domain.endsWith('.gov.in') || domain.endsWith('.nic.in');
      const ministry = Object.entries(MINISTRY_DOMAINS).find(([d]) => domain.includes(d));

      return NextResponse.json({
        valid: isGov,
        domain,
        ministry_name: ministry?.[1] || (isGov ? 'Government of India' : null),
        error: isGov ? null : 'Only .gov.in or .nic.in email addresses are accepted',
      });
    }

    // ── STEP 2: Send Aadhaar OTP ──────────────────
    if (action === 'send_aadhaar_otp') {
      const result = await sendAadhaarOTP(body.aadhaar_number);
      return NextResponse.json(result.data);
    }

    // ── STEP 3: Verify Aadhaar OTP ────────────────
    if (action === 'verify_aadhaar_otp') {
      const result = await verifyAadhaarOTP(body.aadhaar_number, body.otp, body.txn_id);
      return NextResponse.json(result.data);
    }

    // ── STEP 4: Validate Employee ID ──────────────
    if (action === 'validate_employee') {
      const empId = (body.employee_id || '').trim();
      const isValid = /^[A-Za-z0-9\-]+$/.test(empId) && empId.length >= 5;
      return NextResponse.json({
        valid: isValid,
        employee_id: empId,
        error: isValid ? null : 'Employee ID must be at least 5 characters (letters, numbers, hyphens only)',
      });
    }

    // ── STEP 5: Submit for approval ───────────────
    if (action === 'submit') {
      const { user_id, email, role, aadhaar_data, employee_data, seniority_data } = body;

      // Save to user_verifications
      const verificationRecord = {
        user_id,
        role: role || 'MINISTRY_OFFICER',
        email,
        email_domain: email.split('@')[1],
        email_verified: true,
        email_verified_at: new Date().toISOString(),
        aadhaar_last4: aadhaar_data?.aadhaar_number || '',
        aadhaar_name: aadhaar_data?.name || '',
        aadhaar_verified: !!aadhaar_data,
        aadhaar_verified_at: aadhaar_data ? new Date().toISOString() : null,
        employee_id: employee_data?.employee_id || '',
        ministry_code: employee_data?.ministry || '',
        department: employee_data?.department || employee_data?.designation || '',
        employee_verified: !!employee_data,
        overall_status: 'PENDING',
        admin_approved: false,
      };

      await supabase.from('user_verifications').upsert(verificationRecord);

      // Add to pending registrations
      await supabase.from('pending_registrations').insert({
        user_id,
        role: role || 'MINISTRY_OFFICER',
        email,
        full_name: aadhaar_data?.name || email.split('@')[0],
        status: 'WAITING',
      });

      return NextResponse.json({
        success: true,
        message: 'Verification submitted successfully! A NIC Admin will review within 24-48 hours.',
      });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Verification failed' }, { status: 500 });
  }
}
