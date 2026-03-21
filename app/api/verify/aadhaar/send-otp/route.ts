// FILE: app/api/verify/aadhaar/send-otp/route.ts
// PURPOSE: Send Aadhaar OTP for identity verification
// DEMO MODE: Returns success immediately, no real API call

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { aadhaar_number } = body;

    if (!aadhaar_number) {
      return Response.json(
        { success: false, error: 'Aadhaar number is required' },
        { status: 400 }
      );
    }

    const cleaned = aadhaar_number.replace(/\s|-/g, '');

    if (!/^\d{12}$/.test(cleaned)) {
      return Response.json(
        { success: false, error: 'Aadhaar number must be exactly 12 digits' },
        { status: 400 }
      );
    }

    const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
    const hasSurepassKey = !!process.env.SUREPASS_API_TOKEN;

    // DEMO MODE — return fake success
    if (isDemoMode || !hasSurepassKey) {
      console.log('[TenderShield Aadhaar] Demo mode — OTP simulated');
      return Response.json({
        success: true,
        txn_id: `DEMO-${Date.now()}`,
        message: 'OTP sent to Aadhaar-linked mobile',
        demo: true,
        hint: 'Use OTP: 123456',
      });
    }

    // REAL MODE — call Surepass API
    const response = await fetch(
      'https://kyc-api.surepass.io/api/v1/aadhaar-v2/generate-otp',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.SUREPASS_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id_number: cleaned }),
      }
    );

    const data = await response.json();

    if (!data.success) {
      return Response.json(
        { success: false, error: data.message ?? 'OTP sending failed' },
        { status: 400 }
      );
    }

    return Response.json({
      success: true,
      txn_id: data.data.client_id,
      message: 'OTP sent to Aadhaar-linked mobile',
    });
  } catch (error) {
    console.error('[TenderShield Aadhaar] Send OTP error:', error);
    return Response.json(
      { success: false, error: 'Service temporarily unavailable' },
      { status: 500 }
    );
  }
}
