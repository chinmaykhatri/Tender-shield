import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

// ═══════════════════════════════════════════════════════════
// RTI-Ready Tender Report Generator
// Generates HTML report compliant with RTI Act Section 4
// ═══════════════════════════════════════════════════════════

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: { tender_id: string } }) {
  try {
    const tenderId = params.tender_id;
    const sb = getSupabaseAdmin();

    // Fetch tender
    const { data: tender } = await sb
      .from('tenders')
      .select('*')
      .eq('id', tenderId)
      .single();

    if (!tender) {
      return NextResponse.json({ error: 'Tender not found' }, { status: 404 });
    }

    // Fetch bids
    const { data: bids } = await sb
      .from('bids')
      .select('*')
      .eq('tender_id', tenderId)
      .order('amount', { ascending: true });

    // Fetch audit trail
    const { data: events } = await sb
      .from('audit_events')
      .select('*')
      .eq('tender_id', tenderId)
      .order('timestamp_ist', { ascending: true });

    const reportDate = new Date().toLocaleDateString('en-IN', {
      day: '2-digit', month: 'long', year: 'numeric',
    });

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>RTI Report — ${tender.title || tenderId}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', sans-serif; color: #1a1a1a; max-width: 800px; margin: 0 auto; padding: 40px 30px; }
    .header { text-align: center; border-bottom: 3px solid #003f88; padding-bottom: 20px; margin-bottom: 30px; }
    .tricolor { height: 6px; background: linear-gradient(90deg, #FF9933 33%, #fff 33% 66%, #138808 66%); margin-bottom: 20px; }
    h1 { font-size: 22px; color: #003f88; }
    h2 { font-size: 16px; color: #003f88; margin: 24px 0 12px; border-left: 4px solid #FF9933; padding-left: 10px; }
    .meta { font-size: 12px; color: #666; margin-top: 8px; }
    table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 13px; }
    th, td { border: 1px solid #ddd; padding: 8px 10px; text-align: left; }
    th { background: #f5f5f5; font-weight: 600; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
    .badge-green { background: #dcfce7; color: #166534; }
    .badge-red { background: #fecaca; color: #991b1b; }
    .badge-yellow { background: #fef3c7; color: #92400e; }
    .footer { margin-top: 40px; border-top: 2px solid #003f88; padding-top: 16px; font-size: 11px; color: #666; text-align: center; }
    .section { margin-bottom: 24px; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <div class="tricolor"></div>
  <div class="header">
    <h1>🛡️ TenderShield — RTI Act Section 4 Compliance Report</h1>
    <p class="meta">Generated: ${reportDate} | System: TenderShield v1.0 | Report ID: RTI-${Date.now()}</p>
  </div>

  <div class="section">
    <h2>1. Tender Details</h2>
    <table>
      <tr><th>Field</th><th>Value</th></tr>
      <tr><td>Tender ID</td><td>${tender.id}</td></tr>
      <tr><td>Title</td><td>${tender.title || 'N/A'}</td></tr>
      <tr><td>Status</td><td><span class="badge ${tender.status === 'AWARDED' ? 'badge-green' : tender.status === 'FROZEN' ? 'badge-red' : 'badge-yellow'}">${tender.status}</span></td></tr>
      <tr><td>Ministry</td><td>${tender.ministry_code || 'N/A'}</td></tr>
      <tr><td>Estimated Value</td><td>₹${Number(tender.estimated_value || 0).toLocaleString('en-IN')}</td></tr>
      <tr><td>Risk Score</td><td>${tender.risk_score || 'Not assessed'}</td></tr>
      <tr><td>Created</td><td>${tender.created_at ? new Date(tender.created_at).toLocaleDateString('en-IN') : 'N/A'}</td></tr>
    </table>
  </div>

  <div class="section">
    <h2>2. Bid History (${bids?.length || 0} bids received)</h2>
    ${bids?.length ? `
    <table>
      <tr><th>#</th><th>Bidder</th><th>Amount</th><th>Status</th><th>Submitted</th></tr>
      ${bids.map((b: any, i: number) => `
      <tr>
        <td>${i + 1}</td>
        <td>${b.bidder_name || 'Anonymous'}</td>
        <td>₹${Number(b.amount || 0).toLocaleString('en-IN')}</td>
        <td><span class="badge ${b.flagged ? 'badge-red' : 'badge-green'}">${b.flagged ? '🚩 Flagged' : '✅ Clean'}</span></td>
        <td>${b.created_at ? new Date(b.created_at).toLocaleDateString('en-IN') : 'N/A'}</td>
      </tr>`).join('')}
    </table>` : '<p>No bids received.</p>'}
  </div>

  <div class="section">
    <h2>3. Audit Trail (${events?.length || 0} events)</h2>
    ${events?.length ? `
    <table>
      <tr><th>Timestamp</th><th>Action</th><th>Severity</th><th>Details</th></tr>
      ${events.map((e: any) => `
      <tr>
        <td>${e.timestamp_ist ? new Date(e.timestamp_ist).toLocaleString('en-IN') : 'N/A'}</td>
        <td>${e.action_type || 'N/A'}</td>
        <td><span class="badge ${e.severity === 'CRITICAL' ? 'badge-red' : e.severity === 'HIGH' ? 'badge-yellow' : 'badge-green'}">${e.severity || 'INFO'}</span></td>
        <td>${(e.details || '').slice(0, 120)}</td>
      </tr>`).join('')}
    </table>` : '<p>No audit events recorded.</p>'}
  </div>

  <div class="section">
    <h2>4. Blockchain Integrity</h2>
    <table>
      <tr><th>Property</th><th>Value</th></tr>
      <tr><td>Hash Algorithm</td><td>SHA-256</td></tr>
      <tr><td>Chain Type</td><td>Merkle Hash Chain</td></tr>
      <tr><td>Immutability</td><td>Write-once audit log with hash chaining</td></tr>
      <tr><td>Verification URL</td><td>https://tendershield.vercel.app/verify?tender=${tender.id}</td></tr>
    </table>
  </div>

  <div class="footer">
    <p>This report is generated in compliance with the Right to Information Act, 2005 — Section 4(1)(b)</p>
    <p>All data sourced from TenderShield's immutable audit trail backed by SHA-256 hash chain verification</p>
    <p style="margin-top: 8px">🛡️ TenderShield — AI-Secured Government Procurement</p>
  </div>
</body>
</html>`;

    return new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `inline; filename="RTI-Report-${tenderId}.html"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
