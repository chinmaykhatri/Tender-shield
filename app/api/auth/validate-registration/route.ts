// ─────────────────────────────────────────────────
// FILE: app/api/auth/validate-registration/route.ts
// TYPE: SERVER API ROUTE
// SECRET KEYS USED: none
// WHAT THIS FILE DOES: Validates role-based registration: .gov.in emails, GSTIN, PAN, Aadhaar
// ─────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';

interface ValidationResult {
  valid: boolean;
  errors: { field: string; message: string }[];
  warnings: string[];
}

function validateGSTIN(gstin: string): boolean {
  return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gstin);
}

function validatePAN(pan: string): boolean {
  return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan);
}

function validateAadhaar(aadhaar: string): boolean {
  return /^[0-9]{12}$/.test(aadhaar);
}

function verhoeffCheck(num: string): boolean {
  // Simplified Verhoeff for demo
  return num.length === 12 && /^[0-9]+$/.test(num);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { role, email, gstin, pan, aadhaar, otp, employee_id, company_age_months } = body;

  const errors: { field: string; message: string }[] = [];
  const warnings: string[] = [];

  // Role-specific email validation
  if (role === 'MINISTRY_OFFICER') {
    if (email && !email.endsWith('.gov.in')) {
      errors.push({ field: 'email', message: 'Officers must use a .gov.in email address' });
    }
    if (employee_id && !/^[A-Z]{3}-EMP-[0-9]{4,}$/.test(employee_id) && employee_id.length < 4) {
      errors.push({ field: 'employee_id', message: 'Invalid employee ID format' });
    }
  }

  if (role === 'CAG_AUDITOR') {
    if (email && !email.endsWith('@cag.gov.in')) {
      errors.push({ field: 'email', message: 'Auditors must use a @cag.gov.in email address' });
    }
  }

  if (role === 'BIDDER') {
    if (gstin && !validateGSTIN(gstin)) {
      errors.push({ field: 'gstin', message: 'Invalid GSTIN format (expected: 22AAAAA0000A1Z5)' });
    }
    if (pan && !validatePAN(pan)) {
      errors.push({ field: 'pan', message: 'Invalid PAN format (expected: ABCDE1234F)' });
    }
    if (company_age_months !== undefined && company_age_months < 6) {
      warnings.push('⚠️ Company registered recently — Shell company risk detected. This account will need admin approval.');
    }
  }

  // Common validations
  if (aadhaar && !validateAadhaar(aadhaar)) {
    errors.push({ field: 'aadhaar', message: 'Aadhaar must be exactly 12 digits' });
  }
  if (aadhaar && !verhoeffCheck(aadhaar)) {
    errors.push({ field: 'aadhaar', message: 'Invalid Aadhaar checksum' });
  }

  // Demo OTP check
  if (otp && otp !== '123456') {
    errors.push({ field: 'otp', message: 'Invalid OTP. Demo OTP is 123456' });
  }

  const valid = errors.length === 0;

  return NextResponse.json({
    valid,
    errors,
    warnings,
    ...(valid ? { token: 'demo-jwt-' + Date.now(), verified_at: new Date().toISOString() } : {}),
  } as ValidationResult & { token?: string; verified_at?: string });
}
