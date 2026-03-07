import { test, expect } from '@playwright/test';

test.describe('Guest Mode Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any previous guest state
    await page.goto('/app.html');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('entering guest mode shows onboarding overlay', async ({ page }) => {
    await page.goto('/app.html?guest=true');

    // Guest mode should show the OnboardingFlow overlay
    const welcomeOverlay = page.locator('.fixed.inset-0');
    await expect(welcomeOverlay).toBeVisible({ timeout: 15000 });

    // Welcome step shows "Japanese learning path"
    await expect(page.locator('text=Japanese learning path')).toBeVisible();
  });

  test('onboarding welcome step has Let\'s Go button and Skip', async ({ page }) => {
    await page.goto('/app.html?guest=true');

    // Welcome step
    await expect(page.locator('text=Japanese learning path')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=Takes about 2 minutes')).toBeVisible();

    // Let's Go button to proceed
    const goButton = page.locator('button', { hasText: "Let's Go" });
    await expect(goButton).toBeVisible();

    // Skip button available
    const skipButton = page.locator('button', { hasText: 'Skip' });
    await expect(skipButton).toBeVisible();
  });

  test('onboarding proceeds to motivation step after welcome', async ({ page }) => {
    await page.goto('/app.html?guest=true');

    await expect(page.locator('text=Japanese learning path')).toBeVisible({ timeout: 15000 });
    await page.locator('button', { hasText: "Let's Go" }).click();

    // Motivation step: "Why do you want to learn Japanese?"
    await expect(page.locator('text=Why do you want to learn Japanese')).toBeVisible({ timeout: 10000 });
  });

  test('can skip onboarding to reach guest app', async ({ page }) => {
    await page.goto('/app.html?guest=true');

    await expect(page.locator('text=Japanese learning path')).toBeVisible({ timeout: 15000 });

    // Click skip
    const skipButton = page.locator('button', { hasText: 'Skip' });
    await expect(skipButton).toBeVisible();
    await skipButton.click();

    // After skipping, should see the guest app view with Record Your Diary heading
    await expect(
      page.getByRole('heading', { name: 'Record Your Diary' }).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('guest banner shows remaining tries after skipping onboarding', async ({ page }) => {
    await page.goto('/app.html?guest=true');

    // Skip onboarding to get to the app
    await expect(page.locator('text=Japanese learning path')).toBeVisible({ timeout: 15000 });
    await page.locator('button', { hasText: 'Skip' }).click();

    // Wait for guest app view to load
    await expect(
      page.getByRole('heading', { name: 'Record Your Diary' }).first()
    ).toBeVisible({ timeout: 10000 });

    // The GuestBanner renders with mobile (sm:hidden) and desktop (hidden sm:flex) layouts.
    // Check that at least one "tries remaining" text exists in the DOM
    const triesElements = page.getByText('tries remaining');
    const count = await triesElements.count();
    expect(count).toBeGreaterThan(0);
  });

  test('guest banner has login button', async ({ page }) => {
    await page.goto('/app.html?guest=true');

    // Skip onboarding
    await expect(page.locator('text=Japanese learning path')).toBeVisible({ timeout: 15000 });
    await page.locator('button', { hasText: 'Skip' }).click();

    // Wait for guest app view
    await expect(
      page.getByRole('heading', { name: 'Record Your Diary' }).first()
    ).toBeVisible({ timeout: 10000 });

    // The banner has Login buttons in both mobile and desktop layouts
    const loginButtons = page.locator('button', { hasText: /Login/ });
    const count = await loginButtons.count();
    expect(count).toBeGreaterThan(0);
  });
});
