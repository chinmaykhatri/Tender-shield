import { logger } from '@/lib/logger';
// FILE: app/api/verify/gstin/route.ts
// PURPOSE: GSTIN verification with shell company detection
// DEMO MODE: Uses demo GSTIN database

import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';


export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { gstin, user_id } = body;

    if (!gstin) {
      return Response.json({ success: false, error: 'GSTIN is required' }, { status: 400 });
    }

    const cleaned = gstin.trim().toUpperCase();
    const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

    if (!gstinRegex.test(cleaned)) {
      return Response.json({
        success: false,
        error: 'Invalid GSTIN format. Expected: 22AAAAA0000A1Z5 (15 characters)',
      }, { status: 400 });
    }

    const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
    const hasApiKey = !!process.env.API_SETU_KEY;

    let companyData: Record<string, unknown>;

    if (isDemoMode || !hasApiKey) {
      const demoGSTINs: Record<string, Record<string, unknown>> = {
        '07AABCM1234A1ZK': {
          legal_name: 'MEDTECH SOLUTIONS PRIVATE LIMITED', trade_name: 'MedTech Solutions',
          registration_date: '2018-04-12', status: 'ACTIVE', business_type: 'Private Limited Company',
          state: 'Delhi', age_months: 83, is_shell_company_risk: false,
        },
        '07AABCB5678B1ZP': {
          legal_name: 'BIOMED CORP INDIA PRIVATE LIMITED', trade_name: 'BioMed Corp India',
          registration_date: '2025-01-15', status: 'ACTIVE', business_type: 'Private Limited Company',
          state: 'Delhi', age_months: 3, is_shell_company_risk: true,
        },
        '07AABCP9012C1ZM': {
          legal_name: 'PHARMA PLUS EQUIPMENT LIMITED', trade_name: 'Pharma Plus Equipment',
          registration_date: '2025-02-20', status: 'ACTIVE', business_type: 'Private Limited Company',
          state: 'Delhi', age_months: 2, is_shell_company_risk: true,
        },
      };

      companyData = demoGSTINs[cleaned] ?? {
        legal_name: 'DEMO COMPANY PRIVATE LIMITED', trade_name: 'Demo Company',
        registration_date: '2020-01-01', status: 'ACTIVE', business_type: 'Private Limited Company',
        state: 'Delhi', age_months: 60, is_shell_company_risk: false,
      };
    } else {
      const response = await fetch(
        `https://api.apisetu.gov.in/gstn/v3/taxpayerDetails/${cleaned}`,
        {
          headers: {
            'X-APISETU-APIKEY': process.env.API_SETU_KEY!,
            'X-APISETU-CLIENTID': process.env.API_SETU_CLIENT_ID || '',
          },
        }
      );
      if (!response.ok) throw new Error(`API error: ${response.status}`);
      const result = await response.json();
      const d = result.taxpayerInfo;
      const [dd, mm, yyyy] = (d.rgdt ?? '01/01/2020').split('/');
      const regDate = new Date(`${yyyy}-${mm}-${dd}`);
      const ageMonths = Math.floor((Date.now() - regDate.getTime()) / (1000 * 60 * 60 * 24 * 30));

      companyData = {
        legal_name: d.lgnm, trade_name: d.tradeName ?? d.lgnm,
        registration_date: `${yyyy}-${mm}-${dd}`, status: d.sts,
        business_type: d.ctb, state: d.stj, age_months: ageMonths,
        is_shell_company_risk: ageMonths < 6,
      };
    }

    // SAVE TO SUPABASE
    if (user_id) {
      await getSupabaseAdmin().from('user_verifications').upsert({
        user_id, gstin: cleaned,
        gstin_legal_name: companyData.legal_name as string,
        gstin_trade_name: companyData.trade_name as string,
        gstin_reg_date: companyData.registration_date as string,
        gstin_age_months: companyData.age_months as number,
        gstin_verified: true,
        is_shell_company_risk: companyData.is_shell_company_risk as boolean,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
    }

    return Response.json({
      success: true,
      data: companyData,
      message: (companyData.is_shell_company_risk as boolean)
        ? 'Company verified but shell company risk detected'
        : 'GSTIN verified successfully',
    });
  } catch (error) {
    logger.error('[TenderShield GSTIN] Error:', error);
    return Response.json({ success: false, error: 'GSTIN verification failed.' }, { status: 500 });
  }
}
