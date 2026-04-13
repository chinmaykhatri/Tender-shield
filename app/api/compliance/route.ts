import { NextResponse } from 'next/server';
import { createHash } from 'crypto';

// ═══════════════════════════════════════════════════════════════════
// TenderShield — GFR 2017 Compliance API
// Checks tender compliance against General Financial Rules 2017
// ═══════════════════════════════════════════════════════════════════

const GFR_RULES = [
  { rule: 'GFR-149', title: 'Security Deposit for Works', minValue: 1_00_00_000_00, category: 'WORKS', rate: 0.025 },
  { rule: 'GFR-155', title: 'Two-Packet Evaluation', minValue: 25_00_000_00, category: 'CONSULTANCY' },
  { rule: 'GFR-160', title: 'Minimum Bidders', minBidders: 3 },
  { rule: 'GFR-166', title: 'Minimum Notice Period', minDays: 14 },
  { rule: 'GFR-173', title: 'MSME Purchase Preference', minPct: 0.25 },
  { rule: 'GFR-175', title: 'Earnest Money Deposit', minPct: 0.02, maxPct: 0.05 },
  { rule: 'GFR-177', title: 'Performance Security', minPct: 0.05, maxPct: 0.10 },
];

function checkCompliance(tender: Record<string, unknown>, bids: Record<string, unknown>[]) {
  const estimated = (tender.estimated_value_paise as number) || 0;
  const category = (tender.category as string) || 'WORKS';
  const bidCount = bids.length;
  const rules: Record<string, unknown>[] = [];

  // GFR-149: Security Deposit
  if (category === 'WORKS' && estimated >= 1_00_00_000_00) {
    rules.push({
      rule: 'GFR-149', title: 'Security Deposit for Works', status: 'WARNING',
      reason: `Works contract of ₹${(estimated / 1_00_00_00_000).toFixed(1)} Cr requires 2.5% security deposit per GFR 149`,
    });
  } else {
    rules.push({ rule: 'GFR-149', title: 'Security Deposit for Works', status: 'N/A', reason: 'Not applicable for this tender' });
  }

  // GFR-155: Two-Packet
  if (category === 'CONSULTANCY' && estimated >= 25_00_000_00) {
    rules.push({
      rule: 'GFR-155', title: 'Two-Packet Evaluation', status: 'WARNING',
      reason: 'Consultancy above ₹25L requires two-packet (technical + financial) evaluation',
    });
  } else {
    rules.push({ rule: 'GFR-155', title: 'Two-Packet Evaluation', status: 'N/A', reason: 'Not applicable' });
  }

  // GFR-160: Minimum Bidders
  if (bidCount >= 3) {
    rules.push({ rule: 'GFR-160', title: 'Minimum Bidders', status: 'PASS', reason: `${bidCount} bidders — meets minimum 3` });
  } else {
    rules.push({ rule: 'GFR-160', title: 'Minimum Bidders', status: bidCount === 0 ? 'FAIL' : 'WARNING', reason: `Only ${bidCount} bidder(s). GFR recommends minimum 3.` });
  }

  // GFR-166: Notice Period
  const startDate = tender.bid_start_date as string;
  const endDate = tender.bid_end_date as string;
  if (startDate && endDate) {
    const days = Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000);
    if (days >= 14) {
      rules.push({ rule: 'GFR-166', title: 'Minimum Notice Period', status: 'PASS', reason: `${days}-day notice period meets minimum 14 days` });
    } else {
      rules.push({ rule: 'GFR-166', title: 'Minimum Notice Period', status: 'FAIL', reason: `Only ${days}-day notice. GFR 166 requires minimum 14 days.` });
    }
  } else {
    rules.push({ rule: 'GFR-166', title: 'Minimum Notice Period', status: 'WARNING', reason: 'Cannot verify — dates not available' });
  }

  // GFR-173: MSME
  const msmeBids = bids.filter((b: Record<string, unknown>) => b.is_msme);
  const msmeRatio = bids.length > 0 ? msmeBids.length / bids.length : 0;
  if (msmeRatio >= 0.25) {
    rules.push({ rule: 'GFR-173', title: 'MSME Preference', status: 'PASS', reason: `${msmeBids.length}/${bids.length} (${(msmeRatio * 100).toFixed(0)}%) MSME bidders` });
  } else {
    rules.push({ rule: 'GFR-173', title: 'MSME Preference', status: 'WARNING', reason: `${msmeBids.length}/${bids.length} MSME bidders (${(msmeRatio * 100).toFixed(0)}% — target: 25%)` });
  }

  // GFR-175: EMD
  rules.push({ rule: 'GFR-175', title: 'EMD (2-5%)', status: 'WARNING', reason: `EMD should be 2-5% of ₹${(estimated / 1_00_00_00_000).toFixed(1)} Cr = ₹${(estimated * 0.02 / 1_00_00_00_000).toFixed(2)}-${(estimated * 0.05 / 1_00_00_00_000).toFixed(2)} Cr` });

  // GFR-177: Performance Security
  if (['WORKS', 'GOODS'].includes(category)) {
    rules.push({ rule: 'GFR-177', title: 'Performance Security', status: 'WARNING', reason: 'Requires 5-10% performance security for WORKS/GOODS' });
  } else {
    rules.push({ rule: 'GFR-177', title: 'Performance Security', status: 'N/A', reason: 'Not applicable for this category' });
  }

  const passed = rules.filter(r => r.status === 'PASS').length;
  const failed = rules.filter(r => r.status === 'FAIL').length;
  const warnings = rules.filter(r => r.status === 'WARNING').length;
  const score = Math.round(passed / Math.max(passed + failed + warnings, 1) * 100);

  return {
    overall: failed === 0 ? (warnings > 0 ? 'COMPLIANT_WITH_WARNINGS' : 'COMPLIANT') : 'NON_COMPLIANT',
    score,
    rules,
    passed,
    failed,
    warnings,
    hash: createHash('sha256').update(JSON.stringify({ tender, rules, ts: Date.now() })).digest('hex').slice(0, 16),
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { tender, bids = [] } = body;
    if (!tender) return NextResponse.json({ error: 'tender is required' }, { status: 400 });

    const result = checkCompliance(tender, bids);
    return NextResponse.json({ success: true, compliance: result });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    engine: 'GFR_2017',
    version: '1.0.0',
    rules_available: GFR_RULES.map(r => ({ rule: r.rule, title: r.title })),
  });
}
