// FILE: app/api/trust/[company_id]/route.ts
// PURPOSE: Get trust score for a company

import { logger } from '@/lib/logger';
import { calculateTrustScore } from '@/lib/trust/calculateTrustScore';

export const dynamic = 'force-dynamic';

interface DemoCompany {
  name: string;
  gstin_age_months: number;
  is_gem_verified: boolean;
  is_msme: boolean;
  tenders_won: number;
  tenders_bid: number;
  fraud_confirmed_count: number;
  is_shell_company: boolean;
  pan_duplicate_count: number;
  fraud_flags_count: number;
}

const DEMO_COMPANIES: Record<string, DemoCompany> = {
  medtech: {
    name: 'MedTech Solutions Pvt Ltd',
    gstin_age_months: 83, is_gem_verified: true, is_msme: false,
    tenders_won: 5, tenders_bid: 12,
    fraud_confirmed_count: 0, is_shell_company: false,
    pan_duplicate_count: 0, fraud_flags_count: 0,
  },
  biomed: {
    name: 'BioMed Corp India Pvt Ltd',
    gstin_age_months: 3, is_gem_verified: false, is_msme: false,
    tenders_won: 1, tenders_bid: 4,
    fraud_confirmed_count: 1, is_shell_company: true,
    pan_duplicate_count: 1, fraud_flags_count: 3,
  },
  pharmaplus: {
    name: 'Pharma Plus Equipment Ltd',
    gstin_age_months: 2, is_gem_verified: false, is_msme: false,
    tenders_won: 0, tenders_bid: 3,
    fraud_confirmed_count: 0, is_shell_company: true,
    pan_duplicate_count: 2, fraud_flags_count: 2,
  },
  healthcare: {
    name: 'HealthCare India Ltd',
    gstin_age_months: 48, is_gem_verified: true, is_msme: true,
    tenders_won: 3, tenders_bid: 8,
    fraud_confirmed_count: 0, is_shell_company: false,
    pan_duplicate_count: 0, fraud_flags_count: 1,
  },
};

export async function GET(
  req: Request,
  { params }: { params: { company_id: string } }
) {
  try {
    const companyId = params.company_id;
    const company = DEMO_COMPANIES[companyId] || DEMO_COMPANIES['medtech'];
    const result = calculateTrustScore(company);

    return Response.json({
      success: true,
      company_id: companyId,
      company_name: company.name,
      trust: result,
    });
  } catch (error) {
    logger.error('[TrustScore] Error:', error);
    return Response.json({ success: false, error: 'Failed to calculate trust score' }, { status: 500 });
  }
}
