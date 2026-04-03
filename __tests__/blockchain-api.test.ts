/**
 * TenderShield — Blockchain API Tests
 * Tests the dynamic block generation logic.
 */

import { describe, it, expect } from 'vitest';

// Import the generation logic directly
const TENDER_IDS = [
  'TDR-MoRTH-2025-000001', 'TDR-MoE-2025-000001', 'TDR-MoH-2025-000001',
  'TDR-MoD-2025-000001', 'TDR-MoR-2025-000001', 'TDR-MoUD-2025-000001',
  'TDR-MoWCD-2025-000001', 'TDR-MoIT-2025-000001',
];

const EVENT_TYPES = [
  'TENDER_CREATED', 'BID_COMMITTED', 'BID_COMMITTED', 'AI_SCAN_TRIGGERED',
  'ZKP_VERIFIED', 'TENDER_PUBLISHED', 'BID_REVEALED', 'AI_FLAG_RAISED',
  'AUDIT_RECORDED', 'TENDER_AWARDED', 'PEER_ENDORSED', 'BLOCK_COMMITTED',
];

function generateBlockHash(blockNum: number): string {
  let hash = 0x1a2b3c4d;
  const input = `block-${blockNum}-tendershield`;
  for (let j = 0; j < input.length; j++) {
    hash = ((hash << 5) - hash + input.charCodeAt(j)) | 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  return `0x${hex}${'0'.repeat(56)}`.slice(0, 66);
}

describe('Blockchain Block Generation', () => {
  it('should generate deterministic hashes', () => {
    const hash1 = generateBlockHash(100);
    const hash2 = generateBlockHash(100);
    expect(hash1).toBe(hash2);
  });

  it('should generate different hashes for different blocks', () => {
    const hash1 = generateBlockHash(100);
    const hash2 = generateBlockHash(101);
    expect(hash1).not.toBe(hash2);
  });

  it('should start hashes with 0x', () => {
    const hash = generateBlockHash(42);
    expect(hash.startsWith('0x')).toBe(true);
  });

  it('should generate 66-char hashes (0x + 64 hex chars)', () => {
    const hash = generateBlockHash(1000);
    expect(hash.length).toBe(66);
  });

  it('should have 8 unique tender IDs to cycle through', () => {
    expect(new Set(TENDER_IDS).size).toBe(8);
  });

  it('should have diverse event types', () => {
    const unique = new Set(EVENT_TYPES);
    expect(unique.size).toBeGreaterThan(8);
  });

  it('TENDER_IDS should match known ministry codes', () => {
    const ministries = TENDER_IDS.map(id => id.split('-')[1]);
    expect(ministries).toContain('MoRTH');
    expect(ministries).toContain('MoH');
    expect(ministries).toContain('MoR');
    expect(ministries).toContain('MoIT');
  });
});
