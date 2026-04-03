// FILE: lib/ai/securityLogger.ts
// SECURITY: SERVER ONLY — writes to Supabase with service role key
// API KEYS USED: SUPABASE_SERVICE_ROLE_KEY (via supabase server client)
// PURPOSE: Logs AI misuse attempts to audit trail for security review

import { createClient } from '@supabase/supabase-js';

// Server-side Supabase client with elevated permissions for security logging
function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export interface SecurityAttempt {
  user_id: string;
  endpoint: string;
  user_message: string;
  ip_address?: string;
}

/**
 * Log an AI misuse attempt to Supabase security_log table.
 * Called when Claude returns the constitutional refusal message.
 */
export async function logSecurityAttempt(params: SecurityAttempt): Promise<void> {
  try {
    const admin = getAdminClient();
    if (!admin) {
      // Supabase admin client not available — silent
      return;
    }

    const timestamp_ist = new Date().toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });

    await admin.from('security_log').insert({
      user_id: params.user_id,
      endpoint: params.endpoint,
      user_message: params.user_message.slice(0, 1000), // cap length
      ip_address: params.ip_address || 'unknown',
      severity: 'HIGH',
      action: 'AI_MISUSE_ATTEMPT',
      timestamp_ist,
      created_at: new Date().toISOString(),
    });

    // Security attempt logged — tracked in database only
  } catch (err) {
    // Never let security logging crash the main request
    // Failed to log — silent
  }
}

/**
 * Check if a Claude response contains the constitutional refusal message.
 * If it does, the caller should log the attempt.
 */
export function isConstitutionalRefusal(response: string): boolean {
  return response.includes('TenderShield AI cannot assist with that request');
}
