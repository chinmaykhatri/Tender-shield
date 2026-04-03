import { logger } from '@/lib/logger';
// FILE: app/api/verify/pan/route.ts
// PURPOSE: PAN verification with duplicate detection
// DEMO MODE: Uses demo PAN database

import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';


export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { pan, user_id } = body;

    if (!pan) {
      return Response.json({ success: false, error: 'PAN is required' }, { status: 400 });
    }

    const cleaned = pan.trim().toUpperCase();
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

    if (!panRegex.test(cleaned)) {
      return Response.json({
        success: false,
        error: 'Invalid PAN format. Expected: ABCDE1234F (10 characters)',
      }, { status: 400 });
    }

    // Check for duplicate PAN
    let isDuplicate = false;
    let duplicateCompany: string | null = null;

    if (user_id) {
      const { data: existingPAN } = await getSupabaseAdmin()
        .from('user_verifications')
        .select('user_id, gstin_legal_name')
        .eq('pan', cleaned)
        .neq('user_id', user_id)
        .limit(1);

      isDuplicate = !!(existingPAN && existingPAN.length > 0);
      duplicateCompany = isDuplicate ? existingPAN![0].gstin_legal_name : null;
    }

    const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
    const hasApiKey = !!process.env.API_SETU_KEY;

    let panData: Record<string, unknown>;

    if (isDemoMode || !hasApiKey) {
      const demoPANs: Record<string, Record<string, unknown>> = {
        'MEDTK1234M': { name: 'MEDTECH SOLUTIONS PRIVATE LIMITED', pan_type: 'COMPANY', is_valid: true },
        'ABCDE1234F': { name: 'FRAUD DIRECTOR', pan_type: 'INDIVIDUAL', is_valid: true },
      };
      panData = demoPANs[cleaned] ?? { name: 'DEMO ENTITY', pan_type: 'INDIVIDUAL', is_valid: true };
    } else {
      const response = await fetch('https://api.apisetu.gov.in/cams/v3/pan', {
        method: 'POST',
        headers: {
          'X-APISETU-APIKEY': process.env.API_SETU_KEY!,
          'X-APISETU-CLIENTID': process.env.API_SETU_CLIENT_ID || '',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pan: cleaned }),
      });
      if (!response.ok) throw new Error(`API error: ${response.status}`);
      const result = await response.json();
      panData = { name: result.name, pan_type: result.panType ?? 'INDIVIDUAL', is_valid: result.valid };
    }

    // SAVE TO SUPABASE
    if (user_id) {
      await getSupabaseAdmin().from('user_verifications').upsert({
        user_id, pan: cleaned,
        pan_name: panData.name as string,
        pan_verified: true,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
    }

    return Response.json({
      success: true,
      data: {
        ...panData,
        is_duplicate: isDuplicate,
        duplicate_company: duplicateCompany,
      },
      message: isDuplicate
        ? `PAN already linked to ${duplicateCompany}. Both accounts flagged for review.`
        : 'PAN verified successfully',
    });
  } catch (error) {
    logger.error('[TenderShield PAN] Error:', error);
    return Response.json({ success: false, error: 'PAN verification failed.' }, { status: 500 });
  }
}
