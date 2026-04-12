-- ═══════════════════════════════════════════════════════════
-- TenderShield — Director Network Table
-- Stores shared director relationships for shell company detection
-- Run this in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS director_network (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  company_a text NOT NULL,
  company_a_name text,
  company_b text NOT NULL,
  company_b_name text,
  shared_identifier text,
  shared_pan text,
  shared_din text,
  director_name text,
  link_type text DEFAULT 'SHARED_DIRECTOR',
  confidence numeric DEFAULT 0.9,
  risk_score_a numeric DEFAULT 0,
  risk_score_b numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Seed data: AIIMS Delhi case
INSERT INTO director_network (company_a, company_a_name, company_b, company_b_name, director_name, shared_pan, shared_din, link_type, confidence, risk_score_a, risk_score_b)
VALUES
  ('BIOMED_CORP', 'BioMed Corp India', 'PHARMA_PLUS', 'Pharma Plus Equipment', 'Ramesh K. Sharma', 'ABCDE1234F', '09876543', 'SHARED_DIRECTOR', 0.95, 92, 88),
  ('BIOMED_CORP', 'BioMed Corp India', 'PHARMA_PLUS', 'Pharma Plus Equipment', NULL, NULL, NULL, 'SHARED_ADDRESS', 0.70, 92, 88)
ON CONFLICT DO NOTHING;

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_director_network_company_a ON director_network(company_a);
CREATE INDEX IF NOT EXISTS idx_director_network_company_b ON director_network(company_b);
CREATE INDEX IF NOT EXISTS idx_director_network_pan ON director_network(shared_pan);
