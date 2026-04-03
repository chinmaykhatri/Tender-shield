/**
 * TenderShield — Integration Tests for Backend Proxy
 * Tests the fetchFromBackend pipeline (success / failure / timeout)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Import after mocking
const { getTenders } = await import('../lib/dataLayer');

describe('Backend Proxy Integration', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns backend data when proxy is connected', async () => {
    const backendTenders = [
      { id: 'TDR-REAL-001', title: 'Real Tender', status: 'BIDDING_OPEN' },
      { id: 'TDR-REAL-002', title: 'Another Tender', status: 'AWARDED' },
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        _proxy: { connected: true },
        data: backendTenders,
      }),
    });

    const result = await getTenders();
    expect(result.using_real_data).toBe(true);
    expect(result.data.length).toBeGreaterThan(0);
  });

  it('falls through to mock data when proxy returns empty', async () => {
    // Proxy returns no data
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ _proxy: { connected: true }, data: [] }),
    });

    // Supabase call (will error in test env)
    mockFetch.mockRejectedValueOnce(new Error('Supabase network error'));

    const result = await getTenders();
    // Should fall back to mock data in demo mode
    expect(result.data).toBeDefined();
    expect(Array.isArray(result.data)).toBe(true);
  });

  it('handles proxy timeout gracefully', async () => {
    // Simulate timeout - fetchFromBackend catches AbortError
    mockFetch.mockRejectedValueOnce(new DOMException('Aborted', 'AbortError'));

    const result = await getTenders();
    // Should still return data (mock fallback)
    expect(result.data).toBeDefined();
    expect(Array.isArray(result.data)).toBe(true);
  });

  it('handles proxy HTTP error gracefully', async () => {
    // Proxy returns 500
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({ error: 'Internal Server Error' }) });

    const result = await getTenders();
    expect(result.data).toBeDefined();
    expect(Array.isArray(result.data)).toBe(true);
  });

  it('validates proxy response structure', async () => {
    // Proxy returns malformed response (no _proxy flag)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ some: 'random data' }),
    });

    const result = await getTenders();
    // Should not use malformed data, falls to supabase/mock
    expect(result.data).toBeDefined();
  });
});
