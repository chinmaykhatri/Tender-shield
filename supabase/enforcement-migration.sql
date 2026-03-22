-- ============================================
-- TenderShield — Enforcement Features Migration
-- Feature 1: Auto-Lock Enforcement
-- ============================================

-- Tender locks table
CREATE TABLE IF NOT EXISTS tender_locks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tender_id TEXT NOT NULL,
  lock_level TEXT NOT NULL,
  lock_reason TEXT NOT NULL,
  risk_score INTEGER NOT NULL,
  risk_level TEXT NOT NULL,
  required_approvers TEXT[] NOT NULL,
  justification_required BOOLEAN DEFAULT true,
  approvals_received JSONB DEFAULT '[]',
  locked_at TIMESTAMPTZ DEFAULT NOW(),
  locked_by TEXT DEFAULT 'AI_SYSTEM',
  blockchain_tx TEXT,
  unlocked_at TIMESTAMPTZ,
  status TEXT DEFAULT 'LOCKED_PENDING_APPROVAL'
);

ALTER TABLE tender_locks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tender_locks_read" ON tender_locks;
CREATE POLICY "tender_locks_read" ON tender_locks
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "tender_locks_write" ON tender_locks;
CREATE POLICY "tender_locks_write" ON tender_locks
  FOR ALL TO service_role USING (true);

-- Add lock columns to tenders table (if it exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tenders') THEN
    ALTER TABLE tenders ADD COLUMN IF NOT EXISTS lock_level TEXT;
    ALTER TABLE tenders ADD COLUMN IF NOT EXISTS lock_reason TEXT;
    ALTER TABLE tenders ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ;
  END IF;
END $$;

-- Seed demo lock record for AIIMS tender
INSERT INTO tender_locks (
  tender_id, lock_level, lock_reason, risk_score, risk_level,
  required_approvers, approvals_received, blockchain_tx, status
) VALUES (
  'TDR-MoH-2025-000003',
  'HARD_LOCK',
  'Critical risk — CAG + senior officer dual approval required',
  94, 'CRITICAL',
  ARRAY['CAG_AUDITOR', 'SENIOR_OFFICER'],
  '[{"approver_role":"SENIOR_OFFICER","approver_id":"off_001","justification":"Reviewed AI analysis and confirmed irregularities. Tender should remain under scrutiny but bidding committee has verified technical compliance separately.","approved_at":"2025-03-10T14:32:00+05:30","blockchain_tx":"0x7a3b2c1d9e8f7a6b5c4d3e2f1a0b9c8d"}]'::jsonb,
  '0x2e5c8b1d4a7f3c9e1b5d8a2f4e7c0b3d6a9e2f5c8b1d4a7f3c9e1b5d8a2f4e7c',
  'LOCKED_PENDING_APPROVAL'
) ON CONFLICT DO NOTHING;

-- ============================================
-- Feature 2: Officer Risk Ledger
-- ============================================

CREATE TABLE IF NOT EXISTS officer_actions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  officer_id UUID NOT NULL,
  tender_id TEXT NOT NULL,
  action_type TEXT NOT NULL,
  risk_score_at_time INTEGER,
  justification TEXT,
  outcome TEXT DEFAULT 'PENDING',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE officer_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "officer_actions_read" ON officer_actions;
CREATE POLICY "officer_actions_read" ON officer_actions
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "officer_actions_write" ON officer_actions;
CREATE POLICY "officer_actions_write" ON officer_actions
  FOR ALL TO service_role USING (true);

-- ============================================
-- Feature 4: Trust Score Economy
-- ============================================

CREATE TABLE IF NOT EXISTS trust_scores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID UNIQUE NOT NULL,
  company_name TEXT,
  score INTEGER NOT NULL DEFAULT 50,
  grade TEXT NOT NULL DEFAULT 'SILVER',
  badge TEXT NOT NULL DEFAULT 'blue',
  positive_factors TEXT[],
  negative_factors TEXT[],
  last_calculated_at TIMESTAMPTZ DEFAULT NOW(),
  history JSONB DEFAULT '[]'
);

ALTER TABLE trust_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "trust_scores_read" ON trust_scores;
CREATE POLICY "trust_scores_read" ON trust_scores
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "trust_scores_write" ON trust_scores;
CREATE POLICY "trust_scores_write" ON trust_scores
  FOR ALL TO service_role USING (true);

-- ============================================
-- Feature 5: Whistleblower Engine
-- ============================================

CREATE TABLE IF NOT EXISTS whistleblower_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  submission_id TEXT UNIQUE NOT NULL,
  tender_id TEXT,
  fraud_type TEXT DEFAULT 'OTHER',
  evidence_hash TEXT NOT NULL,
  evidence_text TEXT NOT NULL,
  contact_hash TEXT,
  blockchain_tx TEXT,
  status TEXT DEFAULT 'SUBMITTED',
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE whistleblower_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "whistleblower_read" ON whistleblower_reports;
CREATE POLICY "whistleblower_read" ON whistleblower_reports
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "whistleblower_write" ON whistleblower_reports;
CREATE POLICY "whistleblower_write" ON whistleblower_reports
  FOR ALL TO service_role USING (true);
