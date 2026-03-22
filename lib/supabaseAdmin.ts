/**
 * TenderShield — Supabase Admin Client (Server-Side)
 * Lazy initialization to prevent crashes during next build.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _admin: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (_admin) return _admin;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-key';

  _admin = createClient(url, key);
  return _admin;
}
