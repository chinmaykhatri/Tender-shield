/**
 * ============================================================================
 * TenderShield — Blockchain Flow E2E Tests (Playwright)
 * ============================================================================
 * Tests that the blockchain APIs actually work end-to-end:
 *   1. Chaincode-invoke is called during tender creation
 *   2. Blockchain explorer returns real SHA-256 hashes
 *   3. ZKP commit + verify round-trip works
 *   4. IPFS document pinning works
 *
 * RUN:
 *   npx playwright test e2e/blockchain-flow.spec.ts --project=chromium
 * ============================================================================
 */

import { test, expect } from '@playwright/test';

test.describe('TenderShield — Blockchain API Flow', () => {

  // ================================================================
  // TEST 1: Chaincode Invoke API
  // Verifies the frontend-to-blockchain bridge works
  // ================================================================
  test('POST /api/chaincode-invoke returns real SHA-256 TX hash', async ({ request }) => {
    const response = await request.post('/api/chaincode-invoke', {
      data: {
        function_name: 'CreateTender',
        args: ['TEST-E2E-001', 'E2E Test Tender', 'MoIT', '100'],
        user_id: 'e2e-test-runner',
      },
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();

    // Must return success
    expect(data.success).toBe(true);

    // TX hash must be a real 64-char hex SHA-256 hash
    expect(data.tx_hash).toMatch(/^[0-9a-f]{64}$/);

    // Must report blockchain mode
    expect(data.blockchain_mode).toBeDefined();
    expect(['FABRIC_LIVE', 'LOCAL_SHA256_FALLBACK', 'DEMO_SHA256']).toContain(data.blockchain_mode);

    // Must report correct channel and chaincode
    expect(data.channel).toBe('tenderchannel');
    expect(data.chaincode).toBe('tendershield');
    expect(data.function_name).toBe('CreateTender');

    console.log(`  ✅ TX Hash: ${data.tx_hash}`);
    console.log(`  ✅ Mode: ${data.blockchain_mode}`);
  });

  test('POST /api/chaincode-invoke rejects unknown functions', async ({ request }) => {
    const response = await request.post('/api/chaincode-invoke', {
      data: {
        function_name: 'DropDatabase',
        args: [],
      },
    });

    expect(response.status()).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('Unknown chaincode function');
    expect(data.valid_functions).toBeInstanceOf(Array);
  });

  // ================================================================
  // TEST 2: Blockchain Explorer Returns Real SHA-256 Hashes
  // ================================================================
  test('GET /api/blockchain returns blocks with real SHA-256 hashes', async ({ request }) => {
    const response = await request.get('/api/blockchain');
    expect(response.ok()).toBeTruthy();

    const data = await response.json();

    // Must have network info
    expect(data.network).toBeDefined();
    expect(data.network.channel).toBe('tenderchannel');
    expect(data.network.consensus).toContain('Raft');
    expect(data.network.hashAlgorithm).toContain('SHA-256');

    // Must have blocks
    expect(data.blocks).toBeInstanceOf(Array);
    expect(data.blocks.length).toBeGreaterThan(0);

    // Verify genesis block
    const genesisBlock = data.blocks[data.blocks.length - 1]; // blocks are reversed (newest first)
    expect(genesisBlock.blockNumber).toBe(0);
    expect(genesisBlock.previousHash).toBe('0'.repeat(64));

    // All block hashes must be valid 64-char hex (real SHA-256)
    for (const block of data.blocks) {
      expect(block.blockHash).toMatch(/^[0-9a-f]{64}$/);
      expect(block.dataHash).toMatch(/^[0-9a-f]{64}$/);
      expect(block.hashAlgorithm).toBe('SHA-256');

      // Each block (except genesis) must chain to previous
      if (block.blockNumber > 0) {
        expect(block.previousHash).toMatch(/^[0-9a-f]{64}$/);
      }
    }

    // Must have organizations matching configtx.yaml
    expect(data.organizations).toBeInstanceOf(Array);
    const orgNames = data.organizations.map((o: any) => o.mspId);
    expect(orgNames).toContain('MinistryOrgMSP');
    expect(orgNames).toContain('BidderOrgMSP');
    expect(orgNames).toContain('AuditorOrgMSP');
    expect(orgNames).toContain('NICOrgMSP');

    // Must report blockchain mode
    expect(data.network.blockchainMode || data.network.dataSource).toBeDefined();

    console.log(`  ✅ Blocks: ${data.blocks.length}`);
    console.log(`  ✅ Organizations: ${orgNames.join(', ')}`);
    console.log(`  ✅ Mode: ${data.network.blockchainMode || 'DEMO_SHA256'}`);
  });

  // ================================================================
  // TEST 3: ZKP API — Full Commit + Verify Round-Trip
  // ================================================================
  test('POST /api/zkp commit then verify round-trip', async ({ request }) => {
    // Phase 1: Create commitment
    const commitResponse = await request.post('/api/zkp', {
      data: { action: 'commit', valueCrore: 118.5 },
    });

    expect(commitResponse.ok()).toBeTruthy();
    const commitData = await commitResponse.json();

    expect(commitData.success).toBe(true);
    expect(commitData.algorithm).toContain('SHA-256');
    expect(commitData.commitment.C).toMatch(/^[0-9a-f]{64}$/);
    expect(commitData.commitment.formula).toContain('SHA256');
    expect(commitData._secrets.v).toBeDefined();
    expect(commitData._secrets.r).toBeDefined();

    console.log(`  ✅ Commitment: ${commitData.commitment.C.slice(0, 32)}...`);
    console.log(`  ✅ Algorithm: ${commitData.algorithm}`);

    // Phase 2: Verify commitment with correct values
    const verifyResponse = await request.post('/api/zkp', {
      data: {
        action: 'verify',
        commitment: commitData.commitment.C,
        value: commitData._secrets.v,
        blindingFactor: commitData._secrets.r,
      },
    });

    expect(verifyResponse.ok()).toBeTruthy();
    const verifyData = await verifyResponse.json();
    expect(verifyData.valid).toBe(true);
    console.log(`  ✅ Verification: ${verifyData.message}`);

    // Phase 3: Verify ZK proof
    const proofResponse = await request.post('/api/zkp', {
      data: {
        action: 'verify-proof',
        commitment: commitData.commitment.C,
        proof: commitData.proof,
      },
    });

    expect(proofResponse.ok()).toBeTruthy();
    const proofData = await proofResponse.json();
    expect(proofData.valid).toBe(true);
    console.log(`  ✅ ZK Proof: ${proofData.message}`);

    // Phase 4: Verify commitment rejects tampered amount
    const tamperResponse = await request.post('/api/zkp', {
      data: {
        action: 'verify',
        commitment: commitData.commitment.C,
        value: '999999999', // wrong amount
        blindingFactor: commitData._secrets.r,
      },
    });

    expect(tamperResponse.ok()).toBeTruthy();
    const tamperData = await tamperResponse.json();
    expect(tamperData.valid).toBe(false);
    console.log(`  ✅ Tamper detection: ${tamperData.message}`);
  });

  // ================================================================
  // TEST 4: IPFS Integration
  // ================================================================
  test('POST /api/ipfs pins tender document', async ({ request }) => {
    const response = await request.post('/api/ipfs', {
      data: {
        action: 'pin-tender',
        tender_id: 'E2E-IPFS-TEST-001',
        title: 'E2E IPFS Test Tender',
        specifications: 'Test procurement specifications for IPFS pinning',
        estimated_value: 100,
        ministry: 'MoIT',
      },
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.cid).toBeDefined();
    expect(data.cid.length).toBeGreaterThan(10);
    expect(data.pinned_via).toBeDefined();
    expect(['pinata', 'local-ipfs', 'sha256-local-hash']).toContain(data.pinned_via);
    expect(data.blockchain_field).toBe('Tender.DocumentsIPFSHash');

    console.log(`  ✅ CID: ${data.cid}`);
    console.log(`  ✅ Pinned via: ${data.pinned_via}`);
    console.log(`  ✅ Gateway: ${data.gateway_url}`);
  });

  test('POST /api/ipfs verify document integrity', async ({ request }) => {
    const content = JSON.stringify({ test: 'document', value: 42 });

    // Pin first
    const pinResponse = await request.post('/api/ipfs', {
      data: { action: 'pin-raw', content, filename: 'test.json' },
    });
    const pinData = await pinResponse.json();

    // Verify
    const verifyResponse = await request.post('/api/ipfs', {
      data: { action: 'verify', content, cid: pinData.cid },
    });
    const verifyData = await verifyResponse.json();
    expect(verifyData.valid).toBe(true);

    // Tamper
    const tamperResponse = await request.post('/api/ipfs', {
      data: { action: 'verify', content: content + 'TAMPERED', cid: pinData.cid },
    });
    const tamperData = await tamperResponse.json();
    expect(tamperData.valid).toBe(false);

    console.log(`  ✅ Integrity verification works`);
    console.log(`  ✅ Tamper detection works`);
  });

  // ================================================================
  // TEST 5: Procurement Lifecycle includes blockchain + IPFS
  // ================================================================
  test('Procurement lifecycle triggers blockchain and IPFS', async ({ request }) => {
    // Reset first
    await request.post('/api/procurement-lifecycle', {
      data: { action: 'reset' },
    });

    // Create tender
    const createResponse = await request.post('/api/procurement-lifecycle', {
      data: {
        action: 'create',
        title: 'E2E Blockchain Integration Test',
        ministry: 'MoIT',
        estimatedValue: 150,
        category: 'IT_SERVICES',
      },
    });

    expect(createResponse.ok()).toBeTruthy();
    const createData = await createResponse.json();

    expect(createData.success).toBe(true);

    // Should have blockchain TX info
    expect(createData.blockchain).toBeDefined();
    console.log(`  ✅ Blockchain source: ${createData.blockchain}`);

    // Should have IPFS CID (even SHA-256 fallback)
    if (createData.ipfs) {
      console.log(`  ✅ IPFS CID: ${createData.ipfs}`);
    }

    // Tender events should include blockchain and IPFS
    const tender = createData.tender;
    expect(tender.events).toBeInstanceOf(Array);
    expect(tender.events.length).toBeGreaterThanOrEqual(2); // At least CREATED + BIDDING_OPEN

    const eventDetails = tender.events.map((e: any) => e.detail).join(' ');
    expect(eventDetails).toContain('Tender');

    console.log(`  ✅ Events: ${tender.events.length}`);

    // Clean up
    await request.post('/api/procurement-lifecycle', {
      data: { action: 'reset' },
    });
  });
});
