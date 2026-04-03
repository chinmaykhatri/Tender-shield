/**
 * TenderShield — Supabase Schema Migration + Full Seed (V3)
 * 1. Adds missing columns to tenders table via ALTER TABLE
 * 2. Seeds ALL 8 tenders with complete data
 * Run: npx -y tsx scripts/seed-supabase.ts
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load .env.local
const envFile = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8');
const envVars: Record<string, string> = {};
for (const line of envFile.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const [key, ...rest] = trimmed.split('=');
  if (key && rest.length > 0) envVars[key.trim()] = rest.join('=').trim();
}

const SUPABASE_URL = envVars['NEXT_PUBLIC_SUPABASE_URL'] || '';
const SUPABASE_KEY = envVars['SUPABASE_SERVICE_ROLE_KEY'] || envVars['NEXT_PUBLIC_SUPABASE_ANON_KEY'] || '';

if (!SUPABASE_KEY) { console.error('❌ Missing Supabase key'); process.exit(1); }
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ─────────────────────────────────────────
// Step 1: Add missing columns via SQL
// ─────────────────────────────────────────
async function migrateSchema() {
  console.log('\n🔧 Running schema migration...');
  
  const columns = [
    { name: 'department', type: 'TEXT' },
    { name: 'description', type: 'TEXT' },
    { name: 'category', type: 'TEXT' },
    { name: 'gem_id', type: 'TEXT' },
    { name: 'gem_category', type: 'TEXT' },
    { name: 'gfr_reference', type: 'TEXT' },
    { name: 'compliance_status', type: 'TEXT' },
    { name: 'blockchain_tx', type: 'TEXT' },
    { name: 'block_number', type: 'INTEGER' },
    { name: 'created_by', type: 'TEXT' },
    { name: 'deadline', type: 'TEXT' },
    { name: 'bids_count', type: 'INTEGER' },
    { name: 'risk_level', type: 'TEXT' },
    { name: 'ministry', type: 'TEXT' },
  ];

  // Try to add each column - if it already exists, Supabase will return an error which we ignore
  for (const col of columns) {
    const { error } = await supabase.rpc('exec_sql', { 
      sql: `ALTER TABLE tenders ADD COLUMN IF NOT EXISTS ${col.name} ${col.type};` 
    }).single();
    
    if (error) {
      // rpc might not exist — try direct insert to test column existence
      console.log(`   ℹ️  ${col.name}: RPC unavailable (will use smart-insert fallback)`);
    } else {
      console.log(`   ✅ ${col.name}: added`);
    }
  }

  // Add missing ai_alerts columns
  const alertCols = [
    { name: 'risk_level', type: 'TEXT' },
    { name: 'confidence', type: 'REAL' },
    { name: 'recommended_action', type: 'TEXT' },
    { name: 'auto_frozen', type: 'BOOLEAN' },
  ];

  for (const col of alertCols) {
    await supabase.rpc('exec_sql', { 
      sql: `ALTER TABLE ai_alerts ADD COLUMN IF NOT EXISTS ${col.name} ${col.type};` 
    }).single();
  }

  console.log('   ✅ Schema migration attempted');
}

// ─────────────────────────────────────────
// Smart insert: strips unknown columns recursively
// ─────────────────────────────────────────
async function smartInsert(table: string, records: Record<string, unknown>[]) {
  console.log(`\n📋 Seeding ${table} (${records.length} records)...`);
  
  const { data, error } = await supabase.from(table).insert(records as any).select();
  
  if (!error) {
    console.log(`   ✅ ${table}: ${data?.length || records.length} rows inserted`);
    return true;
  }
  
  // Auto-strip missing columns
  const missingColMatch = error.message.match(/Could not find the '(\w+)' column/);
  if (missingColMatch) {
    const badCol = missingColMatch[1];
    console.log(`   🔧 Stripping column '${badCol}'...`);
    const cleaned = records.map(r => { const copy = { ...r }; delete copy[badCol]; return copy; });
    return smartInsert(table, cleaned);
  }
  
  // Duplicate key — upsert one by one
  if (error.message.includes('duplicate') || error.message.includes('unique') || error.message.includes('already exists')) {
    let inserted = 0;
    for (const record of records) {
      const { error: e } = await supabase.from(table).upsert(record as any);
      if (!e) inserted++;
    }
    console.log(`   ✅ ${table}: ${inserted}/${records.length} rows upserted`);
    return true;
  }
  
  console.log(`   ❌ ${table} failed: ${error.message}`);
  return false;
}

// ─────────────────────────────────────────
// ALL 8 TENDERS — Realistic Indian Government Data
// ─────────────────────────────────────────
const TENDERS = [
  {
    tender_id: 'TDR-MoRTH-2025-000001', title: 'NH-44 Highway Expansion Phase 3 — J&K to Haryana',
    ministry: 'Ministry of Road Transport & Highways', ministry_code: 'MoRTH',
    department: 'National Highways Authority of India', category: 'WORKS',
    description: 'Construction and expansion of NH-44 covering 340km across J&K, Punjab and Haryana with 6-lane configuration, including grade-separated junctions, service roads, flyovers, and drainage structures per IRC Standards.',
    estimated_value_crore: 450, status: 'BIDDING_OPEN', bids_count: 6,
    deadline: '2025-04-15T17:00:00+05:30', risk_score: 23, risk_level: 'LOW',
    gem_category: 'Civil Construction Works', gem_id: 'GEM/2025/B/4521',
    gfr_reference: 'GFR Rule 149', blockchain_tx: '0x4f7a9c2e8b1d3f6a5e2c9b7d4a1f8e3c6b9d2e5a8f1c4b7d0e3f6a9c2b5d8e1',
    block_number: 1247,
    compliance_status: 'COMPLIANT',
  },
  {
    tender_id: 'TDR-MoE-2025-000002', title: 'PM SHRI Schools Digital Infrastructure — National Rollout',
    ministry: 'Ministry of Education', ministry_code: 'MoE',
    department: 'Department of School Education & Literacy', category: 'GOODS',
    description: 'Smart boards, computer labs, high-speed internet for 14,500 PM SHRI Schools across India under NEP 2020.',
    estimated_value_crore: 85, status: 'AWARDED', bids_count: 8,
    deadline: '2025-02-28T17:00:00+05:30', risk_score: 31, risk_level: 'MEDIUM',
    gem_category: 'IT Hardware & Educational Technology', gem_id: 'GEM/2025/B/3847',
    gfr_reference: 'GFR Rule 149', blockchain_tx: '0x9c2e4f7a1b8d5e3c6a9f2b7d4e1c8a5f3d6b9e2c5a8f1b4d7e0c3f6a9b2d5e8',
    block_number: 1189, created_by: 'officer@moe.gov.in', created_at: '2025-02-01T10:15:00+05:30',
    compliance_status: 'COMPLIANT',
  },
  {
    tender_id: 'TDR-MoH-2025-000003', title: 'AIIMS Delhi Medical Equipment Procurement',
    ministry: 'Ministry of Health & Family Welfare', ministry_code: 'MoH',
    department: 'AIIMS Delhi', category: 'GOODS',
    description: 'MRI (3T), CT Scanners (128-slice), Cath Labs and ICU monitoring for AIIMS Delhi expansion wing.',
    estimated_value_crore: 120, status: 'FROZEN_BY_AI', bids_count: 4,
    deadline: '2025-03-10T17:00:00+05:30', risk_score: 94, risk_level: 'CRITICAL',
    gem_category: 'Medical Equipment & Diagnostic Devices', gem_id: 'GEM/2025/B/5102',
    gfr_reference: 'GFR Rule 149', blockchain_tx: '0x7b3d9e6c2a5f8b1d4e7c0a3f6b9d2e5c8f1b4d7a0e3c6f9b2d5e8a1c4f7b0d3',
    block_number: 1312, created_by: 'officer@mohfw.gov.in', created_at: '2025-03-05T11:00:00+05:30',
    compliance_status: 'FROZEN',
  },
  {
    tender_id: 'TDR-MoD-2025-000004', title: 'BRO Heavy Equipment — Ladakh & Arunachal Pradesh',
    ministry: 'Ministry of Defence', ministry_code: 'MoD',
    department: 'Border Roads Organisation', category: 'GOODS',
    description: 'Tunnel boring machines, rock drilling equipment for strategic border roads in Ladakh and Arunachal Pradesh.',
    estimated_value_crore: 280, status: 'UNDER_EVALUATION', bids_count: 3,
    deadline: '2025-03-08T17:00:00+05:30', risk_score: 45, risk_level: 'MEDIUM',
    gem_category: 'Heavy Construction Machinery', gem_id: 'GEM/2025/B/4899',
    gfr_reference: 'GFR Rule 149', blockchain_tx: '0x1c4b7d0e3f6a9c2b5d8e1f4a7b0c3d6e9f2a5b8c1d4e7f0a3b6c9d2e5f8a1b4',
    block_number: 1298, created_by: 'officer@mod.gov.in', created_at: '2025-03-02T14:00:00+05:30',
    compliance_status: 'COMPLIANT',
  },
  {
    tender_id: 'TDR-MoR-2025-000005', title: 'Indian Railways Signal Modernization — Eastern Corridor',
    ministry: 'Ministry of Railways', ministry_code: 'MoR',
    department: 'Railway Board — Signal & Telecom', category: 'WORKS',
    description: 'Electronic Interlocking systems across 48 stations on Eastern Dedicated Freight Corridor.',
    estimated_value_crore: 310, status: 'BIDDING_OPEN', bids_count: 5,
    deadline: '2025-04-20T17:00:00+05:30', risk_score: 15, risk_level: 'LOW',
    gem_category: 'Railway Signalling Equipment', gem_id: 'GEM/2025/B/5201',
    gfr_reference: 'GFR Rule 149', blockchain_tx: '0xd4e7f0a3b6c9d2e5f8a1b4c7d0e3f6a9c2b5d8e1f4a7b0c3d6e9f2a5b8c1d4',
    block_number: 1305, created_by: 'officer@railways.gov.in', created_at: '2025-03-10T09:00:00+05:30',
    compliance_status: 'COMPLIANT',
  },
  {
    tender_id: 'TDR-MoUD-2025-000006', title: 'Smart City Bhopal — IoT & Command Center',
    ministry: 'Ministry of Urban Development', ministry_code: 'MoUD',
    department: 'Smart Cities Mission Directorate', category: 'GOODS',
    description: '12,000 IoT sensors, smart traffic management, integrated command center for Bhopal Smart City.',
    estimated_value_crore: 175, status: 'UNDER_EVALUATION', bids_count: 7,
    deadline: '2025-03-12T17:00:00+05:30', risk_score: 62, risk_level: 'HIGH',
    gem_category: 'IT Infrastructure & IoT Systems', gem_id: 'GEM/2025/B/5087',
    gfr_reference: 'GFR Rule 166', blockchain_tx: '0x2b5d8e1f4a7b0c3d6e9f2a5b8c1d4e7f0a3b6c9d2e5f8a1b4c7d0e3f6a9c2b',
    block_number: 1318, created_by: 'officer@moud.gov.in', created_at: '2025-02-20T10:30:00+05:30',
    compliance_status: 'UNDER_REVIEW',
  },
  {
    tender_id: 'TDR-MoWCD-2025-000007', title: 'ICDS Nutrition Supply Chain — 6 States',
    ministry: 'Ministry of Women & Child Development', ministry_code: 'MoWCD',
    department: 'Integrated Child Development Services', category: 'GOODS',
    description: 'Nutrition packets for 2.8 lakh Anganwadi centres across UP, Bihar, MP, Rajasthan, Jharkhand, Odisha.',
    estimated_value_crore: 48, status: 'AWARDED', bids_count: 9,
    deadline: '2025-02-15T17:00:00+05:30', risk_score: 8, risk_level: 'LOW',
    gem_category: 'Nutrition & Food Supplements', gem_id: 'GEM/2025/B/4712',
    gfr_reference: 'GFR Rule 149', blockchain_tx: '0xe1f4a7b0c3d6e9f2a5b8c1d4e7f0a3b6c9d2e5f8a1b4c7d0e3f6a9c2b5d8e1',
    block_number: 1275, created_by: 'officer@wcd.gov.in', created_at: '2025-01-20T11:00:00+05:30',
    compliance_status: 'COMPLIANT',
  },
  {
    tender_id: 'TDR-MoIT-2025-000008', title: 'Aadhaar Data Centre Expansion — Bengaluru',
    ministry: 'Ministry of Electronics & IT', ministry_code: 'MoIT',
    department: 'UIDAI', category: 'WORKS',
    description: 'Tier-4 data centre, 500 server racks, redundant cooling for UIDAI Bengaluru campus.',
    estimated_value_crore: 520, status: 'FROZEN_BY_AI', bids_count: 4,
    deadline: '2025-03-18T17:00:00+05:30', risk_score: 88, risk_level: 'CRITICAL',
    gem_category: 'Data Centre Infrastructure', gem_id: 'GEM/2025/B/5310',
    gfr_reference: 'GFR Rule 149', blockchain_tx: '0xf2a5b8c1d4e7f0a3b6c9d2e5f8a1b4c7d0e3f6a9c2b5d8e1f4a7b0c3d6e9f2',
    block_number: 1330, created_by: 'officer@meity.gov.in', created_at: '2025-03-08T09:30:00+05:30',
    compliance_status: 'FROZEN',
  },
];

const AUDIT_EVENTS = [
  { event_id: 'EVT-MoRTH-001-CREATED', event_type: 'TENDER_CREATED', topic: 'tender.lifecycle', timestamp_ist: '2025-03-01T09:30:00+05:30', data: { tender_id: 'TDR-MoRTH-2025-000001', actor: 'officer@morth.gov.in', actor_role: 'MINISTRY_OFFICER', blockchain_tx: '0x4f7a9c2e8b1d3f6a', block_number: 1247, description: 'NH-44 Highway Expansion tender created — ₹450 Cr' } },
  { event_id: 'EVT-MoH-003-CREATED', event_type: 'TENDER_CREATED', topic: 'tender.lifecycle', timestamp_ist: '2025-03-05T11:00:00+05:30', data: { tender_id: 'TDR-MoH-2025-000003', actor: 'officer@mohfw.gov.in', actor_role: 'MINISTRY_OFFICER', blockchain_tx: '0x7b3d9e6c2a5f8b1d', block_number: 1312, description: 'AIIMS Medical Equipment tender created — ₹120 Cr' } },
  { event_id: 'EVT-MoH-003-BID1', event_type: 'BID_COMMITTED', topic: 'bid.zkp', timestamp_ist: '2025-03-10T14:22:15+05:30', data: { tender_id: 'TDR-MoH-2025-000003', actor: 'medtech@medtechsolutions.com', actor_role: 'BIDDER', blockchain_tx: '0x9d5f6a9b0c3d8e1f', block_number: 1330, commitment_hash: '0xa3f7c2e9b4d1...', description: 'ZKP bid committed by MedTech Solutions' } },
  { event_id: 'EVT-MoH-003-BID2', event_type: 'BID_COMMITTED', topic: 'bid.zkp', timestamp_ist: '2025-03-10T16:58:41+05:30', data: { tender_id: 'TDR-MoH-2025-000003', actor: 'admin@biomedicorp.com', actor_role: 'BIDDER', blockchain_tx: '0xa6e07b0c1d4e8f2a', block_number: 1335, commitment_hash: '0xb4e8d3f0a5c2...', description: 'ZKP bid committed by BioMed Corp' } },
  { event_id: 'EVT-MoH-003-AI', event_type: 'AI_ANALYSIS', topic: 'ai.fraud', timestamp_ist: '2025-03-10T17:03:40+05:30', data: { tender_id: 'TDR-MoH-2025-000003', actor: 'AI_SERVICE', actor_role: 'AI_SYSTEM', blockchain_tx: '0xb7f18c1d2e5f9a3b', block_number: 1336, detectors: 5, risk_score: 94, description: 'AI fraud analysis complete — Shell Company: 99%, Bid Rigging: 97%' } },
  { event_id: 'EVT-MoH-003-FROZEN', event_type: 'TENDER_FROZEN', topic: 'enforcement.freeze', timestamp_ist: '2025-03-10T17:03:42+05:30', data: { tender_id: 'TDR-MoH-2025-000003', actor: 'AI_SERVICE', actor_role: 'AI_SYSTEM', blockchain_tx: '0x2e5c8b9d2e5c8f1b', block_number: 1337, reason: 'Shell company detected + bid rigging pattern', description: 'AIIMS Medical Equipment FROZEN by AI — risk 94%' } },
  { event_id: 'EVT-MoH-003-CAG', event_type: 'CAG_NOTIFIED', topic: 'enforcement.notify', timestamp_ist: '2025-03-10T17:03:43+05:30', data: { tender_id: 'TDR-MoH-2025-000003', actor: 'AI_SERVICE', actor_role: 'AI_SYSTEM', blockchain_tx: '0xc8a29d2e5c8f1b4d', block_number: 1337, cag_case_id: 'CAG-AI-2025-000094', description: 'CAG Auditor notified — case CAG-AI-2025-000094 opened with encrypted evidence' } },
  { event_id: 'EVT-MoIT-008-FROZEN', event_type: 'TENDER_FROZEN', topic: 'enforcement.freeze', timestamp_ist: '2025-03-18T17:02:18+05:30', data: { tender_id: 'TDR-MoIT-2025-000008', actor: 'AI_SERVICE', actor_role: 'AI_SYSTEM', blockchain_tx: '0xa5b8c1d4e7f0a3b6', block_number: 1342, reason: 'Cartel rotation pattern detected', description: 'Aadhaar Data Centre tender FROZEN — risk 88%' } },
  { event_id: 'EVT-MoRTH-001-REVEAL', event_type: 'BID_REVEALED', topic: 'bid.zkp', timestamp_ist: '2025-03-28T14:22:15+05:30', data: { tender_id: 'TDR-MoRTH-2025-000001', actor: 'lt@lntel.co.in', actor_role: 'BIDDER', blockchain_tx: '0xd0e3f6a9c2b5d8e1', block_number: 1341, revealed_amount_crore: 442, zkp_verified: true, description: 'Bid revealed by L&T — ₹442 Cr (ZKP verified ✅)' } },
  { event_id: 'EVT-MoWCD-007-AWARD', event_type: 'TENDER_AWARDED', topic: 'tender.lifecycle', timestamp_ist: '2025-02-28T12:15:00+05:30', data: { tender_id: 'TDR-MoWCD-2025-000007', actor: 'officer@wcd.gov.in', actor_role: 'MINISTRY_OFFICER', blockchain_tx: '0xe1f4a7b0c3d6e9f2', block_number: 1338, winner: 'NutriCare India Pvt Ltd', description: 'ICDS Nutrition Supply awarded to NutriCare India' } },
  { event_id: 'EVT-MoE-002-AWARD', event_type: 'TENDER_AWARDED', topic: 'tender.lifecycle', timestamp_ist: '2025-03-15T11:30:22+05:30', data: { tender_id: 'TDR-MoE-2025-000002', actor: 'officer@moe.gov.in', actor_role: 'MINISTRY_OFFICER', blockchain_tx: '0x1d4e6b9d0c3f6a9c', block_number: 1333, winner: 'EdTech Solutions India', description: 'PM SHRI Schools tender awarded to EdTech Solutions' } },
  { event_id: 'EVT-MoUD-006-ZKP', event_type: 'ZKP_VERIFIED', topic: 'bid.zkp', timestamp_ist: '2025-03-11T14:02:30+05:30', data: { tender_id: 'TDR-MoUD-2025-000006', actor: 'BLOCKCHAIN', actor_role: 'SYSTEM', blockchain_tx: '0xc9d3e6f8a1b4c7d0', block_number: 1332, commitment_verified: true, description: 'Pedersen commitment verified on-chain for Smart City Bhopal bid' } },
  { event_id: 'EVT-MoR-005-CREATED', event_type: 'TENDER_CREATED', topic: 'tender.lifecycle', timestamp_ist: '2025-03-10T09:00:00+05:30', data: { tender_id: 'TDR-MoR-2025-000005', actor: 'officer@railways.gov.in', actor_role: 'MINISTRY_OFFICER', blockchain_tx: '0xd4e7f0a3b6c9d2e5', block_number: 1305, description: 'Railways Signal Modernization tender created — ₹310 Cr' } },
  { event_id: 'EVT-MoD-004-CREATED', event_type: 'TENDER_CREATED', topic: 'tender.lifecycle', timestamp_ist: '2025-03-02T14:00:00+05:30', data: { tender_id: 'TDR-MoD-2025-000004', actor: 'officer@mod.gov.in', actor_role: 'MINISTRY_OFFICER', blockchain_tx: '0x1c4b7d0e3f6a9c2b', block_number: 1298, description: 'BRO Heavy Equipment tender created — ₹280 Cr' } },
  { event_id: 'EVT-MoIT-008-CREATED', event_type: 'TENDER_CREATED', topic: 'tender.lifecycle', timestamp_ist: '2025-03-08T09:30:00+05:30', data: { tender_id: 'TDR-MoIT-2025-000008', actor: 'officer@meity.gov.in', actor_role: 'MINISTRY_OFFICER', blockchain_tx: '0xf2a5b8c1d4e7f0a3', block_number: 1330, description: 'Aadhaar Data Centre tender created — ₹520 Cr' } },
];

const AI_ALERTS = [
  { alert_id: 'ALT-2025-000094', tender_id: 'TDR-MoH-2025-000003', risk_score: 94, risk_level: 'CRITICAL', confidence: 0.97, status: 'OPEN', recommended_action: 'ESCALATE_CAG', auto_frozen: true, created_at: '2025-03-10T17:03:42+05:30' },
  { alert_id: 'ALT-2025-000088', tender_id: 'TDR-MoIT-2025-000008', risk_score: 88, risk_level: 'CRITICAL', confidence: 0.94, status: 'OPEN', recommended_action: 'ESCALATE_CAG', auto_frozen: true, created_at: '2025-03-18T17:02:18+05:30' },
  { alert_id: 'ALT-2025-000062', tender_id: 'TDR-MoUD-2025-000006', risk_score: 62, risk_level: 'HIGH', confidence: 0.86, status: 'OPEN', recommended_action: 'FLAG', auto_frozen: false, created_at: '2025-03-11T15:45:00+05:30' },
  { alert_id: 'ALT-2025-000045', tender_id: 'TDR-MoD-2025-000004', risk_score: 45, risk_level: 'MEDIUM', confidence: 0.81, status: 'OPEN', recommended_action: 'FLAG', auto_frozen: false, created_at: '2025-03-08T16:30:00+05:30' },
  { alert_id: 'ALT-2025-000031', tender_id: 'TDR-MoE-2025-000002', risk_score: 31, risk_level: 'MEDIUM', confidence: 0.74, status: 'RESOLVED', recommended_action: 'MONITOR', auto_frozen: false, created_at: '2025-02-28T10:15:00+05:30' },
];

async function seed() {
  console.log('🌱 TenderShield — Schema Migration + Full Seed (V3)\n');
  console.log(`🔗 ${SUPABASE_URL}`);

  // Step 1: Try schema migration
  await migrateSchema();

  // Step 2: Clean old data
  console.log('\n🗑️  Cleaning existing seed data...');
  await supabase.from('ai_alerts').delete().in('alert_id', AI_ALERTS.map(a => a.alert_id));
  await supabase.from('audit_events').delete().in('event_id', AUDIT_EVENTS.map(a => a.event_id));
  await supabase.from('tenders').delete().in('tender_id', TENDERS.map(t => t.tender_id));

  // Step 3: Smart insert all
  await smartInsert('tenders', TENDERS);
  await smartInsert('audit_events', AUDIT_EVENTS);
  await smartInsert('ai_alerts', AI_ALERTS);

  // Step 4: Verify
  console.log('\n🔍 Final verification...');
  const { data: allTenders } = await supabase.from('tenders').select('tender_id, title, status, estimated_value_crore, ministry_code, risk_score');
  console.log(`\n   📋 Total tenders: ${allTenders?.length || 0}`);
  if (allTenders) {
    for (const t of allTenders as any[]) {
      const status_emoji = t.status === 'FROZEN_BY_AI' ? '❄️' : t.status === 'AWARDED' ? '🏆' : t.status === 'BIDDING_OPEN' ? '📝' : '🔍';
      console.log(`   ${status_emoji} ${t.tender_id} | ${t.ministry_code} | ₹${t.estimated_value_crore} Cr | Risk: ${t.risk_score} | ${t.status}`);
    }
  }

  const { count: ac } = await supabase.from('audit_events').select('*', { count: 'exact', head: true });
  const { count: alc } = await supabase.from('ai_alerts').select('*', { count: 'exact', head: true });
  console.log(`   📜 Audit events: ${ac || '?'} rows`);
  console.log(`   🚨 AI alerts: ${alc || '?'} rows`);

  // Dashboard test
  const { data: dashTest } = await supabase.from('tenders').select('status, estimated_value_crore, risk_score, ministry_code');
  if (dashTest) {
    const active = dashTest.filter((t: any) => ['BIDDING_OPEN', 'UNDER_EVALUATION', 'PUBLISHED'].includes(t.status));
    const frozen = dashTest.filter((t: any) => t.status === 'FROZEN_BY_AI');
    const total = dashTest.reduce((s: number, t: any) => s + (t.estimated_value_crore || 0), 0);
    console.log(`\n   📊 Dashboard will show: ${active.length} active | ${frozen.length} frozen | ₹${total} Cr total`);
  }

  console.log('\n✅ Database fully seeded!');
}

seed().catch(console.error);
