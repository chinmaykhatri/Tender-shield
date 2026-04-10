// FILE: app/api/trust/[company_id]/route.ts
// PURPOSE: Get trust score for a company — queries Supabase bids table first, falls back to seed profiles

import { logger } from '@/lib/logger';
import { calculateTrustScore } from '@/lib/trust/calculateTrustScore';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

interface CompanyData {
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

// Seed profiles — used ONLY when company not found in Supabase
const SEED_COMPANIES: Record<string, CompanyData> = {
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
    let company: CompanyData | null = null;
    let source = 'SEED_PROFILE';

    // Try Supabase first
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (url && key) {
      try {
        const supabase = createClient(url, key);

        // Search bids table for bidder activity
        const { data: bids } = await supabase
          .from('bids')
          .select('bid_id, tender_id, status, created_at')
          .or(`bidder_did.ilike.%${companyId}%,bid_id.ilike.%${companyId}%`);

        if (bids && bids.length > 0) {
          const totalBids = bids.length;
          const flaggedBids = bids.filter((b: any) => b.status === 'FLAGGED' || b.status === 'REJECTED').length;
          const verifiedBids = bids.filter((b: any) => b.status === 'VERIFIED' || b.status === 'REVEALED').length;

          company = {
            name: companyId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
            gstin_age_months: 24,
            is_gem_verified: false,
            is_msme: false,
            tenders_won: verifiedBids,
            tenders_bid: totalBids,
            fraud_confirmed_count: flaggedBids,
            is_shell_company: false,
            pan_duplicate_count: 0,
            fraud_flags_count: flaggedBids,
          };
          source = 'SUPABASE_BIDS';
        }
      } catch (err) {
        logger.error('[TrustScore] Supabase query failed, using seed:', err);
      }
    }

    // Fall back to seed profiles
    if (!company) {
      company = SEED_COMPANIES[companyId] || SEED_COMPANIES['medtech'];
    }

    const result = calculateTrustScore(company);

    return Response.json({
      success: true,
      company_id: companyId,
      company_name: company.name,
      trust: result,
      _data_source: source,
      _note: source === 'SEED_PROFILE'
        ? 'Trust score computed from seed profile. Register bidder in Supabase for live data.'
        : 'Trust score computed from live Supabase bid history.',
    });
  } catch (error) {
    logger.error('[TrustScore] Error:', error);
    return Response.json({ success: false, error: 'Failed to calculate trust score' }, { status: 500 });
  }
}
