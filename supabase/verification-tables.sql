-- ═══════════════════════════════════════════════
-- TENDERSHIELD — VERIFICATION TABLES
-- Run this in Supabase SQL Editor
-- ═══════════════════════════════════════════════

-- USER VERIFICATION STATUS TABLE
CREATE TABLE IF NOT EXISTS user_verifications (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id               UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role                  TEXT NOT NULL,
  aadhaar_last4         TEXT,
  aadhaar_name          TEXT,
  aadhaar_verified      BOOLEAN DEFAULT false,
  aadhaar_verified_at   TIMESTAMPTZ,
  email                 TEXT,
  email_domain          TEXT,
  email_verified        BOOLEAN DEFAULT false,
  email_verified_at     TIMESTAMPTZ,
  employee_id           TEXT,
  ministry_code         TEXT,
  department            TEXT,
  employee_verified     BOOLEAN DEFAULT false,
  gstin                 TEXT,
  gstin_legal_name      TEXT,
  gstin_reg_date        TEXT,
  gstin_age_months      INTEGER,
  gstin_verified        BOOLEAN DEFAULT false,
  pan                   TEXT,
  pan_name              TEXT,
  pan_verified          BOOLEAN DEFAULT false,
  gem_seller_id         TEXT,
  gem_verified          BOOLEAN DEFAULT false,
  udyam_number          TEXT,
  udyam_category        TEXT,
  udyam_verified        BOOLEAN DEFAULT false,
  is_msme               BOOLEAN DEFAULT false,
  access_code_used      TEXT,
  access_code_verified  BOOLEAN DEFAULT false,
  overall_status        TEXT DEFAULT 'PENDING',
  admin_approved        BOOLEAN DEFAULT false,
  admin_approved_by     UUID,
  admin_approved_at     TIMESTAMPTZ,
  admin_rejection_note  TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_uv_user ON user_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_uv_status ON user_verifications(overall_status);
CREATE INDEX IF NOT EXISTS idx_uv_gstin ON user_verifications(gstin);
CREATE INDEX IF NOT EXISTS idx_uv_pan ON user_verifications(pan);

ALTER TABLE user_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_own_verification" ON user_verifications
  FOR ALL TO authenticated USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- AUDITOR ACCESS CODES TABLE
CREATE TABLE IF NOT EXISTS auditor_access_codes (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code          TEXT NOT NULL UNIQUE,
  created_by    UUID REFERENCES auth.users(id),
  used_by       UUID REFERENCES auth.users(id),
  used_at       TIMESTAMPTZ,
  expires_at    TIMESTAMPTZ NOT NULL,
  is_used       BOOLEAN DEFAULT false,
  note          TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE auditor_access_codes ENABLE ROW LEVEL SECURITY;

-- PENDING REGISTRATIONS TABLE
CREATE TABLE IF NOT EXISTS pending_registrations (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role          TEXT NOT NULL,
  email         TEXT NOT NULL,
  full_name     TEXT,
  submitted_at  TIMESTAMPTZ DEFAULT NOW(),
  status        TEXT DEFAULT 'WAITING',
  reviewed_by   UUID,
  reviewed_at   TIMESTAMPTZ,
  review_note   TEXT
);

ALTER TABLE pending_registrations ENABLE ROW LEVEL SECURITY;
