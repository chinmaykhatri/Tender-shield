-- FILE: supabase/seed-demo-data.sql
-- PURPOSE: Seed the 3 demo tenders + bids + alerts for competition
-- RUN THIS: Supabase SQL Editor → paste → Run (AFTER complete-migration.sql)

-- ════════════════════════════════════════════════════
-- TENDER 1: NH-44 Highway (clean, low risk)
-- ════════════════════════════════════════════════════
INSERT INTO tenders (tender_id, title, ministry, ministry_code, category, estimated_value_crore, status, risk_score, risk_level, bids_count, deadline, blockchain_tx, gfr_reference, created_at)
VALUES (
  'TDR-MoRTH-2025-000001',
  'NH-44 Highway Expansion Phase 3 — Panipat to Ambala',
  'Ministry of Road Transport & Highways', 'MoRTH', 'Civil Construction',
  450, 'BIDDING_OPEN', 23, 'LOW', 6,
  NOW() + INTERVAL '30 days',
  '0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b',
  'GFR Rule 161 — Open Tender E-Procurement',
  NOW() - INTERVAL '7 days'
) ON CONFLICT (tender_id) DO NOTHING;

-- ════════════════════════════════════════════════════
-- TENDER 2: PM SHRI Schools (medium risk, awarded)
-- ════════════════════════════════════════════════════
INSERT INTO tenders (tender_id, title, ministry, ministry_code, category, estimated_value_crore, status, risk_score, risk_level, bids_count, deadline, blockchain_tx, gfr_reference, created_at)
VALUES (
  'TDR-MoE-2025-000002',
  'PM SHRI Schools Digital Infrastructure — Phase II',
  'Ministry of Education', 'MoE', 'IT Services',
  85, 'AWARDED', 31, 'LOW', 8,
  NOW() - INTERVAL '5 days',
  '0x2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c',
  'GFR Rule 161 — Open Tender E-Procurement',
  NOW() - INTERVAL '21 days'
) ON CONFLICT (tender_id) DO NOTHING;

-- ════════════════════════════════════════════════════
-- TENDER 3: AIIMS Delhi ★ THE DEMO STAR ★ (CRITICAL — FROZEN)
-- ════════════════════════════════════════════════════
INSERT INTO tenders (tender_id, title, ministry, ministry_code, category, estimated_value_crore, status, risk_score, risk_level, bids_count, deadline, blockchain_tx, gfr_reference, ai_flags, freeze_reason, frozen_at, created_at)
VALUES (
  'TDR-MoH-2025-000003',
  'AIIMS Delhi Medical Equipment Procurement — Emergency',
  'Ministry of Health & Family Welfare', 'MoH', 'Medical Equipment',
  120, 'FROZEN_BY_AI', 94, 'CRITICAL', 4,
  NOW() - INTERVAL '2 days',
  '0x3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d',
  'GFR Rule 149 — Limited Tender',
  ARRAY['SHELL_COMPANY', 'BID_RIGGING', 'TIMING_COLLUSION', 'FRONT_RUNNING'],
  'AI Investigation: Shell company cartel detected. BioMed Corp & Pharma Plus share director PAN ABCDE1234F. Coordinated bids within 21 seconds. Total ₹267 Cr at risk.',
  NOW() - INTERVAL '1 hour',
  NOW() - INTERVAL '3 days'
) ON CONFLICT (tender_id) DO NOTHING;

-- ════════════════════════════════════════════════════
-- BIDS for AIIMS Delhi
-- ════════════════════════════════════════════════════
INSERT INTO bids (bid_id, tender_id, company_name, gstin, amount_crore, status, submitted_at, ai_risk_score, is_shell_company, zkp_verified, commitment_hash)
VALUES
  ('BID-AIIMS-001', 'TDR-MoH-2025-000003', 'MedTech Solutions Pvt Ltd', '07AABCM1234A1ZK', 118.5, 'REVEALED', NOW() - INTERVAL '2 days 7 hours', 12, false, true, '0xcommit_medtech_abc123'),
  ('BID-AIIMS-002', 'TDR-MoH-2025-000003', 'BioMed Corp India', '07AABCB5678B1ZP', 119.8, 'REVEALED', NOW() - INTERVAL '2 days 6 hours 58 minutes', 96, true, true, '0xcommit_biomed_def456'),
  ('BID-AIIMS-003', 'TDR-MoH-2025-000003', 'Pharma Plus Equipment Ltd', '07AABCP9012C1ZM', 120.1, 'REVEALED', NOW() - INTERVAL '2 days 6 hours 57 minutes 39 seconds', 96, true, true, '0xcommit_pharma_ghi789'),
  ('BID-AIIMS-004', 'TDR-MoH-2025-000003', 'HealthCare India Corp', '07AABCH3456D1ZR', 115.2, 'DISQUALIFIED', NOW() - INTERVAL '2 days 8 hours', 45, false, false, '0xcommit_healthcare_jkl012')
ON CONFLICT (bid_id) DO NOTHING;

-- Bids for NH-44
INSERT INTO bids (bid_id, tender_id, company_name, gstin, amount_crore, status, submitted_at, ai_risk_score, zkp_verified, commitment_hash)
VALUES
  ('BID-NH44-001', 'TDR-MoRTH-2025-000001', 'Larsen & Toubro Ltd', '27AABCL1234A1ZK', 442.0, 'COMMITTED', NOW() - INTERVAL '1 day', 5, true, '0xcommit_lnt_mno345'),
  ('BID-NH44-002', 'TDR-MoRTH-2025-000001', 'NCC Ltd', '36AABCN5678B1ZP', 448.5, 'COMMITTED', NOW() - INTERVAL '20 hours', 8, true, '0xcommit_ncc_pqr678')
ON CONFLICT (bid_id) DO NOTHING;

-- ════════════════════════════════════════════════════
-- AI ALERT for AIIMS Delhi
-- ════════════════════════════════════════════════════
INSERT INTO ai_alerts (alert_id, tender_id, alert_type, risk_score, confidence, evidence, recommended_action, status, auto_frozen, created_at)
VALUES (
  'ALERT-AIIMS-CRITICAL-001',
  'TDR-MoH-2025-000003',
  'CARTEL_DETECTED',
  94,
  0.96,
  '{
    "flags": ["SHELL_COMPANY", "BID_RIGGING", "TIMING_COLLUSION", "FRONT_RUNNING"],
    "shell_companies": ["BioMed Corp India", "Pharma Plus Equipment Ltd"],
    "shared_director_pan": "ABCDE1234F",
    "bid_timing_window_seconds": 21,
    "bid_cv_percent": 1.8,
    "winning_bid_vs_estimate": 0.9875,
    "investigation": {
      "tenders_frozen": 2,
      "bidders_flagged": 3,
      "value_protected_crore": 267,
      "cag_case": "CAG-AI-2025-4521",
      "blockchain_tx": "0x7b3d9e2c1f4a8b5d"
    }
  }'::jsonb,
  'FIR',
  'ESCALATED',
  true,
  NOW() - INTERVAL '1 hour'
) ON CONFLICT (alert_id) DO NOTHING;

-- ════════════════════════════════════════════════════
-- BLOCKCHAIN TRANSACTIONS (demo records)
-- ════════════════════════════════════════════════════
INSERT INTO blockchain_transactions (tx_hash, block_number, function_name, channel, is_real, created_at)
VALUES
  ('0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b', 1201, 'CreateTender', 'tenderchannel', false, NOW() - INTERVAL '7 days'),
  ('0x2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c', 1215, 'CreateTender', 'tenderchannel', false, NOW() - INTERVAL '21 days'),
  ('0x3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d', 1289, 'CreateTender', 'tenderchannel', false, NOW() - INTERVAL '3 days'),
  ('0x4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e', 1312, 'CommitBid', 'tenderchannel', false, NOW() - INTERVAL '2 days'),
  ('0x5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f', 1345, 'FreezeTender', 'tenderchannel', false, NOW() - INTERVAL '1 hour'),
  ('0x7b3d9e2c1f4a8b5d6e3c7a9f0b2d4e6a8c1f3b5d', 1421, 'RecordInvestigation', 'tenderchannel', false, NOW() - INTERVAL '30 minutes')
ON CONFLICT (tx_hash) DO NOTHING;
