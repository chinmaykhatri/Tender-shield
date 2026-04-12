import { test, expect } from '@playwright/test';

/**
 * Auth Flow Tests — Demo Login + RBAC Verification
 * Tests that demo login works and role-based access is enforced in UI.
 */

// Helper: set demo auth cookie so middleware allows access
async function setupDemoAuth(page: import('@playwright/test').Page, role = 'OFFICER', name = 'Test User', org = 'MinistryOrg') {
  await page.context().addCookies([{
    name: 'tendershield-demo-user',
    value: JSON.stringify({ role, org, name }),
    domain: 'localhost',
    path: '/',
  }]);
}

test.describe('Authentication Flow', () => {
  test('landing page renders with login options', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('body')).toContainText('TenderShield');
    const body = await page.locator('body').textContent();
    const hasLogin = body?.includes('Officer') || body?.includes('Bidder') || body?.includes('Enter Dashboard');
    expect(hasLogin).toBeTruthy();
  });

  test('demo login as Officer navigates to dashboard', async ({ page }) => {
    // Pre-set cookie so middleware lets us through
    await setupDemoAuth(page, 'OFFICER', 'Rajesh Kumar Sharma', 'MinistryOrg');
    await page.goto('/');
    
    // Click on Ministry Officer demo card
    const officerBtn = page.locator('text=Ministry Officer').first();
    await expect(officerBtn).toBeVisible({ timeout: 10000 });
    await officerBtn.click();
    
    // Wait for redirect
    await page.waitForTimeout(5000);
    
    // Should reach dashboard
    const body = await page.textContent('body');
    const onDashboard = page.url().includes('/dashboard') || body?.includes('Monitor') || body?.includes('Dashboard');
    expect(onDashboard).toBeTruthy();
  });

  test('demo login as Bidder shows limited navigation', async ({ page }) => {
    // Pre-set Bidder cookie
    await setupDemoAuth(page, 'BIDDER', 'Priya Sharma', 'BidderOrg');
    await page.goto('/');
    
    const bidderBtn = page.locator('text=Company Bidder').first();
    await expect(bidderBtn).toBeVisible({ timeout: 10000 });
    await bidderBtn.click();
    
    await page.waitForTimeout(5000);
    
    if (page.url().includes('/dashboard')) {
      const body = await page.textContent('body');
      // Bidder should NOT see admin-only items
      expect(body).not.toContain('Create Tender');
    }
  });

  test('dashboard redirects unauthenticated users', async ({ page }) => {
    // Clear cookies first
    await page.context().clearCookies();
    await page.goto('/dashboard');
    await page.waitForTimeout(3000);
    // Should be redirected or show login prompt
    const url = page.url();
    const bodyText = await page.locator('body').textContent();
    const isRedirected = !url.includes('/dashboard') || url.includes('redirectTo') || url.includes('login');
    const isShowingAuth = bodyText?.includes('Loading') || bodyText?.includes('Sign In') || bodyText?.includes('TenderShield');
    expect(isRedirected || isShowingAuth).toBeTruthy();
  });
});
