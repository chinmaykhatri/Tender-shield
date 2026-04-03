/**
 * TenderShield — API Helper Tests
 * Tests the utility functions used across the app.
 */

import { describe, it, expect } from 'vitest';
import { getStatusBadge, formatPaise } from '@/lib/api';

describe('getStatusBadge', () => {
  it('should return correct badge for BIDDING_OPEN', () => {
    const badge = getStatusBadge('BIDDING_OPEN');
    expect(badge.label).toContain('Bidding Open');
    expect(badge.class).toBe('badge-success');
  });

  it('should return correct badge for FROZEN_BY_AI', () => {
    const badge = getStatusBadge('FROZEN_BY_AI');
    expect(badge.label).toContain('Frozen');
    expect(badge.class).toBe('badge-danger');
  });

  it('should return correct badge for AWARDED', () => {
    const badge = getStatusBadge('AWARDED');
    expect(badge.label).toContain('Awarded');
    expect(badge.class).toBe('badge-success');
  });

  it('should return correct badge for UNDER_EVALUATION', () => {
    const badge = getStatusBadge('UNDER_EVALUATION');
    expect(badge.label).toContain('Review');
    expect(badge.class).toBe('badge-warning');
  });

  it('should handle all known statuses', () => {
    const statuses = ['DRAFT', 'PUBLISHED', 'BIDDING_OPEN', 'UNDER_EVALUATION', 'AWARDED', 'FROZEN_BY_AI', 'CANCELLED', 'COMMITTED', 'REVEALED'];
    for (const s of statuses) {
      const badge = getStatusBadge(s);
      expect(badge.class).toBeTruthy();
      expect(badge.label).toBeTruthy();
      expect(badge.label).not.toBe(s); // Should have a friendly label, not raw status
    }
  });

  it('should return fallback for unknown status', () => {
    const badge = getStatusBadge('UNKNOWN_STATUS');
    expect(badge.class).toBe('badge-info');
    expect(badge.label).toBe('UNKNOWN_STATUS');
  });
});

describe('formatPaise', () => {
  it('should format crores correctly', () => {
    expect(formatPaise(450_00_00_000 * 100)).toContain('Cr');
  });

  it('should format lakhs correctly', () => {
    expect(formatPaise(5_00_000 * 100)).toContain('L');
  });

  it('should include ₹ symbol', () => {
    expect(formatPaise(100 * 100)).toContain('₹');
  });
});
