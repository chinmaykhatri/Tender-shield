-- ═══════════════════════════════════════════════════════════
-- TenderShield — pgvector RAG Migration
-- Enable vector extension and create embedding search
-- Run this in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════

-- Step 1: Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Step 2: Add embedding column to tenders table
ALTER TABLE tenders ADD COLUMN IF NOT EXISTS embedding vector(384);

-- Step 3: Create similarity search function
CREATE OR REPLACE FUNCTION match_tenders(
  query_embedding vector(384),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  tender_id text,
  title text,
  status text,
  estimated_value numeric,
  ministry_code text,
  risk_score numeric,
  created_at timestamptz,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.tender_id,
    t.title,
    t.status,
    t.estimated_value,
    t.ministry_code,
    t.risk_score,
    t.created_at,
    1 - (t.embedding <=> query_embedding) AS similarity
  FROM tenders t
  WHERE t.embedding IS NOT NULL
    AND 1 - (t.embedding <=> query_embedding) > match_threshold
  ORDER BY t.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Step 4: Create index for fast similarity search
CREATE INDEX IF NOT EXISTS tenders_embedding_idx
  ON tenders USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 50);

-- Step 5: Create audit_events search index
ALTER TABLE audit_events ADD COLUMN IF NOT EXISTS embedding vector(384);

CREATE INDEX IF NOT EXISTS audit_embedding_idx
  ON audit_events USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 50);
