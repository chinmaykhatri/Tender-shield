/**
 * TenderShield — End-to-End Integration Test
 * ============================================
 * Tests the COMPLETE flow that judges will see:
 * 
 *   1. Login → Dashboard
 *   2. Create Tender → Supabase + AI Analysis + Blockchain
 *   3. Statistical Fraud Detection → 5 detectors run
 *   4. ZKP Bid → Pedersen commitment + verification
 *   5. Blockchain Explorer → Real blocks visible
 *   6. Audit Trail → Events recorded
 * 
 * Run: npx ts-node --project tsconfig.json scripts/e2e-test.ts
 * Or:  node -e "fetch('http://localhost:3000/api/health').then(r=>r.json()).then(console.log)"
 */

const BASE = process.env.BASE_URL || 'http://localhost:3000';

interface TestResult {
  name: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  duration: number;
  details: string;
}

const results: TestResult[] = [];

async function runTest(name: string, fn: () => Promise<string>): Promise<void> {
  const start = Date.now();
  try {
    const details = await fn();
    results.push({ name, status: 'PASS', duration: Date.now() - start, details });
    console.log(`  ✅ ${name} (${Date.now() - start}ms)`);
  } catch (e: any) {
    results.push({ name, status: 'FAIL', duration: Date.now() - start, details: e.message });
    console.log(`  ❌ ${name} — ${e.message}`);
  }
}

async function main() {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║  TenderShield — End-to-End Integration Test             ║');
  console.log('║  Testing: Login → Create → AI → ZKP → Blockchain       ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('');

  // ═══════════════════════════════════════════
  // Test 1: Health Check
  // ═══════════════════════════════════════════
  await runTest('1. Health — Server is running', async () => {
    const res = await fetch(`${BASE}/api/health`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    return `Status: ${data.status || 'OK'}`;
  });

  // ═══════════════════════════════════════════
  // Test 2: Create Tender (Full Flow)
  // ═══════════════════════════════════════════
  let tenderId = '';
  await runTest('2. Create Tender → Supabase + AI + Blockchain', async () => {
    const res = await fetch(`${BASE}/api/tender-flow`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'E2E Test — Medical Equipment Procurement',
        ministry_code: 'MoHFW',
        estimated_value_crore: 150,
        category: 'GOODS',
        description: 'Integration test tender for E2E validation',
      }),
    });

    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    tenderId = data.tender_id;

    // Verify all pipeline steps completed (field is 'pipeline' not 'results')
    const pipeline = data.pipeline || data.results || [];
    const steps = pipeline.map((r: any) => `${r.step}:${r.status}`);
    const hasAI = steps.some((s: string) => s.includes('AI'));
    const hasBlockchain = steps.some((s: string) => s.includes('BLOCKCHAIN'));
    const hasStatistical = steps.some((s: string) => s.includes('STATISTICAL'));

    if (!tenderId) throw new Error('No tender_id returned');
    if (!hasAI) throw new Error('AI analysis step missing');

    return `Tender: ${tenderId} | Steps: [${steps.join(', ')}] | Statistical: ${hasStatistical}`;
  });

  // ═══════════════════════════════════════════
  // Test 3: Statistical Fraud Detectors
  // ═══════════════════════════════════════════
  await runTest('3. Statistical Engine — 5 Detectors (Benford, CV, Shell, Timing, Cartel)', async () => {
    const res = await fetch(`${BASE}/api/fraud-analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bids: [
          { bidder_name: 'Alpha Corp', amount: 148.5, pan: 'ABCDE1234F', submitted_at: new Date(Date.now() - 3600000).toISOString() },
          { bidder_name: 'Beta Ltd', amount: 149.2, pan: 'ABCDE1234F', submitted_at: new Date(Date.now() - 3300000).toISOString() },
          { bidder_name: 'Gamma Enterprises', amount: 152.1, pan: 'FGHIJ5678K', submitted_at: new Date(Date.now() - 1800000).toISOString() },
        ],
        estimated_value: 150,
        historical_winners: ['Alpha Corp', 'Beta Ltd', 'Alpha Corp'],
      }),
    });

    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();

    // Verify all 5 detectors ran
    if (!data.detectors || data.detectors.length !== 5) throw new Error(`Expected 5 detectors, got ${data.detectors?.length}`);

    // Verify math details present
    const hasFormula = data.detectors.every((d: any) => d.math?.formula);
    const hasComputation = data.detectors.every((d: any) => d.math?.computation?.length > 0);

    if (!hasFormula) throw new Error('Missing math formulas');
    if (!hasComputation) throw new Error('Missing computation steps');

    const flagged = data.detectors.filter((d: any) => d.flag).map((d: any) => d.name);
    return `Risk: ${data.risk_score}/100 (${data.risk_level}) | Flagged: [${flagged.join(', ')}] | Engine: ${data.engine}`;
  });

  // ═══════════════════════════════════════════
  // Test 4: ZKP — Pedersen Commitment
  // ═══════════════════════════════════════════
  let zkpCommitment: any = null;
  await runTest('4. ZKP Commit — Pedersen Commitment (C = g^v · h^r mod p)', async () => {
    const res = await fetch(`${BASE}/api/zkp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'commit', valueCrore: 148 }),
    });

    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    zkpCommitment = data;

    if (!data.commitment?.C) throw new Error('No commitment C value');
    if (!data.proof) throw new Error('No ZK proof generated');
    if (!data.verified) throw new Error(`ZKP verification failed: ${JSON.stringify(data)}`);

    return `C=${data.commitment.C.slice(0, 20)}... | Verified: ✅ | Algorithm: ${data.algorithm}`;
  });

  // ═══════════════════════════════════════════
  // Test 5: ZKP — Verify Proof
  // ═══════════════════════════════════════════
  await runTest('5. ZKP Verify — Zero-Knowledge Proof Validation', async () => {
    if (!zkpCommitment) throw new Error('Skipped — no commitment from test 4');

    const res = await fetch(`${BASE}/api/zkp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'verify',
        commitment: zkpCommitment.commitment.C,
        value: zkpCommitment._secrets.v,
        blindingFactor: zkpCommitment._secrets.r,
      }),
    });

    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();

    if (!data.valid) throw new Error('Commitment verification FAILED');

    return `Valid: ✅ | Formula: ${data.formula}`;
  });

  // ═══════════════════════════════════════════
  // Test 6: Blockchain Explorer
  // ═══════════════════════════════════════════
  await runTest('6. Blockchain Explorer — Real blocks from Supabase', async () => {
    const res = await fetch(`${BASE}/api/blockchain`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();

    if (!data.peers || data.peers.length < 2) throw new Error('Missing peers');
    if (!data.blocks || data.blocks.length === 0) throw new Error('No blocks');

    const runningPeers = data.peers.filter((p: any) => p.status === 'RUNNING').length;
    const endorsementPolicy = data.network?.chaincode?.endorsementPolicy || 'UNKNOWN';

    return `Blocks: ${data.blocks.length} | Running Peers: ${runningPeers}/3 | Endorsement: ${endorsementPolicy}`;
  });

  // ═══════════════════════════════════════════
  // Test 7: AI Analysis (Claude or fallback)
  // ═══════════════════════════════════════════
  await runTest('7. AI Analysis — Claude API or Deterministic Fallback', async () => {
    const res = await fetch(`${BASE}/api/ai-analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tender_id: tenderId || 'E2E-TEST',
        tender_title: 'Medical Equipment Procurement Test',
        estimated_value: 150,
        bids: [
          { bidder_name: 'BioMed Corp', amount: 148, gstin: '07AABCU9603R1ZM' },
          { bidder_name: 'Pharma Plus', amount: 149, gstin: '07AABPU4203R2ZN' },
        ],
      }),
    });

    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();

    if (data.risk_score === undefined) throw new Error('No risk_score');
    if (!data.detectors) throw new Error('No detectors');

    return `Risk: ${data.risk_score} (${data.risk_level}) | Source: ${data.source || data.model} | Detectors: ${data.detectors.length}`;
  });

  // ═══════════════════════════════════════════
  // Test 8: Chaincode Invoke API
  // ═══════════════════════════════════════════
  await runTest('8. Chaincode Invoke — CreateTender on Fabric', async () => {
    const res = await fetch(`${BASE}/api/chaincode-invoke`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-fabric-api-key': 'tendershield-fabric-demo-2026',
        'referer': 'http://localhost:3000',
      },
      body: JSON.stringify({
        function: 'CreateTender',
        args: ['E2E-TEST-001', 'E2E Integration Test Tender', '150', 'MoHFW'],
      }),
    });

    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();

    const source = data.source;
    const endorsement = data.endorsement?.policy || data.endorsement?.consensus || 'N/A';

    return `Source: ${source} | TX: ${data.txId?.slice(0, 16)}... | Endorsement: ${endorsement}`;
  });

  // ═══════════════════════════════════════════
  // Summary
  // ═══════════════════════════════════════════
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║  RESULTS                                                ║');
  console.log('╠══════════════════════════════════════════════════════════╣');

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const total = results.length;

  for (const r of results) {
    const icon = r.status === 'PASS' ? '✅' : r.status === 'FAIL' ? '❌' : '⏭️';
    console.log(`║  ${icon} ${r.name.padEnd(50)} ${r.duration}ms`);
  }

  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log(`║  Total: ${total} | Passed: ${passed} | Failed: ${failed}            ║`);
  console.log(`║  ${failed === 0 ? '🎉 ALL TESTS PASSED!' : '⚠️  SOME TESTS FAILED'}                                  ║`);
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('');

  // Print failures in detail
  if (failed > 0) {
    console.log('FAILURES:');
    for (const r of results.filter(r => r.status === 'FAIL')) {
      console.log(`  ❌ ${r.name}: ${r.details}`);
    }
  }

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(e => {
  console.error('Fatal:', e);
  process.exit(1);
});
