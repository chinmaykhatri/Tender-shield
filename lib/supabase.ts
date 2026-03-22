/**
 * TenderShield — Supabase Client
 * Uses lazy initialization so the client is never created during Vercel's build phase.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _supabase: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (_supabase) return _supabase;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  // During build, env vars may be empty — create client anyway (it won't be called)
  _supabase = createClient(url || 'https://placeholder.supabase.co', key || 'placeholder-key');
  return _supabase;
}

/** Lazy-initialized Supabase client — safe for Vercel build */
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSupabaseClient();
    const value = (client as any)[prop];
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  },
});

/**
 * Create a Supabase client with a user's JWT token for authenticated requests.
 */
export function createAuthClient(token: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';
  return createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}
