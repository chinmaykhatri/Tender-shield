// FILE: app/api/verify/bidder/route.ts
// PURPOSE: Server-side verification for Bidder / Company registration
// INDIA API: API Setu (GSTIN + PAN), Surepass (Aadhaar)
// MOCK MODE: YES — demo data accepted

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { sendAadhaarOTP, verifyAadhaarOTP } from '@/lib/verification/aadhaar';
import { verifyGSTIN } from '@/lib/verification/gstin';
import { verifyPAN, detectSharedPAN } from '@/lib/verification/pan';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    // ── GSTIN Verification ────────────────────────
    if (action === 'verify_gstin') {
      const result = await verifyGSTIN(body.gstin);
      return NextResponse.json(result.data);
    }

    // ── PAN Verification + Duplicate Detection ────
    if (action === 'verify_pan') {
      const result = await verifyPAN(body.pan);
      const panData = result.data;

      // Check for shared PAN (collusion detection)
      let sharedResult: { shared: boolean; sharedWith: string[] } = { shared: false, sharedWith: [] };
      if (body.user_id) {
        const detected = await detectSharedPAN(body.pan, body.user_id);
        sharedResult = { shared: detected.shared, sharedWith: detected.sharedWith ?? [] };
      }

      return NextResponse.json({
        ...panData,
        shared_pan_detected: sharedResult.shared,
        shared_with_companies: sharedResult.sharedWith,
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

    // ── GeM Seller ID Verification ────────────────
    if (action === 'verify_gem') {
      const gemId = (body.gem_seller_id || '').trim();
      // In demo mode, any GeM ID starting with "GeM-" is accepted
      const isValid = /^GeM-\d+-\d{4}-\d+$/.test(gemId);
      return NextResponse.json({
        valid: isValid,
        gem_seller_id: gemId,
        seller_name: isValid ? 'GeM Registered Vendor' : null,
        is_active: isValid,
      });
    }

    // ── Udyam/MSME Verification ───────────────────
    if (action === 'verify_udyam') {
      const udyam = (body.udyam_number || '').trim().toUpperCase();
      const isValid = /^UDYAM-[A-Z]{2}-\d{2}-\d{7}$/.test(udyam);
      return NextResponse.json({
        valid: isValid,
        udyam_number: udyam,
        enterprise_name: isValid ? 'MSME Enterprise' : null,
        category: 'SMALL',
        is_msme: isValid,
      });
    }

    // ── Submit for approval ───────────────────────
    if (action === 'submit') {
      const { user_id, email, gstin_data, pan_data, aadhaar_data, gem_data, udyam_data, trust_score } = body;

      const verificationRecord = {
        user_id,
        role: 'BIDDER',
        email,
        email_domain: email?.split('@')[1],
        email_verified: true,
        email_verified_at: new Date().toISOString(),
        gstin: gstin_data?.gstin || '',
        gstin_legal_name: gstin_data?.legal_name || '',
        gstin_reg_date: gstin_data?.registration_date || '',
        gstin_age_months: gstin_data?.age_months || 0,
        gstin_verified: !!gstin_data,
        pan: pan_data?.pan || '',
        pan_name: pan_data?.name || '',
        pan_verified: !!pan_data,
        aadhaar_last4: aadhaar_data?.aadhaar_number || '',
        aadhaar_name: aadhaar_data?.name || '',
        aadhaar_verified: !!aadhaar_data,
        aadhaar_verified_at: aadhaar_data ? new Date().toISOString() : null,
        gem_seller_id: gem_data?.gem_seller_id || null,
        gem_verified: !!gem_data?.valid,
        udyam_number: udyam_data?.udyam_number || null,
        udyam_category: udyam_data?.category || null,
        udyam_verified: !!udyam_data?.valid,
        is_msme: !!udyam_data?.is_msme,
        overall_status: gstin_data?.is_shell_company_risk ? 'FLAGGED' : 'PENDING',
        admin_approved: false,
      };

      await supabase.from('user_verifications').upsert(verificationRecord);

      await supabase.from('pending_registrations').insert({
        user_id,
        role: 'BIDDER',
        email: email || '',
        full_name: gstin_data?.legal_name || pan_data?.name || 'Company',
        status: 'WAITING',
      });

      return NextResponse.json({
        success: true,
        trust_score: trust_score || 0,
        flagged: gstin_data?.is_shell_company_risk || false,
        message: gstin_data?.is_shell_company_risk
          ? 'Submitted with shell company flag — enhanced review required.'
          : 'Verification submitted! A NIC Admin will review within 24-48 hours.',
      });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Verification failed' }, { status: 500 });
  }
}
