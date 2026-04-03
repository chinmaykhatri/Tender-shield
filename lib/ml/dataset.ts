/**
 * TenderShield — Synthetic GeM Procurement Dataset Generator
 * 
 * Generates realistic Indian government procurement data with known
 * fraud patterns for training a binary classifier.
 * 
 * Fraud patterns modeled:
 *   1. Shell company bidding (shared PAN/directors)
 *   2. Bid rigging (abnormally low CV in bid amounts)
 *   3. Cartel rotation (same winners repeatedly)
 *   4. Timing collusion (bids submitted within seconds)
 *   5. Benford's Law violation (non-natural leading digits)
 *   6. Inflated estimates (bid significantly above/below estimate)
 */

// ─── GeM Ministries & Categories ───────────────────────
const MINISTRIES = [
  'MoHFW', 'MoRTH', 'MoD', 'MoE', 'MoF', 'MoIT', 'MoA', 'MoR',
  'MoC', 'MoHA', 'MoWR', 'MoP', 'MoS', 'MoT', 'MoL',
];

const CATEGORIES = ['GOODS', 'SERVICES', 'WORKS', 'CONSULTANCY'];

const COMPANY_NAMES = [
  'Alpha Tech Solutions', 'Beta Infrastructure Ltd', 'Gamma Medical Corp',
  'Delta Systems Pvt Ltd', 'Epsilon Pharma', 'Zeta Engineering',
  'Eta Logistics', 'Theta Computing', 'Iota Services',
  'Kappa Constructions', 'Lambda Electronics', 'Mu Chemicals',
  'Nu Healthcare', 'Xi Automation', 'Omicron Digital',
  'Pi Networks', 'Rho Materials', 'Sigma Defence',
  'Tau Biotech', 'Upsilon Energy', 'Phi Consulting',
];

// ─── Utility ───────────────────────────────────────────
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

function pick<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

function gaussian(mean: number, std: number, rng: () => number): number {
  // Box-Muller transform
  const u1 = rng() || 0.001;
  const u2 = rng();
  return mean + std * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

function generatePAN(rng: () => number): string {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  return Array.from({ length: 5 }, () => letters[Math.floor(rng() * 26)]).join('') +
    Math.floor(1000 + rng() * 9000).toString() +
    letters[Math.floor(rng() * 26)];
}

// ─── Feature Extraction ────────────────────────────────

export interface TenderSample {
  // Raw data
  tender_id: string;
  ministry: string;
  category: string;
  estimated_value_crore: number;
  num_bidders: number;
  bid_amounts: number[];
  bid_times_hours: number[];  // time gaps between bids in hours
  bidder_pans: string[];
  winning_amount: number;
  historical_winner_count: number;  // times winner has won in last 10 tenders
  is_repeat_winner: boolean;
  // Feature-engineered
  features: number[];
  feature_names: string[];
  // Label
  label: number; // 0 = clean, 1 = fraud
}

export function extractFeatures(sample: Omit<TenderSample, 'features' | 'feature_names' | 'label'>): { features: number[]; names: string[] } {
  const bids = sample.bid_amounts;
  const n = bids.length;
  const est = sample.estimated_value_crore;

  // 1. Coefficient of Variation (bid clustering)
  const mean = bids.reduce((a, b) => a + b, 0) / n;
  const std = Math.sqrt(bids.reduce((s, b) => s + (b - mean) ** 2, 0) / n);
  const cv = mean > 0 ? std / mean : 0;

  // 2. Bid-to-estimate ratio (average)
  const avgBidEstRatio = mean / est;

  // 3. Winning bid discount (how much below estimate)
  const winDiscount = (est - sample.winning_amount) / est;

  // 4. Range ratio (max - min) / estimate
  const rangeRatio = (Math.max(...bids) - Math.min(...bids)) / est;

  // 5. Benford's Law leading digit distribution
  const leadingDigits = bids.map(b => parseInt(b.toString()[0]));
  const digit1Count = leadingDigits.filter(d => d === 1).length;
  const benfordExpected = n * 0.301; // Benford predicts 30.1% start with "1"
  const benfordDeviation = Math.abs(digit1Count - benfordExpected) / Math.max(benfordExpected, 1);

  // 6. Timing features
  const timingGaps = sample.bid_times_hours;
  const avgGap = timingGaps.length > 0 ? timingGaps.reduce((a, b) => a + b, 0) / timingGaps.length : 24;
  const minGap = timingGaps.length > 0 ? Math.min(...timingGaps) : 24;
  const timingCluster = minGap < 0.5 ? 1 : 0; // Bids within 30 min

  // 7. PAN sharing (shell company indicator)
  const uniquePANs = new Set(sample.bidder_pans).size;
  const panSharingRatio = 1 - (uniquePANs / Math.max(n, 1));

  // 8. Repeat winner frequency
  const repeatWinRatio = sample.historical_winner_count / 10;

  // 9. Number of bidders (few bidders = less competition)
  const fewBidders = n <= 3 ? 1 : 0;

  // 10. Estimate magnitude (log scale)
  const logEstimate = Math.log10(est + 1);

  // 11. Bid standard deviation normalized
  const normalizedStd = std / Math.max(est, 1);

  // 12. Max bid / Min bid ratio
  const maxMinRatio = Math.min(...bids) > 0 ? Math.max(...bids) / Math.min(...bids) : 1;

  const features = [
    cv,                    // 0: Coefficient of variation
    avgBidEstRatio,        // 1: Average bid / estimate
    winDiscount,           // 2: Winning discount percentage
    rangeRatio,            // 3: Bid range / estimate
    benfordDeviation,      // 4: Benford's law deviation
    avgGap,                // 5: Average time gap between bids (hours)
    minGap,                // 6: Minimum time gap (hours)
    timingCluster,         // 7: Timing cluster indicator
    panSharingRatio,       // 8: PAN sharing ratio (shell company)
    repeatWinRatio,        // 9: Repeat winner ratio
    fewBidders ? 1 : 0,    // 10: Few bidders indicator
    logEstimate,           // 11: Log of estimate value
    normalizedStd,         // 12: Normalized standard deviation
    maxMinRatio,           // 13: Max/Min bid ratio
  ];

  const names = [
    'coefficient_of_variation', 'avg_bid_estimate_ratio', 'winning_discount',
    'bid_range_ratio', 'benford_deviation', 'avg_time_gap_hrs', 'min_time_gap_hrs',
    'timing_cluster', 'pan_sharing_ratio', 'repeat_winner_ratio', 'few_bidders',
    'log_estimate_value', 'normalized_std', 'max_min_bid_ratio',
  ];

  return { features, names };
}

// ─── Dataset Generation ────────────────────────────────

export function generateDataset(size: number = 2000, seed: number = 42): TenderSample[] {
  const rng = seededRandom(seed);
  const samples: TenderSample[] = [];
  const fraudRatio = 0.25; // 25% fraud

  for (let i = 0; i < size; i++) {
    const isFraud = rng() < fraudRatio;
    const ministry = pick(MINISTRIES, rng);
    const category = pick(CATEGORIES, rng);
    const estimated = Math.round(gaussian(100, 80, rng) * 100) / 100;
    const estValue = Math.max(5, Math.abs(estimated));

    let numBidders = Math.max(2, Math.round(gaussian(6, 2, rng)));
    let bidAmounts: number[] = [];
    let bidTimes: number[] = [];
    let bidderPANs: string[] = [];
    let historicalWins = Math.floor(rng() * 3);
    let isRepeat = false;

    if (isFraud) {
      // Generate fraudulent tender with specific patterns
      const fraudType = Math.floor(rng() * 5);

      switch (fraudType) {
        case 0: // Bid rigging — very tight bid clustering
          numBidders = Math.max(3, numBidders);
          const riggedBase = estValue * (0.92 + rng() * 0.05);
          bidAmounts = Array.from({ length: numBidders }, () =>
            Math.round((riggedBase + (rng() - 0.5) * estValue * 0.01) * 100) / 100
          );
          bidTimes = Array.from({ length: numBidders - 1 }, () => rng() * 48 + 2);
          bidderPANs = Array.from({ length: numBidders }, () => generatePAN(rng));
          break;

        case 1: // Shell companies — shared PANs
          numBidders = Math.max(3, numBidders);
          const sharedPAN = generatePAN(rng);
          bidAmounts = Array.from({ length: numBidders }, () =>
            Math.round(estValue * (0.85 + rng() * 0.2) * 100) / 100
          );
          bidTimes = Array.from({ length: numBidders - 1 }, () => rng() * 72 + 1);
          bidderPANs = Array.from({ length: numBidders }, (_, j) =>
            j < Math.ceil(numBidders * 0.6) ? sharedPAN : generatePAN(rng)
          );
          break;

        case 2: // Timing collusion — bids within minutes
          numBidders = Math.max(3, numBidders);
          bidAmounts = Array.from({ length: numBidders }, () =>
            Math.round(estValue * (0.85 + rng() * 0.2) * 100) / 100
          );
          bidTimes = Array.from({ length: numBidders - 1 }, () => rng() * 0.3); // Under 20 min
          bidderPANs = Array.from({ length: numBidders }, () => generatePAN(rng));
          break;

        case 3: // Cartel rotation — same winner always
          numBidders = Math.max(2, numBidders);
          bidAmounts = Array.from({ length: numBidders }, () =>
            Math.round(estValue * (0.88 + rng() * 0.15) * 100) / 100
          );
          bidTimes = Array.from({ length: numBidders - 1 }, () => rng() * 48 + 1);
          bidderPANs = Array.from({ length: numBidders }, () => generatePAN(rng));
          historicalWins = 6 + Math.floor(rng() * 4); // Won 6-9 of last 10
          isRepeat = true;
          break;

        case 4: // Inflated estimate — extreme overbidding
          numBidders = 2 + Math.floor(rng() * 2);
          bidAmounts = Array.from({ length: numBidders }, () =>
            Math.round(estValue * (1.3 + rng() * 0.5) * 100) / 100
          );
          bidTimes = Array.from({ length: numBidders - 1 }, () => rng() * 48 + 2);
          bidderPANs = Array.from({ length: numBidders }, () => generatePAN(rng));
          break;
      }
    } else {
      // Clean tender — natural distribution
      bidAmounts = Array.from({ length: numBidders }, () =>
        Math.round(estValue * (0.75 + rng() * 0.35) * 100) / 100
      );
      bidTimes = Array.from({ length: numBidders - 1 }, () => 2 + rng() * 120); // 2-122 hours
      bidderPANs = Array.from({ length: numBidders }, () => generatePAN(rng));
      isRepeat = rng() < 0.15;
    }

    const winningAmount = Math.min(...bidAmounts);

    const raw = {
      tender_id: `TDR-${ministry}-${i.toString().padStart(4, '0')}`,
      ministry,
      category,
      estimated_value_crore: estValue,
      num_bidders: numBidders,
      bid_amounts: bidAmounts,
      bid_times_hours: bidTimes,
      bidder_pans: bidderPANs,
      winning_amount: winningAmount,
      historical_winner_count: historicalWins,
      is_repeat_winner: isRepeat,
    };

    const { features, names } = extractFeatures(raw);

    samples.push({
      ...raw,
      features,
      feature_names: names,
      label: isFraud ? 1 : 0,
    });
  }

  return samples;
}

// ─── Train/Test Split ──────────────────────────────────

export function trainTestSplit(
  data: TenderSample[],
  testRatio: number = 0.2,
  seed: number = 42
): { train: TenderSample[]; test: TenderSample[] } {
  const rng = seededRandom(seed + 100);
  const shuffled = [...data].sort(() => rng() - 0.5);
  const splitAt = Math.floor(shuffled.length * (1 - testRatio));
  return {
    train: shuffled.slice(0, splitAt),
    test: shuffled.slice(splitAt),
  };
}
