-- ═══════════════════════════════════════════════════════════
-- TenderShield — Supabase Row Level Security (RLS) Policies
-- ═══════════════════════════════════════════════════════════
-- Apply via Supabase Dashboard → SQL Editor
-- These policies enforce data access at the database level,
-- independent of application-layer auth checks.
-- ═══════════════════════════════════════════════════════════

-- Enable RLS on all tables
ALTER TABLE tenders ENABLE ROW LEVEL SECURITY;
ALTER TABLE bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────
-- TENDERS: anyone can read published, only officers can create
-- ─────────────────────────────────────────

CREATE POLICY "tenders_select_published" ON tenders
  FOR SELECT USING (status IN ('PUBLISHED', 'BIDDING_OPEN', 'AWARDED'));

CREATE POLICY "tenders_insert_officers" ON tenders
  FOR INSERT WITH CHECK (
    auth.jwt() ->> 'role' IN ('MINISTRY_OFFICER', 'ADMIN')
  );

-- Officers can update tenders they created
CREATE POLICY "tenders_update_own" ON tenders
  FOR UPDATE USING (
    created_by = auth.jwt() ->> 'email'
    OR auth.jwt() ->> 'role' = 'ADMIN'
  );

-- ─────────────────────────────────────────
-- BIDS: bidders can only see their own, auditors can see all
-- ─────────────────────────────────────────

CREATE POLICY "bids_select_own" ON bids
  FOR SELECT USING (
    bidder_did = auth.uid()::text
    OR auth.jwt() ->> 'role' IN ('CAG_AUDITOR', 'ADMIN')
  );

-- Bidders can insert their own bids
CREATE POLICY "bids_insert_own" ON bids
  FOR INSERT WITH CHECK (
    bidder_did = auth.uid()::text
    OR auth.jwt() ->> 'role' IN ('BIDDER', 'ADMIN')
  );

-- ─────────────────────────────────────────
-- USER VERIFICATIONS: users see only their own
-- ─────────────────────────────────────────

CREATE POLICY "verifications_select_own" ON user_verifications
  FOR SELECT USING (user_id = auth.uid());

-- Admins can update verification status
CREATE POLICY "verifications_update_admin" ON user_verifications
  FOR UPDATE USING (
    auth.jwt() ->> 'role' = 'ADMIN'
  );

-- ─────────────────────────────────────────
-- AUDIT LOGS: only auditors and admins
-- ─────────────────────────────────────────

CREATE POLICY "audit_logs_select" ON audit_logs
  FOR SELECT USING (
    auth.jwt() ->> 'role' IN ('CAG_AUDITOR', 'ADMIN')
  );

-- System can insert audit logs (via service role key)
CREATE POLICY "audit_logs_insert_system" ON audit_logs
  FOR INSERT WITH CHECK (true);
