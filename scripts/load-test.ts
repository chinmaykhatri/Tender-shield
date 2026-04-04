/**
 * Load Test Script — TenderShield
 * ═══════════════════════════════════
 * 
 * Simulates concurrent procurement lifecycle operations to validate
 * multi-tenancy and performance under load.
 * 
 * Usage:
 *   npx tsx scripts/load-test.ts
 *   npx tsx scripts/load-test.ts --base-url http://localhost:3000 --concurrency 10
 */

const BASE_URL = process.argv.includes('--base-url') 
  ? process.argv[process.argv.indexOf('--base-url') + 1]
  : 'http://localhost:3000';

const CONCURRENCY = process.argv.includes('--concurrency')
  ? parseInt(process.argv[process.argv.indexOf('--concurrency') + 1])
  : 5;

interface TestResult {
  name: string;
  status: number;
  latencyMs: number;
  success: boolean;
  error?: string;
}

const results: TestResult[] = [];

async function timedFetch(name: string, url: string, options?: RequestInit): Promise<TestResult> {
  const start = Date.now();
  try {
    const resp = await fetch(url, options);
    const latency = Date.now() - start;
    const result: TestResult = {
      name,
      status: resp.status,
      latencyMs: latency,
      success: resp.status >= 200 && resp.status < 300,
    };
    results.push(result);
    return result;
  } catch (e: any) {
    const latency = Date.now() - start;
    const result: TestResult = {
      name,
      status: 0,
      latencyMs: latency,
      success: false,
      error: e.message,
    };
    results.push(result);
    return result;
  }
}

async function runLifecycle(id: number): Promise<void> {
  const prefix = `[Tenant ${id}]`;
  console.log(`${prefix} Creating tender...`);
  
  // 1. Create tender
  const createRes = await timedFetch(
    `${prefix} Create Tender`,
    `${BASE_URL}/api/procurement-lifecycle`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create',
        title: `Load Test Tender ${id}`,
        ministry: `MoT${id}`,
        estimatedValue: 50 + Math.random() * 200,
        category: ['GOODS', 'WORKS', 'SERVICES'][id % 3],
      }),
    }
  );
  
  if (!createRes.success) {
    console.log(`${prefix} ❌ Create failed (${createRes.status})`);
    return;
  }
  
  // Parse tender_id from response
  let tenderId: string = '';
  try {
    const resp = await fetch(`${BASE_URL}/api/procurement-lifecycle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create',
        title: `Load Test Tender ${id}-b`,
        ministry: `MoT${id}`,
        estimatedValue: 100,
        category: 'GOODS',
      }),
    });
    const data = await resp.json();
    tenderId = data.tender_id;
  } catch {
    tenderId = '';
  }
  
  // 2. Submit bids
  const bidders = ['AlphaCorp', 'BetaIndustries', 'GammaLtd'];
  for (const company of bidders) {
    await timedFetch(
      `${prefix} Submit Bid (${company})`,
      `${BASE_URL}/api/procurement-lifecycle`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'submit-bid',
          tender_id: tenderId,
          bidder: company.toLowerCase(),
          company,
          amount: (40 + Math.random() * 100).toFixed(2),
        }),
      }
    );
  }
  
  // 3. Close bidding
  await timedFetch(
    `${prefix} Close Bidding`,
    `${BASE_URL}/api/procurement-lifecycle`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'close-bidding', tender_id: tenderId }),
    }
  );
  
  // 4. Reveal
  await timedFetch(
    `${prefix} Reveal Bids`,
    `${BASE_URL}/api/procurement-lifecycle`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reveal', tender_id: tenderId }),
    }
  );
  
  // 5. Evaluate (ML + AI)
  await timedFetch(
    `${prefix} Evaluate`,
    `${BASE_URL}/api/procurement-lifecycle`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'evaluate', tender_id: tenderId }),
    }
  );
  
  // 6. Award
  await timedFetch(
    `${prefix} Award`,
    `${BASE_URL}/api/procurement-lifecycle`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'award', tender_id: tenderId }),
    }
  );
  
  console.log(`${prefix} ✅ Lifecycle complete`);
}

async function main() {
  console.log(`\n═══════════════════════════════════════════`);
  console.log(`🔥 TenderShield Load Test`);
  console.log(`   Base URL:    ${BASE_URL}`);
  console.log(`   Concurrency: ${CONCURRENCY} parallel tenants`);
  console.log(`═══════════════════════════════════════════\n`);
  
  const start = Date.now();
  
  // Run concurrent lifecycles
  const promises = Array.from({ length: CONCURRENCY }, (_, i) => runLifecycle(i + 1));
  await Promise.allSettled(promises);
  
  const totalTime = Date.now() - start;
  
  // ─── Report ──────────────────────────────────────────
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  const latencies = results.map(r => r.latencyMs).sort((a, b) => a - b);
  
  const p50 = latencies[Math.floor(latencies.length * 0.5)] || 0;
  const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;
  const p99 = latencies[Math.floor(latencies.length * 0.99)] || 0;
  const avg = latencies.reduce((a, b) => a + b, 0) / (latencies.length || 1);
  
  console.log(`\n═══════════════════════════════════════════`);
  console.log(`📊 Load Test Results`);
  console.log(`───────────────────────────────────────────`);
  console.log(`   Total requests:  ${results.length}`);
  console.log(`   Successful:      ${successful.length} (${(successful.length / results.length * 100).toFixed(1)}%)`);
  console.log(`   Failed:          ${failed.length}`);
  console.log(`   Total time:      ${(totalTime / 1000).toFixed(2)}s`);
  console.log(`   Throughput:      ${(results.length / (totalTime / 1000)).toFixed(1)} req/s`);
  console.log(`   ─────────────────────────────────────`);
  console.log(`   Latency (avg):   ${avg.toFixed(0)}ms`);
  console.log(`   Latency (p50):   ${p50}ms`);
  console.log(`   Latency (p95):   ${p95}ms`);
  console.log(`   Latency (p99):   ${p99}ms`);
  console.log(`═══════════════════════════════════════════`);
  
  if (failed.length > 0) {
    console.log(`\n❌ Failed requests:`);
    for (const f of failed.slice(0, 10)) {
      console.log(`   ${f.name}: ${f.error || `HTTP ${f.status}`}`);
    }
  }
  
  // Exit with non-zero if >20% failure
  if (failed.length / results.length > 0.2) {
    console.log(`\n🚨 FAIL: >20% failure rate`);
    process.exit(1);
  } else {
    console.log(`\n✅ PASS: ${(successful.length / results.length * 100).toFixed(1)}% success rate`);
  }
}

main().catch(console.error);
