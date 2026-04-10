import { test, expect } from '@playwright/test';

test.describe('Verification Flow', () => {
  test('should load verification portal', async ({ page }) => {
    await page.goto('/verify');
    await expect(page.locator('body')).toContainText('Tender');
  });

  test('should show result when verifying a tender', async ({ page }) => {
    await page.goto('/verify?tender=TDR-TEST-001');
    // Wait for verification to complete
    await page.waitForTimeout(3000);
    // Should show either verified or not-found result
    const body = await page.locator('body').textContent();
    expect(body?.length).toBeGreaterThan(100);
  });

  test('should load scan page', async ({ page }) => {
    await page.goto('/scan');
    await expect(page.locator('body')).toContainText('TenderShield Scanner');
  });
});
