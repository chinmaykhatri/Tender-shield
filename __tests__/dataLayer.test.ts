/**
 * TenderShield — Data Layer Tests
 * Tests the mock data integrity that judges will see.
 */

import { describe, it, expect } from 'vitest';
import {
  DEMO_TENDERS, DEMO_STATS, DEMO_BLOCKCHAIN_FEED,
} from '@/lib/dataLayer';

describe('DEMO_TENDERS', () => {
  it('should have exactly 8 diverse tenders', () => {
    expect(DEMO_TENDERS.length).toBe(8);
  });

  it('should have unique IDs for every tender', () => {
    const ids = DEMO_TENDERS.map(t => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('should cover all 4 statuses', () => {
    const statuses = new Set(DEMO_TENDERS.map(t => t.status));
    expect(statuses).toContain('BIDDING_OPEN');
    expect(statuses).toContain('UNDER_EVALUATION');
    expect(statuses).toContain('AWARDED');
    expect(statuses).toContain('FROZEN_BY_AI');
  });

  it('should have risk scores in valid range (0-100)', () => {
    for (const t of DEMO_TENDERS) {
      expect(t.risk_score).toBeGreaterThanOrEqual(0);
      expect(t.risk_score).toBeLessThanOrEqual(100);
    }
  });

  it('should have valid risk levels', () => {
    const validLevels = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
    for (const t of DEMO_TENDERS) {
      expect(validLevels).toContain(t.risk_level);
    }
  });

  it('should have non-empty titles and descriptions', () => {
    for (const t of DEMO_TENDERS) {
      expect(t.title.length).toBeGreaterThan(10);
      expect(t.description.length).toBeGreaterThan(20);
    }
  });
});

describe('Tender lookup by ID', () => {
  it('should find correct tender when searching by ID', () => {
    const first = DEMO_TENDERS[0];
    const result = DEMO_TENDERS.find(t => t.id === first.id);
    expect(result).toBeTruthy();
    expect(result?.id).toBe(first.id);
    expect(result?.title).toBe(first.title);
  });

  it('should return undefined for invalid ID', () => {
    const result = DEMO_TENDERS.find(t => t.id === 'NONEXISTENT-ID-12345');
    expect(result).toBeUndefined();
  });
});

describe('DEMO_STATS', () => {
  it('should have ministry breakdown with 8 ministries', () => {
    expect(DEMO_STATS.ministry_breakdown.length).toBe(8);
  });

  it('should have positive fraud prevented value', () => {
    expect(DEMO_STATS.fraud_prevented_value_crore).toBeGreaterThan(0);
  });

  it('should have risk distribution', () => {
    expect(DEMO_STATS.risk_distribution.length).toBeGreaterThan(0);
  });
});

describe('DEMO_BLOCKCHAIN_FEED', () => {
  it('should have multiple events', () => {
    expect(DEMO_BLOCKCHAIN_FEED.length).toBeGreaterThan(5);
  });

  it('should have valid event types', () => {
    for (const e of DEMO_BLOCKCHAIN_FEED) {
      expect(e.event).toBeTruthy();
      expect(e.tx).toBeTruthy();
      expect(e.ministry).toBeTruthy();
    }
  });
});

describe('DEMO_BLOCKCHAIN_FEED diversity', () => {
  it('should cover multiple ministries', () => {
    const ministries = new Set(DEMO_BLOCKCHAIN_FEED.map(e => e.ministry));
    expect(ministries.size).toBeGreaterThan(3);
  });

  it('should have different event types', () => {
    const types = new Set(DEMO_BLOCKCHAIN_FEED.map(e => e.event));
    expect(types.size).toBeGreaterThan(3);
  });
});
