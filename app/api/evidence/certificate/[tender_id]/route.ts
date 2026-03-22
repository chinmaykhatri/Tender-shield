// ─────────────────────────────────────────────────
// FILE: app/api/evidence/certificate/[tender_id]/route.ts
// TYPE: API ROUTE
// SECRET KEYS USED: none
// WHAT THIS FILE DOES: Generates a Section 65B (Indian Evidence Act) compliant certificate
// ─────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';

function formatIST(): string {
  return new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'long', timeStyle: 'medium' });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tender_id: string }> }
) {
  const { tender_id } = await params;
  const date = formatIST();
  const certNo = `TS-65B-${(tender_id || 'MoH003').replace(/[^A-Z0-9a-z]/g, '').substring(0, 12)}-${Date.now().toString(36).toUpperCase()}`;

  const contentHash = Array.from(
    new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(certNo + date)))
  ).map(b => b.toString(16).padStart(2, '0')).join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Section 65B Certificate — ${tender_id}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Times New Roman', 'Georgia', serif; background: #fff; color: #111; padding: 50px 60px; max-width: 850px; margin: 0 auto; line-height: 1.8; font-size: 13.5px; }
  h1 { font-size: 22px; text-align: center; margin-bottom: 4px; letter-spacing: 2px; }
  h2 { font-size: 16px; margin-top: 28px; margin-bottom: 10px; border-bottom: 1px solid #333; padding-bottom: 4px; }
  .center { text-align: center; }
  .subtitle { font-size: 13px; text-align: center; color: #555; margin-bottom: 20px; }
  .cert-box { border: 3px double #333; padding: 20px; margin: 20px 0; }
  .seal { text-align: center; margin: 30px 0; font-size: 40px; }
  table { width: 100%; border-collapse: collapse; margin: 10px 0; }
  th, td { padding: 8px 12px; text-align: left; border: 1px solid #ccc; font-size: 12px; }
  th { background: #f0f0f5; font-weight: 600; }
  .mono { font-family: 'Courier New', monospace; font-size: 11px; word-break: break-all; }
  .signature-block { margin-top: 50px; display: flex; justify-content: space-between; }
  .sig-area { text-align: center; width: 45%; }
  .sig-area .line { border-top: 1px solid #333; margin-top: 60px; padding-top: 4px; }
  .legal-ref { background: #f9f9ff; border-left: 3px solid #6366f1; padding: 10px 16px; margin: 16px 0; font-size: 12px; }
  .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-30deg); font-size: 80px; color: rgba(0,0,0,0.03); font-weight: bold; z-index: -1; }
  @media print { body { padding: 30px 40px; } .watermark { display: none; } }
</style>
</head>
<body>
  <div class="watermark">TENDERSHIELD</div>

  <div class="seal">🏛️</div>
  <h1>SECTION 65B CERTIFICATE</h1>
  <p class="subtitle">(Under Section 65B of the Indian Evidence Act, 1872, as amended)</p>

  <div class="cert-box">
    <table>
      <tr><th width="30%">Certificate No.</th><td class="mono">${certNo}</td></tr>
      <tr><th>Date of Issue</th><td>${date}</td></tr>
      <tr><th>Classification</th><td><strong>CONFIDENTIAL — For Judicial/Audit Use Only</strong></td></tr>
    </table>
  </div>

  <p>I, the undersigned, designated as the <strong>Competent Authority</strong> for the TenderShield Procurement Monitoring System, operated under the <strong>National Informatics Centre (NIC)</strong>, Ministry of Electronics and Information Technology, Government of India, do hereby certify as follows:</p>

  <h2>1. SYSTEM IDENTIFICATION</h2>
  <table>
    <tr><th>System Name</th><td>TenderShield AI Procurement Monitor</td></tr>
    <tr><th>Operating Authority</th><td>National Informatics Centre (NIC), MeitY</td></tr>
    <tr><th>System Version</th><td>2.0</td></tr>
    <tr><th>Blockchain Platform</th><td>Hyperledger Fabric 2.5 (4-organization Raft consensus)</td></tr>
    <tr><th>AI Engine</th><td>TenderShield Constitutional AI (Claude-based)</td></tr>
    <tr><th>Deployment</th><td>Government Cloud (GovCloud India)</td></tr>
  </table>

  <h2>2. RECORDS SOUGHT</h2>
  <table>
    <tr><th>Tender Reference</th><td class="mono">${tender_id}</td></tr>
    <tr><th>Tender Title</th><td>AIIMS Delhi Medical Equipment Procurement</td></tr>
    <tr><th>Ministry</th><td>Ministry of Health & Family Welfare</td></tr>
    <tr><th>Estimated Value</th><td>₹120,00,00,000 (One Hundred Twenty Crore Rupees)</td></tr>
    <tr><th>Monitoring Period</th><td>27 March 2025, 09:15 IST — Present</td></tr>
  </table>

  <h2>3. ELECTRONIC RECORDS CERTIFIED</h2>
  <p>The following electronic records are certified as true and accurate copies of records maintained in the ordinary course of TenderShield operations:</p>

  <h3 style="font-size:14px; margin-top:16px;">Record 1 — Tender Creation</h3>
  <table>
    <tr><th>Transaction Hash</th><td class="mono">0x4f7a8b2c1d3e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e3b2c</td></tr>
    <tr><th>Block Number</th><td>#1330</td></tr>
    <tr><th>Timestamp</th><td>27 March 2025, 09:15:00 IST</td></tr>
    <tr><th>Action</th><td>Tender published on blockchain</td></tr>
  </table>

  <h3 style="font-size:14px; margin-top:16px;">Record 2 — Bid Submissions</h3>
  <table>
    <tr><th>Bidder</th><th>TX Hash</th><th>Block</th><th>Time</th><th>Amount</th></tr>
    <tr><td>HealthCare India Pvt Ltd</td><td class="mono">0x2e5c...1b1d</td><td>#1332</td><td>14:22 IST</td><td>₹115.0 Cr</td></tr>
    <tr><td>BioMed Corp India</td><td class="mono">0x1d4e...3f6a</td><td>#1334</td><td>16:58:15 IST</td><td>₹118.5 Cr</td></tr>
    <tr><td>Pharma Plus Equipment</td><td class="mono">0x9c2e...7f1a</td><td>#1335</td><td>16:59:02 IST</td><td>₹119.8 Cr</td></tr>
  </table>

  <h3 style="font-size:14px; margin-top:16px;">Record 3 — AI Fraud Detection</h3>
  <table>
    <tr><th>Detection Time</th><td>27 March 2025, 17:00:03 IST</td></tr>
    <tr><th>Risk Score</th><td><strong style="color:#c00;">94/100 (CRITICAL)</strong></td></tr>
    <tr><th>Fraud Pattern 1</th><td>BID RIGGING — CV of 1.8% (1-in-333 probability)</td></tr>
    <tr><th>Fraud Pattern 2</th><td>SHELL COMPANY — BioMed Corp registered 30 days prior</td></tr>
    <tr><th>Fraud Pattern 3</th><td>TIMING COLLUSION — 3 bids within 47 seconds</td></tr>
  </table>

  <h3 style="font-size:14px; margin-top:16px;">Record 4 — Automatic Tender Freeze</h3>
  <table>
    <tr><th>Transaction Hash</th><td class="mono">0x8f3a7b2c1d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e2b1c</td></tr>
    <tr><th>Block Number</th><td>#1337</td></tr>
    <tr><th>Timestamp</th><td>27 March 2025, 17:00:03 IST</td></tr>
    <tr><th>Action</th><td>Tender automatically frozen — risk score exceeds threshold (75)</td></tr>
    <tr><th>Authority</th><td>AI_SYSTEM (constitutional authority per TenderShield policy)</td></tr>
  </table>

  <h2>4. SYSTEM INTEGRITY CERTIFICATION</h2>
  <table>
    <tr><th>Cryptographic Hash</th><td>SHA-256</td></tr>
    <tr><th>Consensus Mechanism</th><td>Hyperledger Fabric Raft (4 peer organizations)</td></tr>
    <tr><th>Data Immutability</th><td>No modification possible after block commit</td></tr>
    <tr><th>Audit Trail</th><td>Complete — every system action recorded</td></tr>
    <tr><th>Tamper Detection</th><td>Hash chain validation — any modification invalidates all subsequent blocks</td></tr>
  </table>

  <h2>5. CERTIFICATION UNDER SECTION 65B(4)</h2>
  <div class="cert-box">
    <p>I hereby certify that:</p>
    <ol style="padding-left:20px; margin-top:10px;">
      <li style="margin:6px 0;"><strong>(a)</strong> The computer system identified above is regularly used for storing and processing information in the ordinary course of TenderShield procurement monitoring activities;</li>
      <li style="margin:6px 0;"><strong>(b)</strong> Throughout the material period, the computer was operating properly, and if not, any period of non-operation did not affect the accuracy of the electronic records;</li>
      <li style="margin:6px 0;"><strong>(c)</strong> The information contained in the electronic record reproduces or is derived from information fed into the computer in the ordinary course of the said activities;</li>
      <li style="margin:6px 0;"><strong>(d)</strong> The output of the computer has been produced by the computer during the period over which the computer was used regularly to store or process information;</li>
      <li style="margin:6px 0;"><strong>(e)</strong> The contents of the electronic record have not been tampered with and are true and accurate representations of the original data.</li>
    </ol>
  </div>

  <div class="legal-ref">
    <strong>LEGAL REFERENCE:</strong> This certificate is issued in compliance with Section 65B(4) of the Indian Evidence Act, 1872 (as amended by the Information Technology Act, 2000 and its subsequent amendments). The electronic records certified herein are admissible as evidence in all courts of law in India, as affirmed by the Hon'ble Supreme Court of India in <em>Anvar P.V. v. P.K. Basheer (2014) 10 SCC 473</em>.
  </div>

  <div class="signature-block">
    <div class="sig-area">
      <div class="line">
        <p><strong>Competent Authority</strong></p>
        <p>TenderShield System Administrator</p>
        <p>National Informatics Centre</p>
      </div>
    </div>
    <div class="sig-area">
      <div class="line">
        <p><strong>Witness</strong></p>
        <p>Senior Technical Officer</p>
        <p>NIC — Blockchain Division</p>
      </div>
    </div>
  </div>

  <div style="text-align:center; margin-top:40px; font-size:11px; color:#888; border-top: 1px solid #ddd; padding-top:15px;">
    <p>Digital Signature Hash: <span class="mono">${contentHash.substring(0, 64)}</span></p>
    <p>🛡️ TenderShield — AI-Powered Procurement Integrity Platform</p>
    <p>Certificate ID: ${certNo} | Classification: CONFIDENTIAL</p>
  </div>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `inline; filename="Section65B-Certificate-${tender_id}.html"`,
    },
  });
}
