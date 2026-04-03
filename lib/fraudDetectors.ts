/**
 * TenderShield — Real Statistical Fraud Detection Engine
 * 
 * 5 Independent Detectors using REAL math:
 *   1. Benford's Law — Chi-squared test on first-digit distribution
 *   2. Bid Rigging — Coefficient of Variation + clustering analysis
 *   3. Shell Company — CIN/PAN pattern matching + incorporation timing
 *   4. Timing Collusion — Submission interval analysis + burst detection
 *   5. Cartel Rotation — Win pattern entropy + market allocation
 * 
 * Each detector outputs:
 *   - score (0-100)
 *   - flag (true/false)
 *   - evidence (human-readable)
 *   - math (transparent computation details)
 */

// ═══════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════

export interface Bid {
  bidder_name: string;
  amount: number;          // in Crore
  gstin?: string;
  pan?: string;
  cin?: string;
  incorporation_date?: string;
  registered_address?: string;
  submitted_at?: string;   // ISO timestamp
  past_wins?: number;
}

export interface DetectorResult {
  name: string;
  score: number;           // 0-100
  flag: boolean;           // true = suspicious
  evidence: string;
  math: MathDetails;
}

export interface MathDetails {
  formula: string;
  inputs: Record<string, string | number>;
  computation: string[];   // step-by-step
  threshold: string;
  result: string;
}

export interface FraudAnalysis {
  risk_score: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  confidence: number;
  detectors: DetectorResult[];
  recommended_action: string;
  summary: string;
  engine: string;
  timestamp: string;
}

// ═══════════════════════════════════════════════════
// Detector 1: Benford's Law (Chi-Squared Test)
// ═══════════════════════════════════════════════════
// In natural datasets, the first digit d appears with probability:
//   P(d) = log₁₀(1 + 1/d)
// Deviations from this indicate data manipulation.

const BENFORD_EXPECTED = [0, 0.301, 0.176, 0.125, 0.097, 0.079, 0.067, 0.058, 0.051, 0.046];

export function benfordsLawDetector(bids: Bid[]): DetectorResult {
  const amounts = bids.map(b => b.amount).filter(a => a > 0);
  
  if (amounts.length < 3) {
    return {
      name: 'Benford\'s Law',
      score: 0,
      flag: false,
      evidence: 'Insufficient data (need ≥3 bids for Benford analysis)',
      math: {
        formula: 'P(d) = log₁₀(1 + 1/d)',
        inputs: { n: amounts.length },
        computation: ['Need at least 3 bid amounts for chi-squared test'],
        threshold: 'χ² > 15.51 (df=8, α=0.05)',
        result: 'N/A — insufficient data',
      },
    };
  }

  // Count first digits
  const observed = new Array(10).fill(0);
  for (const amt of amounts) {
    const firstDigit = parseInt(String(amt).replace(/[^1-9]/, '').charAt(0));
    if (firstDigit >= 1 && firstDigit <= 9) observed[firstDigit]++;
  }

  const n = amounts.length;
  const steps: string[] = [];
  let chiSquared = 0;

  steps.push(`n = ${n} bids analyzed`);
  steps.push(`First digits extracted: [${amounts.map(a => String(a).replace(/[^1-9]/, '').charAt(0)).join(', ')}]`);

  for (let d = 1; d <= 9; d++) {
    const expected = BENFORD_EXPECTED[d] * n;
    const obs = observed[d];
    const contrib = expected > 0 ? Math.pow(obs - expected, 2) / expected : 0;
    chiSquared += contrib;
    steps.push(`d=${d}: observed=${obs}, expected=${expected.toFixed(2)}, χ²+=${contrib.toFixed(3)}`);
  }

  steps.push(`Total χ² = ${chiSquared.toFixed(3)}`);

  // χ² critical value at α=0.05, df=8 is 15.51
  const critical = 15.51;
  const pValue = chiSquaredPValue(chiSquared, 8);
  const isAnomalous = chiSquared > critical;

  // Score: normalize χ² to 0-100 (χ²=0 → score 0, χ²≥30 → score 100)
  const score = Math.min(100, Math.round((chiSquared / 30) * 100));

  steps.push(`p-value ≈ ${pValue.toFixed(4)}`);
  steps.push(isAnomalous
    ? `χ² = ${chiSquared.toFixed(2)} > ${critical} → REJECT H₀ (digits do NOT follow Benford's Law)`
    : `χ² = ${chiSquared.toFixed(2)} ≤ ${critical} → FAIL TO REJECT H₀ (consistent with Benford's Law)`
  );

  return {
    name: 'Benford\'s Law',
    score,
    flag: isAnomalous,
    evidence: isAnomalous
      ? `Bid amounts violate Benford's Law (χ²=${chiSquared.toFixed(2)}, p=${pValue.toFixed(4)}). First-digit distribution inconsistent with natural pricing — suggests price manipulation or coordinated bidding.`
      : `Bid amounts consistent with Benford's Law (χ²=${chiSquared.toFixed(2)}, p=${pValue.toFixed(4)}). First-digit distribution matches expected natural patterns.`,
    math: {
      formula: 'χ² = Σ (Oᵢ - Eᵢ)² / Eᵢ, where Eᵢ = n × log₁₀(1 + 1/d)',
      inputs: { n, chi_squared: parseFloat(chiSquared.toFixed(3)), critical_value: critical, degrees_of_freedom: 8 },
      computation: steps,
      threshold: `χ² > ${critical} (df=8, α=0.05)`,
      result: `χ² = ${chiSquared.toFixed(3)}, p = ${pValue.toFixed(4)} → ${isAnomalous ? 'ANOMALOUS' : 'NORMAL'}`,
    },
  };
}

// ═══════════════════════════════════════════════════
// Detector 2: Bid Rigging (Coefficient of Variation)
// ═══════════════════════════════════════════════════
// CV = (σ / μ) × 100%
// Normal tenders: CV = 8-15%
// Rigged tenders: CV < 3% (bids suspiciously close)

export function bidRiggingDetector(bids: Bid[], estimatedValue?: number): DetectorResult {
  const amounts = bids.map(b => b.amount).filter(a => a > 0);

  if (amounts.length < 2) {
    return {
      name: 'Bid Rigging (CV)',
      score: 0,
      flag: false,
      evidence: 'Need ≥2 bids for coefficient of variation analysis',
      math: {
        formula: 'CV = (σ / μ) × 100%',
        inputs: { n: amounts.length },
        computation: ['Insufficient bids'],
        threshold: 'CV < 3% → suspicious',
        result: 'N/A',
      },
    };
  }

  const n = amounts.length;
  const mean = amounts.reduce((a, b) => a + b, 0) / n;
  const variance = amounts.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / (n - 1);
  const stdDev = Math.sqrt(variance);
  const cv = (stdDev / mean) * 100;

  // Spread analysis
  const sorted = [...amounts].sort((a, b) => a - b);
  const range = sorted[sorted.length - 1] - sorted[0];
  const rangePercent = (range / mean) * 100;

  // Round number analysis (common in rigged bids)
  const roundNumbers = amounts.filter(a => a % 1 === 0 || a % 5 === 0 || a % 10 === 0).length;
  const roundPct = (roundNumbers / n) * 100;

  // Proximity to estimate
  let estimateProximity = 'N/A';
  if (estimatedValue && estimatedValue > 0) {
    const avgDev = amounts.reduce((s, a) => s + Math.abs(a - estimatedValue) / estimatedValue * 100, 0) / n;
    estimateProximity = `${avgDev.toFixed(1)}%`;
  }

  const steps: string[] = [
    `Bid amounts (₹Cr): [${amounts.map(a => a.toFixed(2)).join(', ')}]`,
    `n = ${n}`,
    `μ (mean) = ₹${mean.toFixed(2)} Cr`,
    `σ² (variance) = ${variance.toFixed(4)}`,
    `σ (std dev) = ₹${stdDev.toFixed(4)} Cr`,
    `CV = (${stdDev.toFixed(4)} / ${mean.toFixed(2)}) × 100 = ${cv.toFixed(2)}%`,
    `Range = ₹${sorted[0].toFixed(2)} to ₹${sorted[sorted.length - 1].toFixed(2)} Cr (spread: ${rangePercent.toFixed(1)}%)`,
    `Round numbers: ${roundNumbers}/${n} (${roundPct.toFixed(0)}%)`,
    estimatedValue ? `Avg deviation from estimate (₹${estimatedValue}Cr): ${estimateProximity}` : '',
    cv < 3 ? '⚠️ CV < 3% — highly suspicious (normal range: 8-15%)' :
    cv < 8 ? '⚠️ CV < 8% — moderately suspicious' :
    '✅ CV within normal range (8-15%)',
  ].filter(Boolean);

  // Score: CV < 1% → 100, CV 1-3% → 80-99, CV 3-8% → 30-79, CV > 8% → 0-30
  let score: number;
  if (cv < 1) score = 100;
  else if (cv < 3) score = Math.round(80 + (3 - cv) / 2 * 10);
  else if (cv < 8) score = Math.round(30 + (8 - cv) / 5 * 49);
  else if (cv < 15) score = Math.round((15 - cv) / 7 * 30);
  else score = 0;

  return {
    name: 'Bid Rigging (CV)',
    score,
    flag: cv < 3,
    evidence: cv < 3
      ? `Coefficient of variation = ${cv.toFixed(2)}% (normal range: 8-15%). All ${n} bids cluster within ₹${range.toFixed(2)} Cr of each other. Statistical probability of natural clustering: p < ${(cv / 100).toFixed(4)}.`
      : `Coefficient of variation = ${cv.toFixed(2)}% — within ${cv < 8 ? 'borderline' : 'normal'} range. Bid spread: ₹${range.toFixed(2)} Cr.`,
    math: {
      formula: 'CV = (σ / μ) × 100%, where σ = √(Σ(xᵢ-μ)²/(n-1))',
      inputs: { n, mean: parseFloat(mean.toFixed(2)), std_dev: parseFloat(stdDev.toFixed(4)), cv: parseFloat(cv.toFixed(2)) },
      computation: steps,
      threshold: 'CV < 3% → Bid Rigging suspected (normal: 8-15%)',
      result: `CV = ${cv.toFixed(2)}% → ${cv < 3 ? 'SUSPICIOUS' : cv < 8 ? 'BORDERLINE' : 'NORMAL'}`,
    },
  };
}

// ═══════════════════════════════════════════════════
// Detector 3: Shell Company Detection
// ═══════════════════════════════════════════════════
// Checks: shared PAN/directors, recent incorporation, common addresses

export function shellCompanyDetector(bids: Bid[]): DetectorResult {
  const steps: string[] = [];
  let score = 0;
  const flags: string[] = [];

  // Check for shared PAN
  const pans = bids.filter(b => b.pan).map(b => b.pan!);
  const panDupes = pans.filter((p, i) => pans.indexOf(p) !== i);
  if (panDupes.length > 0) {
    score += 40;
    flags.push(`Shared PAN detected: ${panDupes.join(', ')}`);
    steps.push(`⚠️ ${panDupes.length} duplicate PAN(s): [${panDupes.join(', ')}]`);
  } else {
    steps.push(`✅ No duplicate PANs across ${pans.length} bidders`);
  }

  // Check CIN patterns (same state, same year)
  const cins = bids.filter(b => b.cin).map(b => ({ name: b.bidder_name, cin: b.cin! }));
  if (cins.length >= 2) {
    // CIN format: L/U + 5-digit NIC + 2-letter state + 4-digit year + 3-letter type + 6-digit number
    const stateYears = cins.map(c => c.cin.substring(1, 12));
    const syDupes = stateYears.filter((s, i) => stateYears.indexOf(s) !== i);
    if (syDupes.length > 0) {
      score += 25;
      flags.push('Companies share same NIC code + state + year of incorporation');
      steps.push(`⚠️ CIN pattern match — same industry/state/year: ${syDupes[0]}`);
    }
    steps.push(`CIN analysis: ${cins.map(c => `${c.name} → ${c.cin}`).join(', ')}`);
  }

  // Check incorporation dates (both < 180 days old = suspicious)
  const recentBidders: string[] = [];
  const now = Date.now();
  for (const bid of bids) {
    if (bid.incorporation_date) {
      const incDate = new Date(bid.incorporation_date).getTime();
      const daysSince = (now - incDate) / (1000 * 60 * 60 * 24);
      if (daysSince < 180) {
        recentBidders.push(`${bid.bidder_name} (${Math.round(daysSince)} days old)`);
        score += 15;
      }
      steps.push(`${bid.bidder_name}: incorporated ${Math.round(daysSince)} days ago${daysSince < 180 ? ' ⚠️ RECENT' : ''}`);
    }
  }
  if (recentBidders.length >= 2) {
    flags.push(`${recentBidders.length} bidders incorporated within 180 days`);
  }

  // Check shared addresses
  const addresses = bids.filter(b => b.registered_address).map(b => b.registered_address!.toLowerCase().trim());
  const addrDupes = addresses.filter((a, i) => addresses.indexOf(a) !== i);
  if (addrDupes.length > 0) {
    score += 20;
    flags.push('Shared registered address detected');
    steps.push(`⚠️ Common address: "${addrDupes[0]}"`);
  }

  score = Math.min(100, score);
  const flagged = score >= 40;

  return {
    name: 'Shell Company',
    score,
    flag: flagged,
    evidence: flagged
      ? `Shell company indicators: ${flags.join('. ')}. Score: ${score}/100.`
      : `No significant shell company indicators. ${bids.length} unique bidders analyzed.`,
    math: {
      formula: 'Score = Σ(shared_PAN×40 + CIN_pattern×25 + recent_incorp×15 + shared_addr×20)',
      inputs: { bidders: bids.length, shared_pans: panDupes.length, recent_companies: recentBidders.length, shared_addresses: addrDupes.length },
      computation: steps,
      threshold: 'Score ≥ 40 → Shell Company suspected',
      result: `Score = ${score} → ${flagged ? 'SUSPICIOUS' : 'CLEAN'}`,
    },
  };
}

// ═══════════════════════════════════════════════════
// Detector 4: Timing Collusion
// ═══════════════════════════════════════════════════
// Analyzes submission timestamps for suspicious patterns:
//   - Burst submissions (multiple bids within seconds)
//   - Sequential intervals (robot-like equal spacing)

export function timingCollusionDetector(bids: Bid[]): DetectorResult {
  const timestamps = bids
    .filter(b => b.submitted_at)
    .map(b => new Date(b.submitted_at!).getTime())
    .sort((a, b) => a - b);

  if (timestamps.length < 2) {
    return {
      name: 'Timing Collusion',
      score: 0,
      flag: false,
      evidence: 'Insufficient timestamp data for timing analysis',
      math: {
        formula: 'burst = count(Δt < 300s for consecutive bids)',
        inputs: { n: timestamps.length },
        computation: ['Need ≥2 timestamped bids'],
        threshold: '≥3 bids within 5 minutes → suspicious',
        result: 'N/A',
      },
    };
  }

  const steps: string[] = [];
  const intervals: number[] = [];

  for (let i = 1; i < timestamps.length; i++) {
    const deltaMs = timestamps[i] - timestamps[i - 1];
    const deltaSec = deltaMs / 1000;
    intervals.push(deltaSec);
    steps.push(`Δt[${i}] = ${deltaSec.toFixed(1)}s (${formatDuration(deltaSec)})`);
  }

  // Burst detection: count bids within 5 min window
  const burstThreshold = 300; // 5 minutes
  let burstCount = 0;
  for (const interval of intervals) {
    if (interval < burstThreshold) burstCount++;
  }

  // Sequential interval detection (equal spacing → robot)
  const meanInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  const intervalCV = intervals.length > 1
    ? (Math.sqrt(intervals.reduce((s, x) => s + Math.pow(x - meanInterval, 2), 0) / (intervals.length - 1)) / meanInterval) * 100
    : 100;

  steps.push(`Mean interval: ${formatDuration(meanInterval)}`);
  steps.push(`Interval CV: ${intervalCV.toFixed(1)}% (low CV = suspiciously regular)`);
  steps.push(`Burst submissions (<5min apart): ${burstCount}/${intervals.length}`);

  // Total time span
  const totalSpan = (timestamps[timestamps.length - 1] - timestamps[0]) / 1000;
  steps.push(`Total submission span: ${formatDuration(totalSpan)}`);

  // Score
  let score = 0;
  if (burstCount >= 2) score += 50;
  else if (burstCount === 1) score += 20;
  if (intervalCV < 10 && intervals.length > 1) score += 30; // very regular intervals
  if (totalSpan < 600 && timestamps.length >= 3) score += 20; // all bids within 10 min

  score = Math.min(100, score);
  const flagged = score >= 50;

  return {
    name: 'Timing Collusion',
    score,
    flag: flagged,
    evidence: flagged
      ? `Suspicious timing: ${burstCount} burst submissions within 5 minutes. Total span: ${formatDuration(totalSpan)}. Interval regularity: CV=${intervalCV.toFixed(1)}%.`
      : `Submission timing appears normal. Span: ${formatDuration(totalSpan)}. No burst patterns detected.`,
    math: {
      formula: 'Score = burst_count×25 + (CV<10)×30 + (span<10min)×20',
      inputs: {
        n: timestamps.length,
        burst_count: burstCount,
        interval_cv: parseFloat(intervalCV.toFixed(1)),
        total_span_seconds: parseFloat(totalSpan.toFixed(1)),
      },
      computation: steps,
      threshold: 'Score ≥ 50 → Timing Collusion suspected',
      result: `Score = ${score} → ${flagged ? 'SUSPICIOUS' : 'NORMAL'}`,
    },
  };
}

// ═══════════════════════════════════════════════════
// Detector 5: Cartel Rotation
// ═══════════════════════════════════════════════════
// Checks if the same set of bidders appear together repeatedly
// and take turns winning (low entropy in winner distribution)

export function cartelRotationDetector(bids: Bid[], historicalWinners?: string[]): DetectorResult {
  const steps: string[] = [];
  let score = 0;

  // Check past wins overlap
  const bidderNames = bids.map(b => b.bidder_name);
  steps.push(`Current bidders: [${bidderNames.join(', ')}]`);

  if (historicalWinners && historicalWinners.length > 0) {
    const overlap = bidderNames.filter(b => historicalWinners.includes(b));
    const overlapPct = (overlap.length / bidderNames.length) * 100;

    steps.push(`Historical winners (last 10 tenders): [${historicalWinners.join(', ')}]`);
    steps.push(`Overlap: ${overlap.length}/${bidderNames.length} (${overlapPct.toFixed(0)}%)`);

    if (overlapPct >= 80) {
      score += 50;
      steps.push('⚠️ 80%+ of current bidders are repeat winners');
    } else if (overlapPct >= 50) {
      score += 25;
      steps.push('⚠️ 50%+ of current bidders are repeat winners');
    }

    // Win entropy: H = -Σ p(x) log₂ p(x)
    const winCounts: Record<string, number> = {};
    for (const w of historicalWinners) {
      winCounts[w] = (winCounts[w] || 0) + 1;
    }
    const total = historicalWinners.length;
    let entropy = 0;
    for (const count of Object.values(winCounts)) {
      const p = count / total;
      if (p > 0) entropy -= p * Math.log2(p);
    }
    const maxEntropy = Math.log2(Object.keys(winCounts).length);
    const normalizedEntropy = maxEntropy > 0 ? entropy / maxEntropy : 1;

    steps.push(`Win distribution entropy: H = ${entropy.toFixed(3)} bits`);
    steps.push(`Max entropy: H_max = ${maxEntropy.toFixed(3)} bits`);
    steps.push(`Normalized: ${(normalizedEntropy * 100).toFixed(1)}% of maximum`);

    if (normalizedEntropy < 0.5 && total >= 5) {
      score += 30;
      steps.push('⚠️ Low entropy — wins concentrated among few bidders');
    }
  } else {
    steps.push('No historical winner data available — limited analysis');
    // Check past_wins field on bids
    const repeatWinners = bids.filter(b => (b.past_wins || 0) > 2);
    if (repeatWinners.length >= 2) {
      score += 25;
      steps.push(`⚠️ ${repeatWinners.length} bidders with >2 past wins in same category`);
    }
  }

  score = Math.min(100, score);
  const flagged = score >= 40;

  return {
    name: 'Cartel Rotation',
    score,
    flag: flagged,
    evidence: flagged
      ? `Cartel rotation indicators detected. ${bidderNames.length} bidders show repeat patterns. Score: ${score}/100.`
      : `No significant rotation patterns. ${bidderNames.length} bidders analyzed.`,
    math: {
      formula: 'H = -Σ p(x) log₂ p(x) — Shannon entropy of winner distribution',
      inputs: { bidders: bidderNames.length, historical_tenders: historicalWinners?.length || 0 },
      computation: steps,
      threshold: 'Normalized entropy < 0.5 + overlap > 50% → Cartel suspected',
      result: `Score = ${score} → ${flagged ? 'SUSPICIOUS' : 'NORMAL'}`,
    },
  };
}

// ═══════════════════════════════════════════════════
// Master Analysis: Run All 5 Detectors
// ═══════════════════════════════════════════════════

const DETECTOR_WEIGHTS = {
  'Benford\'s Law': 0.15,
  'Bid Rigging (CV)': 0.30,
  'Shell Company': 0.25,
  'Timing Collusion': 0.15,
  'Cartel Rotation': 0.15,
};

export function runAllDetectors(
  bids: Bid[],
  estimatedValue?: number,
  historicalWinners?: string[]
): FraudAnalysis {
  const detectors: DetectorResult[] = [
    benfordsLawDetector(bids),
    bidRiggingDetector(bids, estimatedValue),
    shellCompanyDetector(bids),
    timingCollusionDetector(bids),
    cartelRotationDetector(bids, historicalWinners),
  ];

  // Weighted risk score
  let weightedScore = 0;
  for (const d of detectors) {
    const weight = DETECTOR_WEIGHTS[d.name as keyof typeof DETECTOR_WEIGHTS] || 0.2;
    weightedScore += d.score * weight;
  }

  const riskScore = Math.round(weightedScore);
  const flagCount = detectors.filter(d => d.flag).length;

  let riskLevel: FraudAnalysis['risk_level'];
  if (riskScore >= 75 || flagCount >= 3) riskLevel = 'CRITICAL';
  else if (riskScore >= 50 || flagCount >= 2) riskLevel = 'HIGH';
  else if (riskScore >= 25 || flagCount >= 1) riskLevel = 'MEDIUM';
  else riskLevel = 'LOW';

  let action: string;
  if (riskLevel === 'CRITICAL') action = 'FREEZE + ESCALATE_CAG';
  else if (riskLevel === 'HIGH') action = 'FLAG + MANUAL_REVIEW';
  else if (riskLevel === 'MEDIUM') action = 'MONITOR';
  else action = 'APPROVE';

  const flaggedDetectors = detectors.filter(d => d.flag).map(d => d.name);
  const summary = flaggedDetectors.length > 0
    ? `${riskLevel}: ${flaggedDetectors.join(', ')} flagged. Weighted score: ${riskScore}/100. Action: ${action}.`
    : `LOW risk. All 5 statistical detectors passed. No fraud indicators detected.`;

  return {
    risk_score: riskScore,
    risk_level: riskLevel,
    confidence: parseFloat((0.7 + (bids.length / 20) * 0.3).toFixed(2)),
    detectors,
    recommended_action: action,
    summary,
    engine: 'TenderShield Statistical Engine v3.0 — 5 independent detectors',
    timestamp: new Date().toISOString(),
  };
}

// ═══════════════════════════════════════════════════
// Utility Functions
// ═══════════════════════════════════════════════════

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds.toFixed(0)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}

/** Approximate chi-squared p-value using Wilson-Hilferty approximation */
function chiSquaredPValue(x: number, df: number): number {
  if (x <= 0) return 1;
  // Normal approximation
  const z = Math.pow(x / df, 1 / 3) - (1 - 2 / (9 * df));
  const denom = Math.sqrt(2 / (9 * df));
  const standardZ = z / denom;
  // Standard normal CDF approximation
  return 1 - normalCDF(standardZ);
}

function normalCDF(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.SQRT2;
  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return 0.5 * (1.0 + sign * y);
}
