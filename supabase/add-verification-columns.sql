-- TenderShield — Add missing verification columns and tables
-- Run this in Supabase SQL Editor

-- Add missing columns to user_verifications
ALTER TABLE user_verifications
  ADD COLUMN IF NOT EXISTS aadhaar_dob TEXT,
  ADD COLUMN IF NOT EXISTS gstin_trade_name TEXT,
  ADD COLUMN IF NOT EXISTS is_shell_company_risk BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS pan_name TEXT,
  ADD COLUMN IF NOT EXISTS designation TEXT,
  ADD COLUMN IF NOT EXISTS access_code_verified BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS admin_approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create auditor_access_codes table
CREATE TABLE IF NOT EXISTS auditor_access_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  created_by UUID,
  used_by UUID,
  used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  is_used BOOLEAN DEFAULT false,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert demo access code
INSERT INTO auditor_access_codes (code, expires_at, note)
VALUES ('TS-AUD-DEMO01', NOW() + INTERVAL '365 days', 'Demo access code for competition')
ON CONFLICT (code) DO NOTHING;

-- Enable RLS on auditor_access_codes
ALTER TABLE auditor_access_codes ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
DROP POLICY IF EXISTS "service_role_full_access" ON auditor_access_codes;
CREATE POLICY "service_role_full_access" ON auditor_access_codes
  FOR ALL USING (true) WITH CHECK (true);
