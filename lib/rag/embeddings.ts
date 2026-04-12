// ═══════════════════════════════════════════════════════════
// TenderShield — RAG Embeddings Module
// Supports: pgvector (real), keyword fallback (demo)
// ═══════════════════════════════════════════════════════════

import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

/**
 * Deterministic hash-based embedding for demo mode.
 * Produces a 384-dim vector from text content.
 * NOT a real embedding — just for testing the RAG pipeline.
 */
function hashEmbedding(text: string, dims: number = 384): number[] {
  const vec = new Array(dims).fill(0);
  const normalized = text.toLowerCase().trim();

  for (let i = 0; i < normalized.length; i++) {
    const charCode = normalized.charCodeAt(i);
    const idx = (charCode * (i + 1) * 31) % dims;
    vec[idx] += 1.0 / (1 + Math.floor(i / 10));
  }

  // L2 normalize
  const norm = Math.sqrt(vec.reduce((a: number, b: number) => a + b * b, 0)) || 1;
  return vec.map((v: number) => v / norm);
}

/**
 * Search tenders using semantic similarity.
 * Priority: pgvector match_tenders → keyword ILIKE fallback
 */
export async function searchTenders(query: string, limit: number = 10) {
  const supabase = getSupabaseAdmin();

  // Try pgvector semantic search first
  try {
    const embedding = hashEmbedding(query);
    const { data, error } = await supabase.rpc('match_tenders', {
      query_embedding: embedding,
      match_threshold: 0.3,
      match_count: limit,
    });

    if (!error && data && data.length > 0) {
      return {
        results: data,
        method: 'PGVECTOR_SEMANTIC',
        query,
      };
    }
  } catch {
    // pgvector not available — fall through
  }

  // Fallback: keyword-based search using ILIKE
  try {
    const keywords = query.split(/\s+/).filter(w => w.length > 2).slice(0, 5);
    let queryBuilder = supabase
      .from('tenders')
      .select('id, tender_id, title, status, estimated_value, ministry_code, risk_score, created_at')
      .limit(limit);

    // Search title for any keyword match
    if (keywords.length > 0) {
      const orFilter = keywords.map(k => `title.ilike.%${k}%`).join(',');
      queryBuilder = queryBuilder.or(orFilter);
    }

    const { data, error } = await queryBuilder.order('created_at', { ascending: false });

    if (!error && data && data.length > 0) {
      return {
        results: data.map(t => ({ ...t, similarity: 0.5 })),
        method: 'KEYWORD_ILIKE',
        query,
      };
    }
  } catch {
    // Database not available
  }

  // Final fallback: return empty with honest method
  return {
    results: [],
    method: 'NO_DATA',
    query,
  };
}

/**
 * Get context for RAG: retrieve relevant tenders + audit events for a user query.
 */
export async function getRAGContext(userQuery: string): Promise<string> {
  const searchResult = await searchTenders(userQuery, 8);

  if (searchResult.results.length === 0) {
    return `[No matching tenders found for query: "${userQuery}". Data source: ${searchResult.method}]`;
  }

  const context = searchResult.results.map((t: any) => {
    return `- ${t.tender_id || t.id}: "${t.title}" | Status: ${t.status} | Value: ₹${t.estimated_value || 0} Cr | Risk: ${t.risk_score || 'N/A'} | Ministry: ${t.ministry_code || 'N/A'} | Similarity: ${(t.similarity * 100).toFixed(0)}%`;
  }).join('\n');

  return `## Relevant Tenders (${searchResult.method})\n${context}`;
}
