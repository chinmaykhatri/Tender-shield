/**
 * TenderShield — Auth Store (Zustand)
 * Global authentication state management.
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
  login: (token: string, role: string, org: string, name?: string) => void;
  setUser: (user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: typeof window !== 'undefined' ? localStorage.getItem('ts_token') : null,
  user: typeof window !== 'undefined' && localStorage.getItem('ts_user')
    ? JSON.parse(localStorage.getItem('ts_user')!)
    : null,
  isAuthenticated: typeof window !== 'undefined' ? !!localStorage.getItem('ts_token') : false,
  login: (token, role, org, name) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('ts_token', token);
      const user = { did: `did:ts:${role.toLowerCase()}`, role, org, name: name || role };
      localStorage.setItem('ts_user', JSON.stringify(user));
      set({ token, user, isAuthenticated: true });
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
    }
    set({ token: null, user: null, isAuthenticated: false });
  },
}));
