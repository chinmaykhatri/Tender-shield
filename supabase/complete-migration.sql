-- FILE: supabase/complete-migration.sql
-- PURPOSE: Create ALL tables needed for TenderShield
-- RUN THIS: Supabase SQL Editor → paste → Run

-- 🔥 DROP EXISTING TABLES SO THEY CAN BE RECREATED WITH NEW COLUMNS 🔥
DROP TABLE IF EXISTS tenders CASCADE;
DROP TABLE IF EXISTS bids CASCADE;
DROP TABLE IF EXISTS ai_alerts CASCADE;
DROP TABLE IF EXISTS user_verifications CASCADE;
DROP TABLE IF EXISTS pending_registrations CASCADE;
DROP TABLE IF EXISTS auditor_access_codes CASCADE;
DROP TABLE IF EXISTS blockchain_transactions CASCADE;
DROP TABLE IF EXISTS security_log CASCADE;

-- ════════════════════════════════════════════════════
-- TABLE 1: tenders
-- ════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS tenders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tender_id TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  ministry TEXT,
  ministry_code TEXT,
  category TEXT,
  estimated_value_crore DECIMAL DEFAULT 0,
  status TEXT DEFAULT 'DRAFT',
  risk_score INTEGER DEFAULT 0,
  risk_level TEXT DEFAULT 'LOW',
  bids_count INTEGER DEFAULT 0,
  deadline TIMESTAMPTZ,
  created_by UUID,
  blockchain_tx TEXT,
  gem_category TEXT,
  gfr_reference TEXT,
  ai_flags TEXT[],
  freeze_reason TEXT,
  frozen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ════════════════════════════════════════════════════
-- TABLE 2: bids
-- ════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bid_id TEXT UNIQUE NOT NULL,
  tender_id TEXT REFERENCES tenders(tender_id) ON DELETE CASCADE,
  bidder_id UUID,
  company_name TEXT,
  gstin TEXT,
  amount_crore DECIMAL,
  commitment_hash TEXT,
  zkp_verified BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'COMMITTED',
  submitted_at TIMESTAMPTZ,
  revealed_at TIMESTAMPTZ,
  ai_risk_score INTEGER DEFAULT 0,
  is_shell_company BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ════════════════════════════════════════════════════
-- TABLE 3: ai_alerts
-- ════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS ai_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id TEXT UNIQUE,
  tender_id TEXT,
  alert_type TEXT,
  risk_score INTEGER,
  confidence DECIMAL,
  evidence JSONB,
  recommended_action TEXT,
  status TEXT DEFAULT 'OPEN',
  auto_frozen BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ════════════════════════════════════════════════════
-- TABLE 4: user_verifications (from identity verification)
-- ════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS user_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE,
  role TEXT,
  aadhaar_last4 TEXT,
  aadhaar_verified BOOLEAN DEFAULT false,
  email TEXT,
  email_verified BOOLEAN DEFAULT false,
  gstin TEXT,
  gstin_verified BOOLEAN DEFAULT false,
  pan TEXT,
  pan_verified BOOLEAN DEFAULT false,
  employee_id TEXT,
  overall_status TEXT DEFAULT 'PENDING',
  admin_approved BOOLEAN DEFAULT false,
  admin_approved_by UUID,
  admin_approved_at TIMESTAMPTZ,
  admin_rejection_note TEXT,
  trust_score INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ════════════════════════════════════════════════════
-- TABLE 5: pending_registrations
-- ════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS pending_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  role TEXT,
  email TEXT,
  full_name TEXT,
  status TEXT DEFAULT 'WAITING',
  verification_data JSONB,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  review_note TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);

-- ════════════════════════════════════════════════════
-- TABLE 6: auditor_access_codes
-- ════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS auditor_access_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  created_by UUID,
  used_by UUID,
  used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ════════════════════════════════════════════════════
-- TABLE 7: blockchain_transactions (for block explorer)
-- ════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS blockchain_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tx_hash TEXT UNIQUE,
  block_number INTEGER,
  function_name TEXT,
  args TEXT,
  channel TEXT DEFAULT 'tenderchannel',
  is_real BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ════════════════════════════════════════════════════
-- TABLE 8: security_log
-- ════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS security_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  severity TEXT DEFAULT 'INFO',
  user_id UUID,
  ip_address TEXT,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ════════════════════════════════════════════════════
ALTER TABLE tenders ENABLE ROW LEVEL SECURITY;
ALTER TABLE bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE blockchain_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_log ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read tenders and bids
DROP POLICY IF EXISTS "Anyone can read tenders" ON tenders;
CREATE POLICY "Anyone can read tenders" ON tenders FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can read bids" ON bids;
CREATE POLICY "Anyone can read bids" ON bids FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can read blockchain" ON blockchain_transactions;
CREATE POLICY "Anyone can read blockchain" ON blockchain_transactions FOR SELECT USING (true);

-- Allow inserts from authenticated users
DROP POLICY IF EXISTS "Auth users insert tenders" ON tenders;
CREATE POLICY "Auth users insert tenders" ON tenders FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Auth users insert bids" ON bids;
CREATE POLICY "Auth users insert bids" ON bids FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Auth users insert alerts" ON ai_alerts;
CREATE POLICY "Auth users insert alerts" ON ai_alerts FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Auth users read alerts" ON ai_alerts;
CREATE POLICY "Auth users read alerts" ON ai_alerts FOR SELECT USING (true);

DROP POLICY IF EXISTS "Auth users insert blockchain" ON blockchain_transactions;
CREATE POLICY "Auth users insert blockchain" ON blockchain_transactions FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users read own verification" ON user_verifications;
CREATE POLICY "Users read own verification" ON user_verifications FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users insert verification" ON user_verifications;
CREATE POLICY "Users insert verification" ON user_verifications FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users update verification" ON user_verifications;
CREATE POLICY "Users update verification" ON user_verifications FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Auth users insert security" ON security_log;
CREATE POLICY "Auth users insert security" ON security_log FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Auth users read security" ON security_log;
CREATE POLICY "Auth users read security" ON security_log FOR SELECT USING (true);

-- Allow updates
DROP POLICY IF EXISTS "Auth users update tenders" ON tenders;
CREATE POLICY "Auth users update tenders" ON tenders FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Auth users update bids" ON bids;
CREATE POLICY "Auth users update bids" ON bids FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Auth users update alerts" ON ai_alerts;
CREATE POLICY "Auth users update alerts" ON ai_alerts FOR UPDATE USING (true);
