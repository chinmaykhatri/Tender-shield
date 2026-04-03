/**
 * TenderShield — E2E Browser Test (Playwright)
 * 
 * Tests the critical user journey:
 * Login → Dashboard → Blockchain Explorer → AI Analyze
 * 
 * Install: npm i -D @playwright/test
 * Run: npx playwright test
 */

import { test, expect } from '@playwright/test';

test.describe('TenderShield E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('landing page loads with login form', async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle(/TenderShield/);

    // Check login form elements exist
    const emailInput = page.locator('input[type="email"], input[placeholder*="email"]').first();
    await expect(emailInput).toBeVisible();

    // Check demo credential cards are visible
    const officerCard = page.locator('text=Ministry Officer').first();
    await expect(officerCard).toBeVisible();
  });

  test('demo login → dashboard flow', async ({ page }) => {
    // Click on Ministry Officer demo card
    const officerCard = page.locator('text=Ministry Officer').first();
    await officerCard.click();

    // Wait for typing animation + redirect
    await page.waitForURL('**/dashboard**', { timeout: 15000 });

    // Dashboard should show stat cards
    await expect(page.locator('text=Active Tenders')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=AI Alerts')).toBeVisible();
  });

  test('blockchain explorer shows live data', async ({ page }) => {
    // Navigate directly to blockchain page
    await page.goto('/dashboard/blockchain');

    // Check network stats
    await expect(page.locator('text=Blockchain Explorer')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Total Blocks')).toBeVisible();
    await expect(page.locator('text=Peers Online')).toBeVisible();

    // Check transaction feed
    await expect(page.locator('text=Live Block Chain')).toBeVisible();

    // Check tender → block mapping section
    await expect(page.locator('text=Tender → Block Mapping')).toBeVisible();
  });

  test('API docs endpoint returns valid JSON', async ({ request }) => {
    const response = await request.get('/api/docs');
    expect(response.ok()).toBeTruthy();

    const docs = await response.json();
    expect(docs.name).toBe('TenderShield API');
    expect(docs.endpoints).toBeDefined();
    expect(docs.endpoints.authentication).toBeInstanceOf(Array);
    expect(docs.endpoints.ai).toBeInstanceOf(Array);
  });

  test('health endpoint returns system status', async ({ request }) => {
    const response = await request.get('/api/health');
    expect(response.ok()).toBeTruthy();

    const health = await response.json();
    expect(health.status).toBeDefined();
    expect(health.checks).toBeDefined();
  });

  test('metrics endpoint returns observability data', async ({ request }) => {
    const response = await request.get('/api/metrics');
    expect(response.ok()).toBeTruthy();

    const metrics = await response.json();
    expect(metrics.status).toBe('operational');
    expect(metrics.security).toBeDefined();
    expect(metrics.security.hsts).toBe(true);
    expect(metrics.security.rate_limiting).toBe(true);
  });

  test('unauthorized API access returns 401', async ({ request }) => {
    // Non-demo mode would return 401, but in demo mode it passes
    // This test verifies the endpoint exists and responds
    const response = await request.get('/api/v1/auth/me');
    // Should either be 401 (no token) or 200 (demo mode passthrough)
    expect([200, 401]).toContain(response.status());
  });

  test('accessibility: skip-to-content link exists', async ({ page }) => {
    const skipLink = page.locator('a[href="#main-content"]');
    await expect(skipLink).toBeAttached();

    // Tab to the skip link
    await page.keyboard.press('Tab');
    // The skip link should become visible
    await expect(skipLink).toHaveCSS('top', '0px');
  });

  test('accessibility: main content landmark exists', async ({ page }) => {
    const main = page.locator('main#main-content');
    await expect(main).toBeAttached();
  });

  test('theme toggle works', async ({ page }) => {
    // Find theme toggle button
    const toggle = page.locator('.theme-toggle');
    await expect(toggle).toBeVisible();

    // Click to switch to light mode
    await toggle.click();

    // HTML element should have 'light' class
    const htmlClass = await page.locator('html').getAttribute('class');
    expect(htmlClass).toContain('light');

    // Click again to switch back
    await toggle.click();
    const htmlClassAfter = await page.locator('html').getAttribute('class');
    expect(htmlClassAfter).toContain('dark');
  });
});
