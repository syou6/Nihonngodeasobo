import { test, expect } from '@playwright/test';

// ?guest=true is the LP "Score My Pitch" CTA target. The funnel was reworked so
// guests skip onboarding entirely and land directly in the Pitch Trainer (the
// shareable aha). These tests pin that behavior + the trainer's core controls.

test.describe('Guest Mode → Pitch Trainer', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/app.html');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('?guest=true lands directly in the Pitch Trainer (no onboarding wall)', async ({ page }) => {
    await page.goto('/app.html?guest=true');

    // The trainer renders without any onboarding step in between.
    await expect(
      page.getByRole('heading', { name: 'Pitch Accent Practice' })
    ).toBeVisible({ timeout: 15000 });

    // The old onboarding overlay must NOT appear for guests.
    await expect(page.locator('text=Japanese learning path')).toHaveCount(0);
  });

  test('trainer shows the listen + record controls and mastery counter', async ({ page }) => {
    await page.goto('/app.html?guest=true');

    await expect(
      page.getByRole('heading', { name: 'Pitch Accent Practice' })
    ).toBeVisible({ timeout: 15000 });

    await expect(page.getByRole('button', { name: /Listen to a native/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Record & say it/ })).toBeVisible();
    // Fresh guest → nothing mastered yet.
    await expect(page.getByText('✓ 0/66')).toBeVisible();
  });

  test('guest can switch to the Voice Diary tab', async ({ page }) => {
    await page.goto('/app.html?guest=true');

    await expect(
      page.getByRole('heading', { name: 'Pitch Accent Practice' })
    ).toBeVisible({ timeout: 15000 });

    await page.getByRole('button', { name: /Voice Diary/ }).click();
    await expect(
      page.getByRole('heading', { name: 'Record Your Diary' }).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('guest banner shows remaining tries and a login button', async ({ page }) => {
    await page.goto('/app.html?guest=true');

    await expect(
      page.getByRole('heading', { name: 'Pitch Accent Practice' })
    ).toBeVisible({ timeout: 15000 });

    const tries = page.getByText('tries remaining');
    expect(await tries.count()).toBeGreaterThan(0);

    const loginButtons = page.locator('button', { hasText: /Login/ });
    expect(await loginButtons.count()).toBeGreaterThan(0);
  });
});
