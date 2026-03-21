// FILE: app/api/verify/aadhaar/verify-otp/route.ts
// PURPOSE: Verify Aadhaar OTP and save to Supabase
// DEMO MODE: Accepts OTP "123456" always

import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { aadhaar_number, otp, txn_id, user_id } = body;

    if (!otp || !/^\d{6}$/.test(otp)) {
      return Response.json(
        { success: false, error: 'OTP must be exactly 6 digits' },
        { status: 400 }
      );
    }

    if (!user_id) {
      return Response.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
    const hasSurepassKey = !!process.env.SUREPASS_API_TOKEN;

    let verifiedData: Record<string, string> | null = null;

    // DEMO MODE
    if (isDemoMode || !hasSurepassKey) {
      if (otp !== '123456') {
        return Response.json(
          { success: false, error: 'Invalid OTP. In demo mode use: 123456' },
          { status: 400 }
        );
      }

      const demoProfiles: Record<string, Record<string, string>> = {
        '999999999999': { name: 'Rajesh Kumar Sharma', dob: '15/03/1985', gender: 'M', address: 'Ministry of Road Transport, New Delhi' },
        '888888888888': { name: 'MedTech Director', dob: '22/06/1978', gender: 'M', address: 'Plot 45, Sector 18, Gurugram, Haryana' },
        '777777777777': { name: 'Priya Gupta', dob: '08/11/1982', gender: 'F', address: 'CAG Bhawan, New Delhi' },
      };

      const cleaned = (aadhaar_number || '').replace(/\D/g, '');
      verifiedData = demoProfiles[cleaned] ?? { name: 'Verified User', dob: '01/01/1990', gender: 'M', address: 'India' };
    } else {
      // REAL MODE — call Surepass
      const response = await fetch(
        'https://kyc-api.surepass.io/api/v1/aadhaar-v2/submit-otp',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.SUREPASS_API_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ client_id: txn_id, otp }),
        }
      );

      const result = await response.json();
      if (!result.success) {
        return Response.json(
          { success: false, error: result.message ?? 'Invalid OTP' },
          { status: 400 }
        );
      }
      verifiedData = result.data;
    }

    // SAVE TO SUPABASE
    const cleaned = (aadhaar_number || '').replace(/\D/g, '');
    const { error: updateError } = await supabaseAdmin
      .from('user_verifications')
      .upsert(
        {
          user_id,
          aadhaar_last4: cleaned.slice(-4),
          aadhaar_name: verifiedData?.name,
          aadhaar_dob: verifiedData?.dob,
          aadhaar_verified: true,
          aadhaar_verified_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );

    if (updateError) {
      console.error('[TenderShield Aadhaar] Supabase save error:', updateError);
    }

    return Response.json({
      success: true,
      data: {
        name: verifiedData?.name,
        dob: verifiedData?.dob,
        gender: verifiedData?.gender,
        address: verifiedData?.address,
        aadhaar_last4: cleaned.slice(-4),
      },
      message: 'Aadhaar verified successfully',
    });
  } catch (error) {
    console.error('[TenderShield Aadhaar] Verify OTP error:', error);
    return Response.json(
      { success: false, error: 'Verification failed. Please try again.' },
      { status: 500 }
    );
  }
}
