-- ══════════════════════════════════════════════════════════════
-- TenderShield — Paillier Homomorphic Encryption: Bid Columns
-- Run in Supabase Dashboard → SQL Editor
-- ══════════════════════════════════════════════════════════════

-- Add encrypted bid storage columns
ALTER TABLE bids ADD COLUMN IF NOT EXISTS paillier_ciphertext TEXT;
ALTER TABLE bids ADD COLUMN IF NOT EXISTS paillier_public_key JSONB;
ALTER TABLE bids ADD COLUMN IF NOT EXISTS encryption_status TEXT DEFAULT 'PLAINTEXT';

-- Index for filtering encrypted vs plaintext bids
CREATE INDEX IF NOT EXISTS idx_bids_encryption_status ON bids(encryption_status);

-- Comment for documentation
COMMENT ON COLUMN bids.paillier_ciphertext IS 'Paillier-encrypted bid amount (BigInt string). Null = plaintext bid.';
COMMENT ON COLUMN bids.paillier_public_key IS 'Public key {n, nSquared, g, bits} used for this encryption.';
COMMENT ON COLUMN bids.encryption_status IS 'PLAINTEXT | ENCRYPTED | REVEALED — tracks bid lifecycle.';
