// FILE: lib/auth/requireAuth.ts
// SECURITY LAYER: Protects API routes from unauthenticated calls
// BREAKS IF REMOVED: YES — API data exposed without login

import { supabase } from '@/lib/supabase';

export type UserRole =
  | 'OFFICER'
  | 'BIDDER'
  | 'AUDITOR'
  | 'NIC_ADMIN'
  | 'CAG_AUDITOR'
  | 'MINISTRY_OFFICER'
  | 'AI_SERVICE';

export interface AuthResult {
  userId: string;
  email: string;
  role: UserRole;
  org: string;
  name: string;
}

/**
 * Require authentication for an API route.
 * Call at the top of every API handler:
 *   const user = await requireAuth(['OFFICER', 'NIC_ADMIN']);
 * 
 * Throws a Response (not an Error) so the caller can return it directly.
 */
export async function requireAuth(
  allowedRoles?: UserRole[]
): Promise<AuthResult> {
  // Try Supabase session first
  const { data: { session }, error } = await supabase.auth.getSession();

  if (error || !session) {
    throw new Response(
      JSON.stringify({ error: 'Authentication required', code: 'AUTH_REQUIRED' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const meta = session.user.user_metadata || {};
  const role = (meta.role || 'BIDDER') as UserRole;
  const org = meta.org || 'BidderOrg';
  const name = meta.name || session.user.email?.split('@')[0] || 'User';

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    throw new Response(
      JSON.stringify({
        error: 'Access denied — insufficient permissions',
        required_roles: allowedRoles,
        your_role: role,
        code: 'FORBIDDEN',
      }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
  }

  return {
    userId: session.user.id,
    email: session.user.email ?? '',
    role,
    org,
    name,
  };
}
