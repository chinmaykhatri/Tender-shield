/**
 * TenderShield — Auth Store Tests
 * Tests the Zustand authentication store.
 */

import { describe, it, expect, beforeEach } from 'vitest';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

import { useAuthStore } from '@/lib/store';

describe('useAuthStore', () => {
  beforeEach(() => {
    localStorageMock.clear();
    useAuthStore.setState({ token: null, user: null, isAuthenticated: false });
  });

  it('should start unauthenticated', () => {
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
  });

  it('should authenticate on login', () => {
    useAuthStore.getState().login('test-token', 'OFFICER', 'MinistryOrg', 'Test User');
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.token).toBe('test-token');
    expect(state.user).toBeTruthy();
    expect(state.user?.role).toBe('OFFICER');
    expect(state.user?.name).toBe('Test User');
    expect(state.user?.org).toBe('MinistryOrg');
  });

  it('should generate DID on login', () => {
    useAuthStore.getState().login('token', 'AUDITOR', 'CAGOrg');
    const state = useAuthStore.getState();
    expect(state.user?.did).toContain('did:ts:');
    expect(state.user?.did).toContain('auditor');
  });

  it('should clear all state on logout', () => {
    useAuthStore.getState().login('token', 'OFFICER', 'Org', 'Name');
    useAuthStore.getState().logout();
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
  });

  it('should persist user to localStorage on login', () => {
    useAuthStore.getState().login('token', 'BIDDER', 'BidderOrg', 'Bidder Name');
    const stored = localStorageMock.getItem('ts_user');
    expect(stored).toBeTruthy();
    const parsed = JSON.parse(stored!);
    expect(parsed.role).toBe('BIDDER');
    expect(parsed.name).toBe('Bidder Name');
  });

  it('should clear localStorage on logout', () => {
    useAuthStore.getState().login('token', 'OFFICER', 'Org');
    useAuthStore.getState().logout();
    expect(localStorageMock.getItem('ts_token')).toBeNull();
    expect(localStorageMock.getItem('ts_user')).toBeNull();
  });
});
