/**
 * CAG Auditor — Full Audit Trail API
 * DUAL MODE: Real Supabase → Demo fallback
 * Access: CAG_AUDITOR / NIC_ADMIN only
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

const DEMO_AUDIT_TRAIL = [
  { id:'AUD-001', timestamp_ist:'15 Mar 2025, 17:00:03 IST', actor_email:'ai.system@tendershield.gov', actor_role:'AI_SYSTEM', actor_name:'TenderShield AI', action_type:'TENDER_AUTO_FROZEN', tender_id:'TDR-MoH-2025-000003', tender_title:'AIIMS Delhi Medical Equipment', ministry:'MoH', details:'Risk score 94/100 — shell company + bid rigging detected. Auto-freeze triggered.', risk_score:94, blockchain_tx:'0x2e5c8b1d4a7f3c9e1b5d8a2f4e7c0b3d6a9e2c5b8f1d4a7', ip_address:null, severity:'CRITICAL' },
  { id:'AUD-002', timestamp_ist:'15 Mar 2025, 16:59:02 IST', actor_email:'admin@pharmaplus.com', actor_role:'BIDDER', actor_name:'Pharma Plus Equipment', action_type:'BID_COMMITTED', tender_id:'TDR-MoH-2025-000003', tender_title:'AIIMS Delhi Medical Equipment', ministry:'MoH', details:'Sealed bid committed: ₹120.1 Cr (47 sec after previous bid — timing suspicious)', risk_score:45, blockchain_tx:'0x9c2e7f1a5b3d8e4c2a6f9b1d4e7c0a3f6b9e8d1c4a7f2', ip_address:'103.X.X.X', severity:'HIGH' },
  { id:'AUD-003', timestamp_ist:'15 Mar 2025, 16:58:41 IST', actor_email:'admin@biomedicorp.com', actor_role:'BIDDER', actor_name:'BioMed Corp India', action_type:'BID_COMMITTED', tender_id:'TDR-MoH-2025-000003', tender_title:'AIIMS Delhi Medical Equipment', ministry:'MoH', details:'Sealed bid committed: ₹119.8 Cr. PAN sharing detected with Pharma Plus.', risk_score:40, blockchain_tx:'0x4f7a3b2c1d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2', ip_address:'103.X.X.X', severity:'MEDIUM' },
  { id:'AUD-004', timestamp_ist:'15 Mar 2025, 14:22:15 IST', actor_email:'officer@moh.gov.in', actor_role:'MINISTRY_OFFICER', actor_name:'Rajesh Kumar Sharma', action_type:'TENDER_PUBLISHED', tender_id:'TDR-MoH-2025-000003', tender_title:'AIIMS Delhi Medical Equipment', ministry:'MoH', details:'Tender published — ₹120 Cr, deadline 21 days, category: GOODS', risk_score:0, blockchain_tx:'0x1d4e3f6a9b2c5e8f1a4d7c0b3e6a9f2c5b8e1d4a7f3c6', ip_address:'192.168.X.X', severity:'INFO' },
  { id:'AUD-005', timestamp_ist:'14 Mar 2025, 11:45:22 IST', actor_email:'ai.system@tendershield.gov', actor_role:'AI_SYSTEM', actor_name:'TenderShield AI', action_type:'AI_ANALYSIS', tender_id:'TDR-MoD-2025-000004', tender_title:'Border Roads Medical Supply', ministry:'MoD', details:'Timing collusion detected — 3 bids within 90 seconds. CV=2.1%. Benford χ²=14.2.', risk_score:72, blockchain_tx:'0x7b3e1d4a9c2f5e8b1d4a7f3c6e9b2d5a8f1c4b7e0d3a6', ip_address:null, severity:'HIGH' },
  { id:'AUD-006', timestamp_ist:'14 Mar 2025, 10:30:00 IST', actor_email:'bidder@defencesupply.in', actor_role:'BIDDER', actor_name:'Defence Supply Corp', action_type:'BID_COMMITTED', tender_id:'TDR-MoD-2025-000004', tender_title:'Border Roads Medical Supply', ministry:'MoD', details:'Sealed bid committed: ₹61.5 Cr.', risk_score:15, blockchain_tx:'0x5a8f1c4b7e0d3a6f9c2e5b8d1a4f7c0b3e6a9d2c5b8f1', ip_address:'14.X.X.X', severity:'INFO' },
  { id:'AUD-007', timestamp_ist:'14 Mar 2025, 09:15:33 IST', actor_email:'officer@mod.gov.in', actor_role:'MINISTRY_OFFICER', actor_name:'Col. Vikram Singh', action_type:'TENDER_PUBLISHED', tender_id:'TDR-MoD-2025-000004', tender_title:'Border Roads Medical Supply', ministry:'MoD', details:'Tender published — ₹62 Cr defence procurement, single sourcing risk noted.', risk_score:0, blockchain_tx:'0x3e6a9d2c5b8f1a4d7c0b3e6a9f2c5b8e1d4a7f3c6e9b2', ip_address:'172.X.X.X', severity:'INFO' },
  { id:'AUD-008', timestamp_ist:'13 Mar 2025, 16:00:00 IST', actor_email:'cag.auditor@nic.gov.in', actor_role:'CAG_AUDITOR', actor_name:'Priya Gupta', action_type:'CAG_FLAGGED', tender_id:'TDR-MoRTH-2024-000089', tender_title:'NH-44 Highway Phase 2', ministry:'MoRTH', details:'Tender flagged: SPEC_BIAS + FRONT_RUNNING. Evidence of restricted specifications. Case: CAG-INV-2024-0389.', risk_score:67, blockchain_tx:'0x8d1a4f7c0b3e6a9d2c5b8f1a4d7c0b3e6a9f2c5b8e1d4', ip_address:'10.X.X.X', severity:'CRITICAL' },
  { id:'AUD-009', timestamp_ist:'13 Mar 2025, 14:22:11 IST', actor_email:'officer@morth.gov.in', actor_role:'MINISTRY_OFFICER', actor_name:'Arvind Mehta', action_type:'OFFICER_OVERRIDE', tender_id:'TDR-MoRTH-2025-000012', tender_title:'Rural Road Construction Batch 7', ministry:'MoRTH', details:'Officer overrode AI recommendation to freeze. Justification: "Bid amounts within normal range for rural construction."', risk_score:38, blockchain_tx:'0x6a9f2c5b8e1d4a7f3c6e9b2d5a8f1c4b7e0d3a6f9c2e5', ip_address:'192.168.X.X', severity:'HIGH' },
  { id:'AUD-010', timestamp_ist:'12 Mar 2025, 18:30:45 IST', actor_email:'system@tendershield.gov', actor_role:'SYSTEM', actor_name:'System', action_type:'USER_REGISTERED', tender_id:null, tender_title:null, ministry:'MoRTH', details:'New officer registered: arvind.mehta@morth.gov.in. Pending verification.', risk_score:0, blockchain_tx:'0x2c5b8f1a4d7c0b3e6a9d2c5b8f1a4d7c0b3e6a9f2c5b8', ip_address:'192.168.X.X', severity:'INFO' },
  { id:'AUD-011', timestamp_ist:'12 Mar 2025, 15:00:00 IST', actor_email:'cag.auditor@nic.gov.in', actor_role:'CAG_AUDITOR', actor_name:'Priya Gupta', action_type:'REPORT_GENERATED', tender_id:'TDR-MoH-2025-000003', tender_title:'AIIMS Delhi Medical Equipment', ministry:'MoH', details:'CAG compliance report generated. Report ID: RPT-2025-0047. Section 65B certificate included.', risk_score:94, blockchain_tx:'0x1c4b7e0d3a6f9c2e5b8d1a4f7c0b3e6a9d2c5b8f1a4d7', ip_address:'10.X.X.X', severity:'INFO' },
  { id:'AUD-012', timestamp_ist:'12 Mar 2025, 10:12:33 IST', actor_email:'ai.system@tendershield.gov', actor_role:'AI_SYSTEM', actor_name:'TenderShield AI', action_type:'AI_ANALYSIS', tender_id:'TDR-MeitY-2025-000007', tender_title:'AI Research Platform Procurement', ministry:'MeitY', details:'Specification bias detected: 3 out of 5 required specs match single vendor (NovaTech) exactly.', risk_score:45, blockchain_tx:'0x9f2c5b8e1d4a7f3c6e9b2d5a8f1c4b7e0d3a6f9c2e5b8', ip_address:null, severity:'MEDIUM' },
  { id:'AUD-013', timestamp_ist:'11 Mar 2025, 14:55:00 IST', actor_email:'bidder@novatech.in', actor_role:'BIDDER', actor_name:'NovaTech Solutions', action_type:'BID_COMMITTED', tender_id:'TDR-MeitY-2025-000007', tender_title:'AI Research Platform Procurement', ministry:'MeitY', details:'Sealed bid committed: ₹178.5 Cr.', risk_score:10, blockchain_tx:'0x0d3a6f9c2e5b8d1a4f7c0b3e6a9d2c5b8f1a4d7c0b3e6', ip_address:'52.X.X.X', severity:'INFO' },
  { id:'AUD-014', timestamp_ist:'11 Mar 2025, 09:30:00 IST', actor_email:'officer@meity.gov.in', actor_role:'MINISTRY_OFFICER', actor_name:'Dr. Neha Kapoor', action_type:'TENDER_PUBLISHED', tender_id:'TDR-MeitY-2025-000007', tender_title:'AI Research Platform Procurement', ministry:'MeitY', details:'Tender published — ₹180 Cr, AI/ML research platform, deadline 30 days.', risk_score:0, blockchain_tx:'0xa6f9c2e5b8d1a4f7c0b3e6a9d2c5b8f1a4d7c0b3e6a9f', ip_address:'10.X.X.X', severity:'INFO' },
  { id:'AUD-015', timestamp_ist:'10 Mar 2025, 16:45:00 IST', actor_email:'cag.auditor@nic.gov.in', actor_role:'CAG_AUDITOR', actor_name:'Vijay Sharma', action_type:'CAG_FLAGGED', tender_id:'TDR-MoRTH-2024-000089', tender_title:'NH-44 Highway Phase 2', ministry:'MoRTH', details:'Investigation escalated to CVC. Case: CAG-INV-2024-0389. Total value under investigation: ₹320 Cr.', risk_score:67, blockchain_tx:'0xf9c2e5b8d1a4f7c0b3e6a9d2c5b8f1a4d7c0b3e6a9f2c', ip_address:'10.X.X.X', severity:'CRITICAL' },
  { id:'AUD-016', timestamp_ist:'10 Mar 2025, 11:20:00 IST', actor_email:'officer@mof.gov.in', actor_role:'MINISTRY_OFFICER', actor_name:'Sunita Devi', action_type:'TENDER_PUBLISHED', tender_id:'TDR-MoF-2025-000015', tender_title:'Tax Filing Infrastructure Upgrade', ministry:'MoF', details:'Tender published — ₹45 Cr, IT infrastructure upgrade for CBDT.', risk_score:0, blockchain_tx:'0xc2e5b8d1a4f7c0b3e6a9d2c5b8f1a4d7c0b3e6a9f2c5b', ip_address:'10.X.X.X', severity:'INFO' },
  { id:'AUD-017', timestamp_ist:'09 Mar 2025, 15:30:00 IST', actor_email:'ai.system@tendershield.gov', actor_role:'AI_SYSTEM', actor_name:'TenderShield AI', action_type:'AI_ANALYSIS', tender_id:'TDR-MoE-2025-000011', tender_title:'Digital Classroom Equipment - Phase 4', ministry:'MoE', details:'All checks passed. Risk score: 18/100. No anomalies detected.', risk_score:18, blockchain_tx:'0xe5b8d1a4f7c0b3e6a9d2c5b8f1a4d7c0b3e6a9f2c5b8d', ip_address:null, severity:'INFO' },
  { id:'AUD-018', timestamp_ist:'08 Mar 2025, 09:00:00 IST', actor_email:'cag.auditor@nic.gov.in', actor_role:'CAG_AUDITOR', actor_name:'Priya Gupta', action_type:'REPORT_GENERATED', tender_id:null, tender_title:null, ministry:'MoH', details:'Monthly MoH compliance report generated. 12 tenders reviewed, 2 flagged (avg risk 34).', risk_score:null, blockchain_tx:'0xb8d1a4f7c0b3e6a9d2c5b8f1a4d7c0b3e6a9f2c5b8d1a', ip_address:'10.X.X.X', severity:'INFO' },
  { id:'AUD-019', timestamp_ist:'07 Mar 2025, 14:10:00 IST', actor_email:'admin@infrabuilders.in', actor_role:'BIDDER', actor_name:'Infra Builders Ltd', action_type:'BID_COMMITTED', tender_id:'TDR-MoRTH-2025-000012', tender_title:'Rural Road Construction Batch 7', ministry:'MoRTH', details:'Sealed bid committed: ₹22.3 Cr. Company age: 18 months.', risk_score:20, blockchain_tx:'0xd1a4f7c0b3e6a9d2c5b8f1a4d7c0b3e6a9f2c5b8d1a4f', ip_address:'103.X.X.X', severity:'INFO' },
  { id:'AUD-020', timestamp_ist:'06 Mar 2025, 10:00:00 IST', actor_email:'officer@moe.gov.in', actor_role:'MINISTRY_OFFICER', actor_name:'Rahul Verma', action_type:'TENDER_PUBLISHED', tender_id:'TDR-MoE-2025-000011', tender_title:'Digital Classroom Equipment - Phase 4', ministry:'MoE', details:'Tender published — ₹28 Cr, 5000 digital classrooms across 12 states.', risk_score:0, blockchain_tx:'0xa4f7c0b3e6a9d2c5b8f1a4d7c0b3e6a9f2c5b8d1a4f7c', ip_address:'10.X.X.X', severity:'INFO' },
];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const ministry = searchParams.get('ministry');
    const action_type = searchParams.get('action_type');
    const severity = searchParams.get('severity');
    const search = searchParams.get('search');

    // Try real Supabase first
    let realData: any[] = [];
    let usingReal = false;
    if (supabase) {
      try {
        let query = supabase.from('audit_events').select('*').order('created_at', { ascending: false }).limit(50);
        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          realData = data.map((e: any) => ({
            id: e.event_id || e.id,
            timestamp_ist: new Date(e.timestamp_ist || e.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
            actor_email: e.data?.actor || 'system',
            actor_role: e.data?.actor_role || 'SYSTEM',
            actor_name: e.data?.actor?.split('@')[0] || 'System',
            action_type: e.event_type,
            tender_id: e.data?.tender_id || null,
            tender_title: e.data?.description || null,
            ministry: e.data?.ministry || 'System',
            details: e.data?.description || e.event_type,
            risk_score: e.data?.risk_score || null,
            blockchain_tx: e.data?.blockchain_tx || null,
            ip_address: null,
            severity: e.data?.risk_score > 70 ? 'CRITICAL' : e.data?.risk_score > 40 ? 'HIGH' : 'INFO',
          }));
          usingReal = true;
        }
      } catch {}
    }

    let events = usingReal ? realData : [...DEMO_AUDIT_TRAIL];

    // Apply filters
    if (ministry) events = events.filter(e => e.ministry === ministry);
    if (action_type) {
      const typeMap: Record<string, string[]> = {
        'tender': ['TENDER_PUBLISHED', 'TENDER_AUTO_FROZEN', 'TENDER_AWARDED'],
        'bid': ['BID_COMMITTED', 'BID_REVEALED'],
        'ai': ['AI_ANALYSIS', 'TENDER_AUTO_FROZEN'],
        'user': ['USER_REGISTERED', 'OFFICER_OVERRIDE'],
        'cag': ['CAG_FLAGGED', 'REPORT_GENERATED'],
      };
      const types = typeMap[action_type] || [action_type];
      events = events.filter(e => types.includes(e.action_type));
    }
    if (severity && severity !== 'All') events = events.filter(e => e.severity === severity);
    if (search) events = events.filter(e =>
      (e.tender_id || '').toLowerCase().includes(search.toLowerCase()) ||
      (e.actor_email || '').toLowerCase().includes(search.toLowerCase()) ||
      (e.details || '').toLowerCase().includes(search.toLowerCase())
    );

    return NextResponse.json({
      success: true,
      events,
      total: events.length,
      using_real_data: usingReal,
      mode: usingReal ? 'SUPABASE' : 'DEMO',
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e instanceof Error ? e.message : String(e)) }, { status: 500 });
  }
}
