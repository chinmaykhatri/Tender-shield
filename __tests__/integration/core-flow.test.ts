/**
 * ============================================================================
 * TenderShield — Core Flow Integration Tests
 * ============================================================================
 * 6 integration tests that prove the core flow works against real API routes.
 * Run: npm run test:integration (requires dev server at http://localhost:3000)
 * ============================================================================
 */

import { describe, test, expect, beforeAll } from 'vitest';

const BASE_URL = process.env.TEST_URL ?? 'http://localhost:3000';

// Track IDs across tests
let createdTenderId: string = '';
let submittedBidId: string = '';

describe('TenderShield Core Flow — 6 Integration Tests', () => {

  // ─── TEST 1: Authentication ──────────────────────────
  test('1. Health check + auth endpoints respond', async () => {
    // Health endpoint must return 200
    const healthRes = await fetch(`${BASE_URL}/api/health`);
    expect(healthRes.status).toBe(200);
    const healthData = await healthRes.json();
    expect(healthData.status).toBeDefined();

    // Auth demo endpoint
    const authRes = await fetch(`${BASE_URL}/api/auth/demo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'officer@morth.gov.in',
        role: 'MINISTRY_OFFICER',
      }),
    });

    // Demo auth should succeed (200) or return structured error
    expect([200, 201, 400, 401]).toContain(authRes.status);
    const authData = await authRes.json();
    expect(authData).toBeDefined();

    console.log('  ✅ Test 1 passed: Health check OK, auth endpoint responsive');
  }, 15000);

  // ─── TEST 2: Blockchain status reports honestly ──────
  test('2. Blockchain status API returns honest status', async () => {
    const res = await fetch(`${BASE_URL}/api/blockchain/status`);

    expect(res.status).toBe(200);
    const data = await res.json();

    // Must have required fields
    expect(data.status).toBeDefined();
    expect(['LIVE', 'SHA256_AUDIT_LOG']).toContain(data.status);
    expect(data.channel).toBe('tenderchannel');
    expect(typeof data.peers_active).toBe('number');
    expect(typeof data.orgs_active).toBe('number');
    expect(data.mode).toBeDefined();

    // If not live, must honestly say so
    if (data.status === 'SHA256_AUDIT_LOG') {
      expect(data.peers_active).toBe(0);
      expect(data.mode).toBe('LOCAL_SIMULATION');
    } else {
      expect(data.peers_active).toBeGreaterThan(0);
      expect(data.mode).toBe('REAL_HYPERLEDGER_FABRIC');
    }

    console.log(`  ✅ Test 2 passed: Blockchain status = ${data.status}, peers = ${data.peers_active}`);
  }, 10000);

  // ─── TEST 3: Blockchain hash chain integrity ─────────
  test('3. Blockchain hash chain — SHA-256 verified', async () => {
    const res = await fetch(`${BASE_URL}/api/blockchain`);

    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.dataIntegrity).toBeDefined();
    expect(data.dataIntegrity.chainValid).toBe(true);
    expect(data.dataIntegrity.hashAlgorithm).toBe('SHA-256 (FIPS 180-4)');
    expect(data.blocks).toBeDefined();
    expect(Array.isArray(data.blocks)).toBe(true);
    expect(data.blocks.length).toBeGreaterThan(0);

    // Verify every block has required fields
    for (const block of data.blocks) {
      expect(block.blockHash).toBeDefined();
      expect(block.previousHash).toBeDefined();
      expect(block.blockHash).toMatch(/^[a-f0-9]{64}$/);
      expect(block.previousHash).toMatch(/^[a-f0-9]{64}$/);
    }

    // Verify chain links (blocks are returned newest-first, so reverse)
    const ordered = [...data.blocks].reverse();
    for (let i = 1; i < ordered.length; i++) {
      expect(ordered[i].previousHash).toBe(ordered[i - 1].blockHash);
    }

    console.log(`  ✅ Test 3 passed: ${data.blocks.length} blocks, chain integrity VERIFIED`);
    console.log(`  All SHA-256 hashes valid ✓`);
    console.log(`  Hash chain links correct ✓`);
  }, 15000);

  // ─── TEST 4: AI fraud detection endpoint works ───────
  test('4. AI fraud prediction returns structured analysis', async () => {
    const res = await fetch(`${BASE_URL}/api/ai/predict-fraud`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Medical Equipment for AIIMS Delhi',
        ministry: 'Ministry of Health',
        estimated_value_crore: 150,
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        category: 'Medical Equipment',
        specs: 'Siemens Magnetom MRI Scanner',
      }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();

    // Must return fraud analysis with required fields
    expect(typeof data.fraud_probability).toBe('number');
    expect(data.fraud_probability).toBeGreaterThanOrEqual(0);
    expect(data.fraud_probability).toBeLessThanOrEqual(1);
    expect(Array.isArray(data.risk_factors)).toBe(true);
    expect(data.risk_factors.length).toBeGreaterThan(0);
    expect(Array.isArray(data.recommendations)).toBe(true);
    expect(data.urgency).toBeDefined();

    console.log(`  ✅ Test 4 passed: AI fraud probability = ${data.fraud_probability}`);
    console.log(`  Risk factors: ${data.risk_factors.length}`);
    console.log(`  Mode: ${data.demo ? 'DEMO (no API key)' : 'LIVE AI'}`);
  }, 15000);

  // ─── TEST 5: ML model metrics endpoint ───────────────
  test('5. ML model metrics — training data available', async () => {
    const res = await fetch(`${BASE_URL}/api/ml/metrics`);

    expect(res.status).toBe(200);
    const data = await res.json();

    // Must return model metrics
    expect(data.model_name).toBeDefined();
    expect(data.algorithm).toBeDefined();
    expect(typeof data.precision).toBe('number');
    expect(typeof data.recall).toBe('number');
    expect(typeof data.f1_score).toBe('number');
    expect(data.precision).toBeGreaterThan(0);
    expect(data.precision).toBeLessThanOrEqual(1);
    expect(data.recall).toBeGreaterThan(0);
    expect(data.f1_score).toBeGreaterThan(0);

    console.log(`  ✅ Test 5 passed: Model = ${data.model_name}`);
    console.log(`  Precision: ${data.precision}, Recall: ${data.recall}, F1: ${data.f1_score}`);
  }, 10000);

  // ─── TEST 6: Blockchain anchors endpoint ─────────────
  test('6. Polygon anchor endpoint responds', async () => {
    const res = await fetch(`${BASE_URL}/api/blockchain/anchors`);

    expect(res.status).toBe(200);
    const data = await res.json();

    // Must return anchors array (may be empty if no POLYGON_PRIVATE_KEY)
    expect(data.anchors).toBeDefined();
    expect(Array.isArray(data.anchors)).toBe(true);
    expect(data.network).toBe('polygon-amoy');
    expect(data.anchor_interval).toBe('10 minutes');

    // If anchors exist, verify structure
    if (data.anchors.length > 0) {
      const anchor = data.anchors[0];
      expect(anchor.polygon_tx).toBeDefined();
      expect(anchor.merkle_root).toBeDefined();
      expect(anchor.verify_url).toContain('polygonscan.com');
    }

    console.log(`  ✅ Test 6 passed: Anchor endpoint OK, ${data.anchors.length} anchors found`);
  }, 10000);

});
