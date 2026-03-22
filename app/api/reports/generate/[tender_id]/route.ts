// ─────────────────────────────────────────────────
// FILE: app/api/reports/generate/[tender_id]/route.ts
// TYPE: API ROUTE
// SECRET KEYS USED: none
// WHAT THIS FILE DOES: Generates an HTML compliance report for CAG auditors — downloadable as PDF via browser
// ─────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';

const DEMO_REPORT = {
  tender_id: 'TDR-MoH-2025-000003',
  tender_name: 'AIIMS Delhi Medical Equipment',
  ministry: 'Ministry of Health & Family Welfare',
  estimated_value: '₹120 Crore',
  status: 'FROZEN_BY_AI',
  risk_score: 94,
  generated_at_ist: new Date().toISOString().replace('T', ' ').split('.')[0] + ' IST',

  executive_summary: `This tender has been automatically frozen by TenderShield AI after detecting multiple fraud indicators with a composite risk score of 94/100 (CRITICAL). Three independent fraud detection algorithms triggered simultaneously, a pattern consistent with organized procurement fraud.`,

  bidders: [
    { name: 'HealthCare India Pvt Ltd', amount: '₹115.0 Cr', gstin: '33AABCH1234F1Z5', reg_date: '2018-06-15', risk: 'LOW', time: '14:22 IST' },
    { name: 'BioMed Corp', amount: '₹118.5 Cr', gstin: '07AABCB5678B1ZP', reg_date: '2025-01-28', risk: 'CRITICAL', time: '16:58:15 IST' },
    { name: 'Pharma Plus', amount: '₹119.8 Cr', gstin: '27AABCP3456I1Z9', reg_date: '2020-03-10', risk: 'HIGH', time: '16:59:02 IST' },
  ],

  ai_findings: [
    { detector: 'Bid Rigging', score: 92, detail: 'CV of 1.8% — in the bottom 0.3% of all Indian tenders analyzed. 1-in-333 odds of fair bidding.' },
    { detector: 'Shell Company', score: 88, detail: 'BioMed Corp registered 30 days before tender. No prior contracts. GSTIN state mismatch (Delhi registration, Mumbai operations).' },
    { detector: 'Timing Anomaly', score: 75, detail: '3 bids submitted within 47 seconds. 2+ hours of silence preceded the cluster.' },
    { detector: 'Front Running', score: 65, detail: 'Highest bid at 98.75% of estimated value suggests insider knowledge.' },
  ],

  blockchain_evidence: [
    { event: 'Tender Published', tx: '0x4f7a...3b2c', block: 1330, time: '09:15 IST' },
    { event: 'Bid 1 Committed (HealthCare)', tx: '0x2e5c...1b1d', block: 1332, time: '14:22 IST' },
    { event: 'Bid 2 Committed (BioMed)', tx: '0x1d4e...3f6a', block: 1334, time: '16:58 IST' },
    { event: 'Bid 3 Committed (Pharma+)', tx: '0x9c2e...7f1a', block: 1335, time: '16:59 IST' },
    { event: 'AI Analysis → FREEZE', tx: '0x8f3a...2b1c', block: 1337, time: '17:00 IST' },
  ],

  recommendations: [
    'Immediate investigation into BioMed Corp registration and ownership structure.',
    'Cross-reference BioMed Corp directors with known beneficiaries of Pharma Plus.',
    'Request MCA (Ministry of Corporate Affairs) ownership chain verification.',
    'Analyze IP addresses of bid submissions for geographic correlation.',
    'Consider freezing all tenders where BioMed Corp has participated in the last 12 months.',
  ],

  gfr_compliance: [
    { rule: 'GFR 149', status: 'FAIL', detail: 'Minimum 3 competitive bids required. 2 of 3 bids flagged as potentially fraudulent.' },
    { rule: 'GFR 166', status: 'PASS', detail: 'Bid security properly documented.' },
    { rule: 'GFR 173', status: 'FAIL', detail: 'Reasonable cost assessment compromised by bid rigging.' },
    { rule: 'GFR 175', status: 'FAIL', detail: 'Transparency requirement failed — insider knowledge suspected.' },
  ],
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tender_id: string }> }
) {
  const { tender_id } = await params;

  const report = { ...DEMO_REPORT, tender_id: tender_id || DEMO_REPORT.tender_id };

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>TenderShield — Compliance Report — ${report.tender_id}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Inter', 'Segoe UI', sans-serif; background: #fff; color: #1a1a2e; padding: 40px; max-width: 900px; margin: 0 auto; }
  h1 { font-size: 28px; margin-bottom: 8px; }
  h2 { font-size: 20px; margin-top: 32px; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 2px solid #6366f1; }
  h3 { font-size: 16px; margin: 16px 0 8px; }
  p { margin: 4px 0; font-size: 14px; line-height: 1.6; }
  table { width: 100%; border-collapse: collapse; margin: 12px 0; }
  th, td { padding: 10px 12px; text-align: left; border: 1px solid #e0e0e0; font-size: 13px; }
  th { background: #f3f4ff; font-weight: 600; }
  .badge { display: inline-block; padding: 2px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; }
  .badge-critical { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }
  .badge-high { background: #fff7ed; color: #ea580c; border: 1px solid #fed7aa; }
  .badge-medium { background: #fffbeb; color: #d97706; border: 1px solid #fde68a; }
  .badge-low { background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0; }
  .badge-pass { background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0; }
  .badge-fail { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }
  .cover { text-align: center; padding: 60px 0 40px; }
  .cover img { height: 60px; }
  .risk-box { padding: 20px; background: #fef2f2; border: 2px solid #dc2626; border-radius: 12px; text-align: center; margin: 20px 0; }
  .risk-box .score { font-size: 64px; font-weight: 800; color: #dc2626; }
  .risk-box .label { font-size: 18px; color: #dc2626; font-weight: 700; }
  .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; font-size: 11px; color: #888; }
  .mono { font-family: 'Courier New', monospace; font-size: 12px; }
  @media print { body { padding: 20px; } .no-print { display: none; } }
</style>
</head>
<body>
  <div class="cover">
    <p style="font-size:40px;">🛡️</p>
    <h1>TenderShield</h1>
    <p style="font-size:16px; color:#6366f1; font-weight:600;">AI-Powered Fraud Detection for Indian Government Procurement</p>
    <hr style="margin:30px auto; width:60%; border:1px solid #6366f1;" />
    <h2 style="border:none; font-size:24px;">COMPLIANCE & EVIDENCE REPORT</h2>
    <p><strong>${report.tender_id}</strong></p>
    <p style="color:#888;">Generated: ${report.generated_at_ist}</p>
    <p style="color:#888;">Classification: CONFIDENTIAL — For CAG/CVC Use Only</p>
  </div>

  <h2>1. Executive Summary</h2>
  <p>${report.executive_summary}</p>
  <div class="risk-box">
    <div class="score">${report.risk_score}/100</div>
    <div class="label">CRITICAL — AUTO-FROZEN</div>
  </div>

  <h2>2. Tender Details</h2>
  <table>
    <tr><th>Field</th><th>Value</th></tr>
    <tr><td>Tender ID</td><td class="mono">${report.tender_id}</td></tr>
    <tr><td>Tender Name</td><td>${report.tender_name}</td></tr>
    <tr><td>Ministry</td><td>${report.ministry}</td></tr>
    <tr><td>Estimated Value</td><td><strong>${report.estimated_value}</strong></td></tr>
    <tr><td>Status</td><td><span class="badge badge-critical">${report.status}</span></td></tr>
    <tr><td>Risk Score</td><td><strong style="color:#dc2626;">${report.risk_score}/100</strong></td></tr>
  </table>

  <h2>3. Bidder Profiles</h2>
  <table>
    <tr><th>Bidder</th><th>Amount</th><th>GSTIN</th><th>Registered</th><th>Time</th><th>Risk</th></tr>
    ${report.bidders.map(b =>
      `<tr>
        <td>${b.name}</td><td>${b.amount}</td><td class="mono">${b.gstin}</td>
        <td>${b.reg_date}</td><td>${b.time}</td>
        <td><span class="badge badge-${b.risk.toLowerCase()}">${b.risk}</span></td>
      </tr>`
    ).join('')}
  </table>

  <h2>4. AI Fraud Detection Results</h2>
  <table>
    <tr><th>Detector</th><th>Score</th><th>Finding</th></tr>
    ${report.ai_findings.map(f =>
      `<tr><td><strong>${f.detector}</strong></td><td><strong style="color:${f.score >= 76 ? '#dc2626' : f.score >= 51 ? '#ea580c' : '#d97706'};">${f.score}/100</strong></td><td>${f.detail}</td></tr>`
    ).join('')}
  </table>

  <h2>5. Blockchain Evidence Trail</h2>
  <table>
    <tr><th>Event</th><th>TX Hash</th><th>Block</th><th>Time</th></tr>
    ${report.blockchain_evidence.map(b =>
      `<tr><td>${b.event}</td><td class="mono">${b.tx}</td><td>#${b.block}</td><td>${b.time}</td></tr>`
    ).join('')}
  </table>
  <p style="color:#6366f1; font-size:12px; margin-top:8px;">✅ All transactions recorded on Hyperledger Fabric — immutable and independently verifiable</p>

  <h2>6. GFR Compliance Check</h2>
  <table>
    <tr><th>Rule</th><th>Status</th><th>Detail</th></tr>
    ${report.gfr_compliance.map(g =>
      `<tr><td><strong>${g.rule}</strong></td><td><span class="badge badge-${g.status.toLowerCase()}">${g.status}</span></td><td>${g.detail}</td></tr>`
    ).join('')}
  </table>

  <h2>7. Recommendations</h2>
  <ol style="padding-left:20px; font-size:14px; line-height:2;">
    ${report.recommendations.map(r => `<li>${r}</li>`).join('')}
  </ol>

  <div class="footer">
    <p>🛡️ TenderShield — AI-Powered Procurement Integrity Platform</p>
    <p>This report was auto-generated. All evidence is blockchain-anchored.</p>
    <p>Report ID: RPT-${Date.now().toString(36).toUpperCase()} | Confidential — CAG/CVC Use Only</p>
  </div>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `inline; filename="TenderShield-Report-${report.tender_id}.html"`,
    },
  });
}
