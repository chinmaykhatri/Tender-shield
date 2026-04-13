import { NextResponse } from 'next/server';
import { createHash } from 'crypto';

/* ═══════════════════════════════════════════════════════════
 * TenderShield — Live Fraud Detection Playground API
 * Runs REAL fraud analysis on pre-built or custom scenarios
 * PUBLIC — no auth required (this is the proof we're not a wrapper)
 * ═══════════════════════════════════════════════════════════ */

interface PlaygroundBid {
  revealed_amount_paise: number;
  bidder_did: string;
  submitted_minutes_before_deadline?: number;
  is_msme?: boolean;
  incorporation_months?: number;
  employee_count?: number;
}

interface Scenario {
  id: string;
  name: string;
  description: string;
  tender: Record<string, unknown>;
  bids: PlaygroundBid[];
  expected_verdict: string;
}

const SCENARIOS: Scenario[] = [
  {
    id: 'bid-rigging',
    name: 'Bid Rigging — Highway Construction',
    description: '5 bidders submit suspiciously similar amounts for a ₹450 Cr highway project. CV = 0.034.',
    tender: { tender_id: 'DEMO-MoRTH-2025-001', ministry_code: 'MoRTH', estimated_value_paise: 4500000000000, category: 'WORKS' },
    bids: [
      { revealed_amount_paise: 4320000000000, bidder_did: 'BID-A', submitted_minutes_before_deadline: 15 },
      { revealed_amount_paise: 4325000000000, bidder_did: 'BID-B', submitted_minutes_before_deadline: 12 },
      { revealed_amount_paise: 4330000000000, bidder_did: 'BID-C', submitted_minutes_before_deadline: 8 },
      { revealed_amount_paise: 4335000000000, bidder_did: 'BID-D', submitted_minutes_before_deadline: 5 },
      { revealed_amount_paise: 4340000000000, bidder_did: 'BID-E', submitted_minutes_before_deadline: 3 },
    ],
    expected_verdict: 'HIGH_RISK',
  },
  {
    id: 'shell-company',
    name: 'Shell Company Network — Medical Supplies',
    description: 'Two newly incorporated companies with 3-4 employees. Legitimate firms have been in business for years.',
    tender: { tender_id: 'DEMO-MoH-2025-001', ministry_code: 'MoH', estimated_value_paise: 120000000000, category: 'GOODS' },
    bids: [
      { revealed_amount_paise: 115000000000, bidder_did: 'SHELL-A', submitted_minutes_before_deadline: 5, incorporation_months: 3, employee_count: 4 },
      { revealed_amount_paise: 118000000000, bidder_did: 'SHELL-B', submitted_minutes_before_deadline: 4, incorporation_months: 2, employee_count: 3 },
      { revealed_amount_paise: 105000000000, bidder_did: 'LEGIT-C', submitted_minutes_before_deadline: 4320, incorporation_months: 96, employee_count: 450 },
      { revealed_amount_paise: 108000000000, bidder_did: 'LEGIT-D', submitted_minutes_before_deadline: 2880, incorporation_months: 240, employee_count: 1200 },
    ],
    expected_verdict: 'MEDIUM_RISK',
  },
  {
    id: 'clean-tender',
    name: 'Clean Tender — IT Services',
    description: 'Normal competitive bidding with diverse amounts and natural submission timing.',
    tender: { tender_id: 'DEMO-MoIT-2025-001', ministry_code: 'MoIT', estimated_value_paise: 50000000000, category: 'SERVICES' },
    bids: [
      { revealed_amount_paise: 42000000000, bidder_did: 'TECH-A', submitted_minutes_before_deadline: 10080 },
      { revealed_amount_paise: 48500000000, bidder_did: 'TECH-B', submitted_minutes_before_deadline: 7200 },
      { revealed_amount_paise: 44200000000, bidder_did: 'TECH-C', submitted_minutes_before_deadline: 4320 },
      { revealed_amount_paise: 39800000000, bidder_did: 'TECH-D', submitted_minutes_before_deadline: 2160 },
      { revealed_amount_paise: 51000000000, bidder_did: 'TECH-E', submitted_minutes_before_deadline: 1440 },
      { revealed_amount_paise: 46700000000, bidder_did: 'TECH-F', submitted_minutes_before_deadline: 720 },
    ],
    expected_verdict: 'LOW_RISK',
  },
  {
    id: 'timing-anomaly',
    name: 'Timing Anomaly — Defence Procurement',
    description: 'All 6 bids arrive within 8 minutes of deadline in suspiciously regular intervals.',
    tender: { tender_id: 'DEMO-MoD-2025-001', ministry_code: 'MoD', estimated_value_paise: 200000000000, category: 'GOODS' },
    bids: [
      { revealed_amount_paise: 188000000000, bidder_did: 'DEF-A', submitted_minutes_before_deadline: 7.5 },
      { revealed_amount_paise: 192000000000, bidder_did: 'DEF-B', submitted_minutes_before_deadline: 6.2 },
      { revealed_amount_paise: 195000000000, bidder_did: 'DEF-C', submitted_minutes_before_deadline: 4.8 },
      { revealed_amount_paise: 197000000000, bidder_did: 'DEF-D', submitted_minutes_before_deadline: 3.5 },
      { revealed_amount_paise: 199000000000, bidder_did: 'DEF-E', submitted_minutes_before_deadline: 2.1 },
      { revealed_amount_paise: 210000000000, bidder_did: 'DEF-F', submitted_minutes_before_deadline: 0.8 },
    ],
    expected_verdict: 'HIGH_RISK',
  },
  {
    id: 'boundary-gaming',
    name: 'Boundary Gaming — Railway Contract',
    description: 'Bids engineered with perfectly uniform spacing and no round numbers — calculated to appear legitimate.',
    tender: { tender_id: 'DEMO-MoR-2025-001', ministry_code: 'MoR', estimated_value_paise: 300000000000, category: 'WORKS' },
    bids: [
      { revealed_amount_paise: 280100000000, bidder_did: 'RAIL-A', submitted_minutes_before_deadline: 1440 },
      { revealed_amount_paise: 297050000000, bidder_did: 'RAIL-B', submitted_minutes_before_deadline: 1380 },
      { revealed_amount_paise: 314000000000, bidder_did: 'RAIL-C', submitted_minutes_before_deadline: 1320 },
      { revealed_amount_paise: 330950000000, bidder_did: 'RAIL-D', submitted_minutes_before_deadline: 1260 },
      { revealed_amount_paise: 347900000000, bidder_did: 'RAIL-E', submitted_minutes_before_deadline: 1200 },
    ],
    expected_verdict: 'MEDIUM_RISK',
  },
];

function runAnalysis(tender: Record<string, unknown>, bids: PlaygroundBid[]) {
  const amounts = bids.map(b => b.revealed_amount_paise).filter(Boolean);
  if (amounts.length < 2) return { risk_score: 0, detectors: {}, stats: {} };

  const n = amounts.length;
  const mean = amounts.reduce((a, b) => a + b, 0) / n;
  const variance = amounts.reduce((a, b) => a + (b - mean) ** 2, 0) / n;
  const stdDev = Math.sqrt(variance);
  const cv = mean > 0 ? stdDev / mean : 0;
  const estimate = (tender.estimated_value_paise as number) || mean;

  // ── Dynamic CV Threshold (HMAC simulation in JS) ──
  const tenderId = (tender.tender_id as string) || 'unknown';
  const thresholdHash = createHash('sha256').update(`tendershield-cv-${tenderId}`).digest();
  const thresholdRatio = thresholdHash.readUInt32BE(0) / (2 ** 32);
  const cvThreshold = 0.02 + thresholdRatio * 0.03; // [0.02, 0.05]

  // Detector 1: Bid Rigging (CV)
  const bidRiggingScore = cv < cvThreshold ? 65 : cv < 0.08 ? 20 : 0;
  const bidRiggingFlags: string[] = [];
  if (cv < cvThreshold) bidRiggingFlags.push(`LOW_BID_VARIANCE: CV=${cv.toFixed(4)} < threshold ${cvThreshold.toFixed(4)} (DYNAMIC_HMAC)`);

  // Detector 2: Timing Anomaly
  const timings = bids.map(b => b.submitted_minutes_before_deadline || 999);
  const nearDeadline = timings.filter(t => t <= 30).length;
  const timingScore = (nearDeadline / n) > 0.7 ? 55 : (nearDeadline / n) > 0.4 ? 30 : 0;
  const timingFlags: string[] = [];
  if (timingScore >= 55) timingFlags.push(`LAST_MINUTE_BURST: ${nearDeadline}/${n} bids within 30 minutes of deadline`);

  // Detector 3: Cover Bid Detection
  const zScores = amounts.map(a => stdDev > 0 ? (a - mean) / stdDev : 0);
  const coverBids = zScores.filter(z => z > 2.0).length;
  const coverScore = coverBids > 0 ? 40 : 0;
  const coverFlags: string[] = [];
  if (coverBids) coverFlags.push(`COVER_BID_DETECTED: ${coverBids} bid(s) with Z-score > 2.0 — likely inflated to guarantee loss`);

  // Detector 4: Gap Uniformity (Anti-Gaming)
  const sorted = [...amounts].sort((a, b) => a - b);
  const gaps = sorted.slice(1).map((a, i) => a - sorted[i]);
  const meanGap = gaps.length > 0 ? gaps.reduce((a, b) => a + b, 0) / gaps.length : 0;
  const gapVariance = gaps.length > 1 ? gaps.reduce((a, b) => a + (b - meanGap) ** 2, 0) / gaps.length : 0;
  const gapCv = meanGap > 0 ? Math.sqrt(gapVariance) / meanGap : 0;
  const gapScore = gapCv < 0.15 && gaps.length >= 2 ? 35 : 0;
  const gapFlags: string[] = [];
  if (gapScore) gapFlags.push(`CALCULATED_SPACING: Gap CV=${gapCv.toFixed(4)} — unnaturally uniform bid intervals`);

  // Detector 5: Boundary Gaming
  const distFromThreshold = cvThreshold > 0 ? (cv - cvThreshold) / cvThreshold : 0;
  const gamingScore = (distFromThreshold > 0.05 && distFromThreshold < 0.20) ? 30 : 0;
  const gamingFlags: string[] = [];
  if (gamingScore) gamingFlags.push(`THRESHOLD_GAMING: CV is ${(distFromThreshold * 100).toFixed(1)}% above detection boundary — suspiciously precise`);

  // Detector 6: Benford's Law
  const leadDigits = amounts.map(a => parseInt(String(a)[0]));
  const benfordExpected = [0, 0.301, 0.176, 0.125, 0.097, 0.079, 0.067, 0.058, 0.051, 0.046];
  const digitCounts = new Array(10).fill(0);
  leadDigits.forEach(d => { if (d >= 1) digitCounts[d]++; });
  let chiSquare = 0;
  for (let d = 1; d <= 9; d++) {
    const observed = digitCounts[d] / n;
    chiSquare += ((observed - benfordExpected[d]) ** 2) / benfordExpected[d];
  }
  const benfordScore = chiSquare > 0.3 ? 20 : 0;
  const benfordFlags: string[] = [];
  if (benfordScore) benfordFlags.push(`BENFORD_DEVIATION: Chi-square=${chiSquare.toFixed(3)} — leading digit distribution deviates from natural`);

  // Composite
  const composite = Math.min(100, Math.round(
    bidRiggingScore * 0.30 + timingScore * 0.15 + coverScore * 0.15 +
    gapScore * 0.15 + gamingScore * 0.15 + benfordScore * 0.10
  ));

  const allFlags = [...bidRiggingFlags, ...timingFlags, ...coverFlags, ...gapFlags, ...gamingFlags, ...benfordFlags];

  return {
    risk_score: composite,
    recommended_action: composite >= 76 ? 'ESCALATE_CAG' : composite >= 51 ? 'FREEZE' : composite >= 26 ? 'FLAG' : 'MONITOR',
    threshold_mode: 'DYNAMIC_HMAC',
    flags: allFlags,
    detectors: {
      BID_RIGGING: { risk_score: bidRiggingScore, cv: parseFloat(cv.toFixed(4)), threshold: parseFloat(cvThreshold.toFixed(4)), threshold_mode: 'DYNAMIC_HMAC', flags: bidRiggingFlags },
      TIMING_ANOMALY: { risk_score: timingScore, near_deadline_pct: parseFloat((nearDeadline / n * 100).toFixed(1)), flags: timingFlags },
      COVER_BIDS: { risk_score: coverScore, count: coverBids, flags: coverFlags },
      GAP_UNIFORMITY: { risk_score: gapScore, gap_cv: parseFloat(gapCv.toFixed(4)), flags: gapFlags },
      BOUNDARY_GAMING: { risk_score: gamingScore, distance_ratio: parseFloat(distFromThreshold.toFixed(4)), flags: gamingFlags },
      BENFORDS_LAW: { risk_score: benfordScore, chi_square: parseFloat(chiSquare.toFixed(3)), flags: benfordFlags },
    },
    stats: {
      bid_count: n,
      cv: parseFloat(cv.toFixed(4)),
      mean_cr: parseFloat((mean / 1_00_00_00_000).toFixed(2)),
      std_dev_cr: parseFloat((stdDev / 1_00_00_00_000).toFixed(2)),
      estimated_cr: parseFloat((estimate / 1_00_00_00_000).toFixed(2)),
      min_ratio: parseFloat((Math.min(...amounts) / estimate).toFixed(4)),
      max_ratio: parseFloat((Math.max(...amounts) / estimate).toFixed(4)),
    },
    audit_hash: createHash('sha256').update(JSON.stringify({ tender, bids, ts: Date.now() })).digest('hex'),
  };
}

export async function GET() {
  return NextResponse.json({
    success: true,
    scenarios: SCENARIOS.map(s => ({
      id: s.id, name: s.name, description: s.description,
      bid_count: s.bids.length,
      estimated_value_cr: ((s.tender.estimated_value_paise as number) / 1_00_00_00_000).toFixed(0),
      expected_verdict: s.expected_verdict,
    })),
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { scenario_id, custom_bids } = body;

    let tender: Record<string, unknown>, bids: PlaygroundBid[];

    if (scenario_id) {
      const scenario = SCENARIOS.find(s => s.id === scenario_id);
      if (!scenario) return NextResponse.json({ error: `Unknown scenario: ${scenario_id}` }, { status: 400 });
      tender = scenario.tender;
      bids = scenario.bids;
    } else if (custom_bids) {
      tender = body.tender || { tender_id: 'CUSTOM-001', ministry_code: 'GEN', estimated_value_paise: 100000000000, category: 'WORKS' };
      bids = custom_bids;
    } else {
      return NextResponse.json({ error: 'Provide scenario_id or custom_bids' }, { status: 400 });
    }

    // Try Python backend first for full AI analysis
    const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || '';
    if (BACKEND_URL) {
      try {
        const res = await fetch(`${BACKEND_URL}/api/v1/analyze/tender`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tender, bids }),
          signal: AbortSignal.timeout(15000),
        });
        if (res.ok) {
          const data = await res.json();
          return NextResponse.json({ success: true, source: 'AI_ENGINE', tender_id: tender.tender_id, ...data });
        }
      } catch {}
    }

    // Local JS analysis fallback
    const result = runAnalysis(tender, bids);
    return NextResponse.json({ success: true, source: 'LOCAL_ANALYSIS', tender_id: tender.tender_id, ...result });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
