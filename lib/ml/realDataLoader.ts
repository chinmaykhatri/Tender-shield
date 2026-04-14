/**
 * TenderShield — Real Data Loader for ML Training
 * 
 * Fetches labeled tenders from Supabase (scraped by GeM/CPPP pipeline)
 * and converts them into the feature format expected by randomForest.ts.
 * 
 * Falls back to synthetic data if real data < minimum threshold.
 * 
 * Data flow:
 *   Supabase gem_tenders → extractFeatures() → TenderSample[]
 */

import { extractFeatures, type TenderSample } from './dataset';

// ─── Types ─────────────────────────────────────────────

interface SupabaseTender {
  gem_tender_id: string;
  title: string;
  ministry: string;
  category: string;
  estimated_value_lakh: number;
  estimated_value_crore: number;
  bid_count: number;
  deadline_days: number;
  status: string;
  fraud_score: number;
  risk_level: string;
  fraud_flags: string[];
  is_fraud: number;
  bids_analyzed: number;
  scraped_at: string;
}

export interface RealDataStats {
  totalTenders: number;
  fraudCount: number;
  cleanCount: number;
  ministries: string[];
  dateRange: { earliest: string; latest: string };
  dataSource: 'REAL' | 'HYBRID' | 'SYNTHETIC';
}

// Ministry code mapping for feature compatibility
const MINISTRY_MAP: Record<string, string> = {
  'Ministry of Health & Family Welfare': 'MoHFW',
  'Ministry of Road Transport': 'MoRTH',
  'Ministry of Defence': 'MoD',
  'Ministry of Education': 'MoE',
  'Ministry of Finance': 'MoF',
  'Ministry of IT & Electronics': 'MoIT',
  'MoHFW': 'MoHFW', 'MoRTH': 'MoRTH', 'MoD': 'MoD',
  'MoE': 'MoE', 'MoF': 'MoF', 'MoIT': 'MoIT',
};

const MIN_REAL_DATA = 200;     // Minimum real tenders to train purely on real data
const HYBRID_THRESHOLD = 50;   // Below this, don't use real data at all

// ─── Supabase Fetcher ──────────────────────────────────

async function fetchFromSupabase(): Promise<SupabaseTender[]> {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.log('  ⚠ No Supabase credentials — skipping real data');
    return [];
  }

  try {
    const response = await fetch(
      `${url}/rest/v1/gem_tenders?select=*&labeled_by=eq.REAL_5_DETECTORS&order=scraped_at.desc&limit=5000`,
      {
        headers: {
          'apikey': key,
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json',
          'Prefer': 'count=exact',
        },
      }
    );

    if (!response.ok) {
      console.log(`  ⚠ Supabase returned ${response.status} — using synthetic data`);
      return [];
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.log(`  ⚠ Supabase connection failed: ${error}`);
    return [];
  }
}

// ─── Convert Real Tenders to Training Samples ──────────

function realTenderToSample(tender: SupabaseTender): TenderSample | null {
  try {
    const estCrore = tender.estimated_value_crore || tender.estimated_value_lakh / 100;
    if (estCrore <= 0) return null;

    const bidCount = tender.bid_count || 2;
    const ministry = MINISTRY_MAP[tender.ministry] || tender.ministry?.substring(0, 5) || 'OTHER';

    // Reconstruct bid amounts from available data
    // Real data may not have individual bids — synthesize realistic bids
    // based on tender value, bid count, and fraud flags
    const isFraud = tender.is_fraud === 1;
    const bidAmounts = reconstructBids(estCrore, bidCount, tender.fraud_flags, isFraud);
    const bidTimes = reconstructTimings(bidCount, tender.fraud_flags, isFraud);

    // PAN sharing pattern based on shell company flag
    const hasShellFlag = (tender.fraud_flags || []).includes('SHELL_COMPANY');
    const bidderPANs = generatePANsForReal(bidCount, hasShellFlag);

    // Historical winner info from repeated patterns
    const hasCartelFlag = (tender.fraud_flags || []).includes('BID_RIGGING');
    const historicalWins = hasCartelFlag ? 6 + Math.floor(Math.random() * 3) : Math.floor(Math.random() * 3);

    const raw = {
      tender_id: tender.gem_tender_id,
      ministry,
      category: tender.category || 'GOODS',
      estimated_value_crore: estCrore,
      num_bidders: bidCount,
      bid_amounts: bidAmounts,
      bid_times_hours: bidTimes,
      bidder_pans: bidderPANs,
      winning_amount: Math.min(...bidAmounts),
      historical_winner_count: historicalWins,
      is_repeat_winner: historicalWins > 4,
    };

    const { features, names } = extractFeatures(raw);

    return {
      ...raw,
      features,
      feature_names: names,
      label: tender.is_fraud,
    };
  } catch {
    return null;
  }
}

/**
 * Reconstruct realistic bid amounts from tender metadata.
 * Since the GeM API may not expose individual bid values,
 * we synthesize bids that match the fraud pattern detected.
 */
function reconstructBids(
  estCrore: number,
  bidCount: number,
  fraudFlags: string[],
  isFraud: boolean
): number[] {
  const flags = fraudFlags || [];
  const n = Math.max(2, bidCount);

  if (isFraud && flags.includes('BID_RIGGING')) {
    // Tight clustering — CV < 3%
    const base = estCrore * 0.93;
    return Array.from({ length: n }, (_, i) =>
      Math.round((base + (i * estCrore * 0.005)) * 100) / 100
    );
  }

  if (isFraud && flags.includes('FRONT_RUNNING')) {
    // Winning bid suspiciously close to estimate
    return Array.from({ length: n }, (_, i) =>
      i === 0
        ? Math.round(estCrore * 0.98 * 100) / 100
        : Math.round(estCrore * (1.02 + i * 0.03) * 100) / 100
    );
  }

  // Normal distribution around 85-105% of estimate
  return Array.from({ length: n }, () =>
    Math.round(estCrore * (0.85 + Math.random() * 0.20) * 100) / 100
  );
}

function reconstructTimings(
  bidCount: number,
  fraudFlags: string[],
  isFraud: boolean
): number[] {
  const flags = fraudFlags || [];
  const n = Math.max(1, bidCount - 1);

  if (isFraud && flags.includes('TIMING_COLLUSION')) {
    // Bids within minutes
    return Array.from({ length: n }, () => Math.random() * 0.25);
  }

  // Normal gaps: 2-120 hours
  return Array.from({ length: n }, () => 2 + Math.random() * 118);
}

function generatePANsForReal(bidCount: number, hasShellFlag: boolean): string[] {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const makePAN = () =>
    Array.from({ length: 5 }, () => letters[Math.floor(Math.random() * 26)]).join('') +
    Math.floor(1000 + Math.random() * 9000).toString() +
    letters[Math.floor(Math.random() * 26)];

  if (hasShellFlag) {
    const shared = makePAN();
    return Array.from({ length: bidCount }, (_, i) =>
      i < Math.ceil(bidCount * 0.6) ? shared : makePAN()
    );
  }

  return Array.from({ length: bidCount }, () => makePAN());
}

// ─── Main Export ───────────────────────────────────────

/**
 * Load training data — tries real Supabase data first,
 * falls back to synthetic, supports hybrid mode.
 */
export async function loadTrainingData(options: {
  preferReal: boolean;
  syntheticSize?: number;
  seed?: number;
}): Promise<{ samples: TenderSample[]; stats: RealDataStats }> {
  const { preferReal, syntheticSize = 2000, seed = 42 } = options;

  let realSamples: TenderSample[] = [];
  let stats: RealDataStats = {
    totalTenders: 0,
    fraudCount: 0,
    cleanCount: 0,
    ministries: [],
    dateRange: { earliest: '', latest: '' },
    dataSource: 'SYNTHETIC',
  };

  // ─── Try loading real data ───────────────────────────
  if (preferReal) {
    console.log('📡 Fetching real labeled tenders from Supabase...');
    const realTenders = await fetchFromSupabase();

    if (realTenders.length > 0) {
      console.log(`  Found ${realTenders.length} labeled tenders in database`);

      realSamples = realTenders
        .map(t => realTenderToSample(t))
        .filter((s): s is TenderSample => s !== null);

      console.log(`  Converted ${realSamples.length} to training samples`);

      const ministries = [...new Set(realTenders.map(t => t.ministry))];
      const dates = realTenders
        .map(t => t.scraped_at)
        .filter(Boolean)
        .sort();

      stats = {
        totalTenders: realSamples.length,
        fraudCount: realSamples.filter(s => s.label === 1).length,
        cleanCount: realSamples.filter(s => s.label === 0).length,
        ministries,
        dateRange: {
          earliest: dates[0] || '',
          latest: dates[dates.length - 1] || '',
        },
        dataSource: 'REAL',
      };
    }
  }

  // ─── Decision: Real, Hybrid, or Synthetic ────────────

  if (realSamples.length >= MIN_REAL_DATA) {
    // Enough real data — use purely real
    console.log(`✅ Using ${realSamples.length} REAL training samples`);
    stats.dataSource = 'REAL';
    return { samples: realSamples, stats };
  }

  if (realSamples.length >= HYBRID_THRESHOLD) {
    // Some real data — augment with synthetic
    const { generateDataset } = await import('./dataset');
    const syntheticNeeded = syntheticSize - realSamples.length;
    console.log(`🔄 HYBRID mode: ${realSamples.length} real + ${syntheticNeeded} synthetic`);

    const syntheticSamples = generateDataset(syntheticNeeded, seed);
    const combined = [...realSamples, ...syntheticSamples];

    stats.dataSource = 'HYBRID';
    stats.totalTenders = combined.length;
    stats.fraudCount = combined.filter(s => s.label === 1).length;
    stats.cleanCount = combined.filter(s => s.label === 0).length;

    return { samples: combined, stats };
  }

  // Not enough real data — use synthetic
  if (preferReal && realSamples.length > 0) {
    console.log(`⚠ Only ${realSamples.length} real tenders (need ${MIN_REAL_DATA} minimum)`);
    console.log(`  Falling back to synthetic data for training`);
  }

  const { generateDataset } = await import('./dataset');
  const syntheticSamples = generateDataset(syntheticSize, seed);

  stats = {
    totalTenders: syntheticSamples.length,
    fraudCount: syntheticSamples.filter(s => s.label === 1).length,
    cleanCount: syntheticSamples.filter(s => s.label === 0).length,
    ministries: [...new Set(syntheticSamples.map(s => s.ministry))],
    dateRange: { earliest: 'N/A (synthetic)', latest: 'N/A (synthetic)' },
    dataSource: 'SYNTHETIC',
  };

  return { samples: syntheticSamples, stats };
}
