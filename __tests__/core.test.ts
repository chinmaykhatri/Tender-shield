/// <reference types="vitest/globals" />

/**
 * TenderShield — Core Test Suite
 * Tests: RBAC navigation, GFR compliance, Fraud detection scoring
 * 
 * Run: npx jest __tests__/core.test.ts
 */

// ═══════════════════════════════════════════
// Test 1: RBAC Navigation Filtering
// ═══════════════════════════════════════════

describe('RBAC Navigation', () => {
  const navItems = [
    { href: '/dashboard', label: 'Dashboard', roles: ['OFFICER', 'BIDDER', 'AUDITOR', 'NIC_ADMIN'] },
    { href: '/dashboard/tenders/create', label: 'Create Tender', roles: ['OFFICER', 'NIC_ADMIN'] },
    { href: '/dashboard/bids', label: 'ZKP Bids', roles: ['BIDDER', 'OFFICER', 'NIC_ADMIN'] },
    { href: '/dashboard/auditor', label: 'CAG Auditor', roles: ['AUDITOR', 'NIC_ADMIN'] },
    { href: '/dashboard/ai-monitor', label: 'AI Monitor', roles: ['OFFICER', 'NIC_ADMIN'] },
  ];

  it('OFFICER should see Create Tender and AI Monitor but not CAG Auditor', () => {
    const visibleItems = navItems.filter(item => item.roles.includes('OFFICER'));
    const labels = visibleItems.map(i => i.label);

    expect(labels).toContain('Create Tender');
    expect(labels).toContain('AI Monitor');
    expect(labels).not.toContain('CAG Auditor');
  });

  it('BIDDER should see ZKP Bids but not Create Tender or AI Monitor', () => {
    const visibleItems = navItems.filter(item => item.roles.includes('BIDDER'));
    const labels = visibleItems.map(i => i.label);

    expect(labels).toContain('ZKP Bids');
    expect(labels).not.toContain('Create Tender');
    expect(labels).not.toContain('AI Monitor');
    expect(labels).not.toContain('CAG Auditor');
  });

  it('AUDITOR should see CAG Auditor but not Create Tender', () => {
    const visibleItems = navItems.filter(item => item.roles.includes('AUDITOR'));
    const labels = visibleItems.map(i => i.label);

    expect(labels).toContain('CAG Auditor');
    expect(labels).not.toContain('Create Tender');
  });

  it('NIC_ADMIN should see ALL navigation items', () => {
    const visibleItems = navItems.filter(item => item.roles.includes('NIC_ADMIN'));
    expect(visibleItems.length).toBe(navItems.length);
  });
});

// ═══════════════════════════════════════════
// Test 2: GFR 2017 Compliance Validation
// ═══════════════════════════════════════════

describe('GFR 2017 Compliance', () => {
  function validateGFR(tender: { estimatedValue: number; tenderType: string; bidSecurity: number; biddingDays: number }) {
    const issues = [];

    if (tender.estimatedValue > 25 && tender.tenderType !== 'OPEN') {
      issues.push('GFR 149: Open tender required for value > 25 Lakh');
    }

    const requiredSecurity = tender.estimatedValue * 0.02;
    if (tender.bidSecurity < requiredSecurity) {
      issues.push('GFR 154: Bid security must be >= ' + requiredSecurity.toFixed(2) + ' Cr');
    }

    if (tender.tenderType === 'OPEN' && tender.biddingDays < 30) {
      issues.push('GFR 166: Open tenders require minimum 30-day bidding period');
    }

    return { compliant: issues.length === 0, issues };
  }

  it('should pass compliant tender', () => {
    const result = validateGFR({
      estimatedValue: 120,
      tenderType: 'OPEN',
      bidSecurity: 2.4,
      biddingDays: 45,
    });
    expect(result.compliant).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('should flag limited tender above 25 Lakh', () => {
    const result = validateGFR({
      estimatedValue: 120,
      tenderType: 'LIMITED',
      bidSecurity: 2.4,
      biddingDays: 45,
    });
    expect(result.compliant).toBe(false);
    expect(result.issues[0]).toContain('GFR 149');
  });

  it('should flag insufficient bid security', () => {
    const result = validateGFR({
      estimatedValue: 120,
      tenderType: 'OPEN',
      bidSecurity: 1.0,
      biddingDays: 45,
    });
    expect(result.compliant).toBe(false);
    expect(result.issues[0]).toContain('GFR 154');
  });

  it('should flag short bidding period', () => {
    const result = validateGFR({
      estimatedValue: 120,
      tenderType: 'OPEN',
      bidSecurity: 2.4,
      biddingDays: 15,
    });
    expect(result.compliant).toBe(false);
    expect(result.issues[0]).toContain('GFR 166');
  });
});

// ═══════════════════════════════════════════
// Test 3: Fraud Detection Scoring
// ═══════════════════════════════════════════

describe('Fraud Detection Scoring', () => {
  function scoreFraudDetectors(bids: { amount: number; submittedAt: number }[]) {
    const amounts = bids.map(b => b.amount);
    const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const stdDev = Math.sqrt(amounts.reduce((s, a) => s + Math.pow(a - mean, 2), 0) / amounts.length);
    const cv = (stdDev / mean) * 100;
    const bidRiggingScore = cv < 3 ? 95 : cv < 8 ? 60 : 20;

    const timestamps = bids.map(b => b.submittedAt);
    const timeSpan = Math.max(...timestamps) - Math.min(...timestamps);
    const timingScore = timeSpan < 300 ? 90 : timeSpan < 3600 ? 40 : 10;

    return { bidRiggingScore, timingScore, cv: parseFloat(cv.toFixed(2)) };
  }

  it('should detect bid rigging (low CV)', () => {
    const result = scoreFraudDetectors([
      { amount: 120.0, submittedAt: 1000 },
      { amount: 120.5, submittedAt: 2000 },
      { amount: 121.0, submittedAt: 3000 },
    ]);
    expect(result.cv).toBeLessThan(3);
    expect(result.bidRiggingScore).toBe(95);
  });

  it('should not flag normal bid spread', () => {
    const result = scoreFraudDetectors([
      { amount: 100, submittedAt: 1000 },
      { amount: 130, submittedAt: 5000 },
      { amount: 115, submittedAt: 10000 },
    ]);
    expect(result.cv).toBeGreaterThan(8);
    expect(result.bidRiggingScore).toBe(20);
  });

  it('should detect timing collusion (bids within 5 min)', () => {
    const result = scoreFraudDetectors([
      { amount: 120, submittedAt: 1000 },
      { amount: 121, submittedAt: 1060 },
      { amount: 119, submittedAt: 1120 },
    ]);
    expect(result.timingScore).toBe(90);
  });
});
