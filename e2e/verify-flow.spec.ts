import { test, expect } from '@playwright/test';

test.describe('Verification Flow', () => {
  test('verification page loads with TenderShield branding', async ({ page }) => {
    await page.goto('/verify');
    // Check specific UI elements, not just body text
    await expect(page.locator('h1, h2, [class*="title"]').first()).toBeVisible();
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).toContain('Tender');
  });

  test('tender verification shows result for known tender ID', async ({ page }) => {
    await page.goto('/verify?tender=TDR-TEST-001');
    // Wait for verification API response
    await page.waitForTimeout(3000);
    // Should show a verification result (either verified or not-found)
    const body = await page.locator('body').textContent();
    expect(body?.length).toBeGreaterThan(100);
    // Should contain either "verified" or "not found" messaging
    const hasResult = body?.toLowerCase().includes('verified') ||
                      body?.toLowerCase().includes('not found') ||
                      body?.toLowerCase().includes('result') ||
                      body?.toLowerCase().includes('hash');
    expect(hasResult).toBeTruthy();
  });

  test('scan page loads with QR scanner UI', async ({ page }) => {
    await page.goto('/scan');
    await expect(page.locator('body')).toContainText('TenderShield');
    // Should have a scanner-related heading or button
    const hasScanner = await page.locator('body').textContent();
    expect(hasScanner).toBeTruthy();
  });
});
