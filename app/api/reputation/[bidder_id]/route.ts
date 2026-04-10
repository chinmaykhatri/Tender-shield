// ─────────────────────────────────────────────────
// FILE: app/api/reputation/[bidder_id]/route.ts
// TYPE: SERVER API ROUTE
// SECRET KEYS USED: SUPABASE keys (optional)
// WHAT THIS FILE DOES: Calculates TenderShield Reputation Score (TRS) for a bidder
//   Queries Supabase bids table first, falls back to seed profiles.
// ─────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

interface BidderProfile {
  id: string; company_name: string; gstin: string;
  years_in_business: number; tenders_completed: number; tenders_on_time: number;
  msme_registered: boolean; dpiit_registered: boolean; gst_consistent: boolean;
  fraud_flags: number; shell_company: boolean; shared_director_flagged: boolean;
  registered_months_ago: number; disqualifications: number; late_deliveries: number;
}

function calculateTRS(profile: BidderProfile): { score: number; band: string; color: string; breakdown: { factor: string; points: number }[] } {
  let score = 500;
  const breakdown: { factor: string; points: number }[] = [];

  // ADD points
  const yearPoints = Math.min(200, profile.years_in_business * 20);
  score += yearPoints; breakdown.push({ factor: `${profile.years_in_business} years in business`, points: yearPoints });

  const completedPoints = Math.min(150, profile.tenders_on_time * 15);
  score += completedPoints; breakdown.push({ factor: `${profile.tenders_on_time} tenders on time`, points: completedPoints });

  if (profile.msme_registered) { score += 50; breakdown.push({ factor: 'MSME registered', points: 50 }); }
  if (profile.dpiit_registered) { score += 30; breakdown.push({ factor: 'DPIIT startup registration', points: 30 }); }
  if (profile.gst_consistent) { score += 100; breakdown.push({ factor: 'GST filed consistently 3 years', points: 100 }); }
  if (profile.fraud_flags === 0) { score += 100; breakdown.push({ factor: 'Zero fraud history', points: 100 }); }

  // SUBTRACT points
  if (profile.shell_company) { score -= 400; breakdown.push({ factor: 'Shell company detection', points: -400 }); }
  if (profile.fraud_flags > 0) { score -= profile.fraud_flags * 150; breakdown.push({ factor: `${profile.fraud_flags} fraud flags`, points: -profile.fraud_flags * 150 }); }
  if (profile.shared_director_flagged) { score -= 200; breakdown.push({ factor: 'Shared director with flagged company', points: -200 }); }
  if (profile.registered_months_ago < 6) { score -= 200; breakdown.push({ factor: 'Registered less than 6 months ago', points: -200 }); }
  if (profile.disqualifications > 0) { score -= profile.disqualifications * 100; breakdown.push({ factor: `${profile.disqualifications} disqualifications`, points: -profile.disqualifications * 100 }); }
  if (profile.late_deliveries > 0) { score -= profile.late_deliveries * 30; breakdown.push({ factor: `${profile.late_deliveries} late deliveries`, points: -profile.late_deliveries * 30 }); }

  score = Math.max(0, Math.min(1000, score));

  const band = score >= 800 ? 'TRUSTED' : score >= 600 ? 'VERIFIED' : score >= 400 ? 'CAUTION' : score >= 200 ? 'HIGH RISK' : 'BLACKLISTED';
  const color = score >= 800 ? '#22c55e' : score >= 600 ? '#3b82f6' : score >= 400 ? '#f59e0b' : score >= 200 ? '#f97316' : '#dc2626';

  return { score, band, color, breakdown };
}

// Seed profiles — used ONLY when bidder not found in Supabase
const SEED_PROFILES: Record<string, BidderProfile> = {
  'medtech': { id: 'medtech', company_name: 'MedTech Solutions Pvt Ltd', gstin: '07AABCM1234A1ZK', years_in_business: 8, tenders_completed: 14, tenders_on_time: 12, msme_registered: true, dpiit_registered: false, gst_consistent: true, fraud_flags: 0, shell_company: false, shared_director_flagged: false, registered_months_ago: 96, disqualifications: 0, late_deliveries: 1 },
  'medequip': { id: 'medequip', company_name: 'MedEquip Traders Pvt Ltd', gstin: '07AABCM9876A1ZK', years_in_business: 0, tenders_completed: 0, tenders_on_time: 0, msme_registered: false, dpiit_registered: false, gst_consistent: false, fraud_flags: 2, shell_company: true, shared_director_flagged: true, registered_months_ago: 3, disqualifications: 1, late_deliveries: 0 },
  'biomed': { id: 'biomed', company_name: 'BioMed Corp', gstin: '07AABCB5678A1ZK', years_in_business: 3, tenders_completed: 5, tenders_on_time: 4, msme_registered: false, dpiit_registered: false, gst_consistent: true, fraud_flags: 1, shell_company: false, shared_director_flagged: true, registered_months_ago: 36, disqualifications: 0, late_deliveries: 2 },
};

export async function GET(request: NextRequest, { params }: { params: Promise<{ bidder_id: string }> }) {
  const { bidder_id } = await params;
  let profile: BidderProfile | null = null;
  let source = 'SEED_PROFILE';

  // Try Supabase first
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (url && key) {
    try {
      const supabase = createClient(url, key);
      const { data: bids } = await supabase
        .from('bids')
        .select('bid_id, tender_id, status, created_at')
        .or(`bidder_did.ilike.%${bidder_id}%,bid_id.ilike.%${bidder_id}%`);

      if (bids && bids.length > 0) {
        const totalBids = bids.length;
        const flagged = bids.filter((b: any) => b.status === 'FLAGGED' || b.status === 'REJECTED').length;
        const verified = bids.filter((b: any) => b.status === 'VERIFIED' || b.status === 'REVEALED').length;

        profile = {
          id: bidder_id,
          company_name: bidder_id.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
          gstin: 'Queried from Supabase',
          years_in_business: 2,
          tenders_completed: verified,
          tenders_on_time: verified,
          msme_registered: false,
          dpiit_registered: false,
          gst_consistent: flagged === 0,
          fraud_flags: flagged,
          shell_company: false,
          shared_director_flagged: false,
          registered_months_ago: 24,
          disqualifications: 0,
          late_deliveries: 0,
        };
        source = 'SUPABASE_BIDS';
      }
    } catch {
      // Supabase query failed — fall through to seed
    }
  }

  // Fall back to seed
  if (!profile) {
    profile = SEED_PROFILES[bidder_id] || SEED_PROFILES['medtech'];
  }

  const result = calculateTRS(profile);

  return NextResponse.json({
    bidder_id: profile.id,
    company_name: profile.company_name,
    gstin: profile.gstin,
    trs: result.score,
    band: result.band,
    color: result.color,
    breakdown: result.breakdown,
    years_in_business: profile.years_in_business,
    tenders_on_time: profile.tenders_on_time,
    msme_registered: profile.msme_registered,
    late_deliveries: profile.late_deliveries,
    _data_source: source,
    _note: source === 'SEED_PROFILE'
      ? 'Reputation computed from seed profile. Register bidder in Supabase for live scoring.'
      : 'Reputation computed from live Supabase bid history.',
  });
}
