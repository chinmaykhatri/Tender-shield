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
  login: (token: string, role: string, org: string) => void;
  setUser: (user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: typeof window !== 'undefined' ? localStorage.getItem('ts_token') : null,
  user: null,
  isAuthenticated: typeof window !== 'undefined' ? !!localStorage.getItem('ts_token') : false,
  login: (token, role, org) => {
    if (typeof window !== 'undefined') localStorage.setItem('ts_token', token);
    set({ token, isAuthenticated: true });
  },
  setUser: (user) => set({ user }),
  logout: () => {
    if (typeof window !== 'undefined') localStorage.removeItem('ts_token');
    set({ token: null, user: null, isAuthenticated: false });
  },
}));
