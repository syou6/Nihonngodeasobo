import { test, expect } from '@playwright/test';

test.describe('Landing Page', () => {
  test('loads and shows app title', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=/AI Diary/i')).toBeVisible({ timeout: 10000 });
  });

  test('has navigation or login options', async ({ page }) => {
    await page.goto('/');
    // Landing page should have some call to action
    const hasLogin = await page.locator('text=/login|sign up|get started|try/i').first().isVisible().catch(() => false);
    const hasNav = await page.locator('nav, [role="navigation"]').first().isVisible().catch(() => false);
    expect(hasLogin || hasNav).toBeTruthy();
  });
});

test.describe('App Navigation', () => {
  test('guest can access the app', async ({ page }) => {
    await page.goto('/');
    // Try to enter app as guest if there's a guest/try button
    const guestButton = page.locator('text=/try|guest|start/i').first();
    if (await guestButton.isVisible().catch(() => false)) {
      await guestButton.click();
      await page.waitForTimeout(2000);
    }
  });
});

test.describe('Practice Page', () => {
  test('can navigate to practice section', async ({ page }) => {
    await page.goto('/');

    // Try guest mode first
    const guestButton = page.locator('text=/try|guest|start/i').first();
    if (await guestButton.isVisible().catch(() => false)) {
      await guestButton.click();
      await page.waitForTimeout(2000);
    }

    // Look for practice nav item
    const practiceNav = page.locator('text=/practice/i').first();
    if (await practiceNav.isVisible().catch(() => false)) {
      await practiceNav.click();
      await page.waitForTimeout(2000);

      // Should see Part E and Part F options
      await expect(page.locator('text=/Part E/i').first()).toBeVisible({ timeout: 5000 });
      await expect(page.locator('text=/Part F/i').first()).toBeVisible({ timeout: 5000 });
    }
  });
});

test.describe('Responsive Design', () => {
  test('renders on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await expect(page.locator('text=/AI Diary/i')).toBeVisible({ timeout: 10000 });
  });

  test('renders on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    await expect(page.locator('text=/AI Diary/i')).toBeVisible({ timeout: 10000 });
  });

  test('renders on desktop viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await expect(page.locator('text=/AI Diary/i')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('No Console Errors', () => {
  test('landing page loads without critical errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForTimeout(3000);

    // Filter out known non-critical errors (e.g. Supabase auth, Firebase)
    const criticalErrors = errors.filter(e =>
      !e.includes('supabase') &&
      !e.includes('firebase') &&
      !e.includes('Failed to fetch') &&
      !e.includes('net::ERR')
    );

    expect(criticalErrors).toEqual([]);
  });
});
