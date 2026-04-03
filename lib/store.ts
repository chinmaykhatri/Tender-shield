/**
 * TenderShield — Auth Store (Zustand) — SECURITY HARDENED
 * Global authentication state with session expiry.
 * Sessions auto-expire after 24 hours.
 */

import { create } from 'zustand';

interface User {
  did: string;
  role: string;
  org: string;
  name: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  serverValidated: boolean;
  authMethod: 'demo' | 'supabase' | null;
  sessionExpiresAt: number | null;
  login: (token: string, role: string, org: string, name?: string, expiresAt?: number) => void;
  setUser: (user: User) => void;
  logout: () => void;
  validateWithServer: (email?: string) => Promise<boolean>;
  checkSessionExpiry: () => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: typeof window !== 'undefined' ? localStorage.getItem('ts_token') : null,
  user: typeof window !== 'undefined' && localStorage.getItem('ts_user')
    ? JSON.parse(localStorage.getItem('ts_user')!)
    : null,
  isAuthenticated: typeof window !== 'undefined' ? !!localStorage.getItem('ts_token') : false,
  serverValidated: false,
  authMethod: null,
  sessionExpiresAt: typeof window !== 'undefined' && localStorage.getItem('ts_expires')
    ? parseInt(localStorage.getItem('ts_expires')!, 10)
    : null,

  login: (token, role, org, name, expiresAt) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('ts_token', token);
      const user = { did: `did:ts:${role.toLowerCase()}`, role, org, name: name || role };
      localStorage.setItem('ts_user', JSON.stringify(user));
      const expiry = expiresAt || Date.now() + 24 * 60 * 60 * 1000; // 24h default
      localStorage.setItem('ts_expires', String(expiry));
      // Set cookies for middleware role validation (server-side can't read localStorage)
      document.cookie = `ts_authenticated=true;path=/;max-age=86400;SameSite=Lax`;
      document.cookie = `ts_user_role=${role};path=/;max-age=86400;SameSite=Lax`;
      set({ token, user, isAuthenticated: true, authMethod: 'demo', sessionExpiresAt: expiry });
    } else {
      set({ token, isAuthenticated: true });
    }
  },

  setUser: (user) => {
    if (typeof window !== 'undefined') localStorage.setItem('ts_user', JSON.stringify(user));
    set({ user });
  },

  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('ts_token');
      localStorage.removeItem('ts_user');
      localStorage.removeItem('ts_expires');
      // Clear auth cookies
      document.cookie = `ts_authenticated=;path=/;max-age=0`;
      document.cookie = `ts_user_role=;path=/;max-age=0`;
    }
    set({ token: null, user: null, isAuthenticated: false, serverValidated: false, authMethod: null, sessionExpiresAt: null });
  },

  /**
   * Check if the current session has expired.
   * Auto-logs out if expired. Returns true if session is still valid.
   */
  checkSessionExpiry: () => {
    const { sessionExpiresAt } = get();
    if (sessionExpiresAt && Date.now() > sessionExpiresAt) {
      get().logout();
      return false;
    }
    return true;
  },

  /**
   * Validate the current session with the server.
   * In demo mode: checks against known demo accounts with fixed roles.
   * In real mode: validates JWT structure and expiry.
   * Prevents client-side role spoofing via DevTools.
   */
  validateWithServer: async (email?: string) => {
    const { token, user } = get();
    try {
      const res = await fetch('/api/auth/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          email: email || '',
          role: user?.role,
        }),
      });
      const data = await res.json();
      if (data.valid) {
        // Server confirmed — update user with server-validated data
        if (data.user) {
          const validatedUser = {
            did: data.user.did || user?.did || '',
            role: data.user.role || user?.role || '',
            org: data.user.org || user?.org || '',
            name: data.user.name || user?.name || '',
          };
          set({
            user: validatedUser,
            serverValidated: true,
            authMethod: data.auth_method || 'demo',
          });
          if (typeof window !== 'undefined') {
            localStorage.setItem('ts_user', JSON.stringify(validatedUser));
          }
        } else {
          set({ serverValidated: true, authMethod: data.auth_method || 'demo' });
        }
        return true;
      } else {
        // Server rejected — force logout
        get().logout();
        return false;
      }
    } catch {
      // Server unreachable — allow demo access but mark as not validated
      set({ serverValidated: false });
      return false;
    }
  },
}));
