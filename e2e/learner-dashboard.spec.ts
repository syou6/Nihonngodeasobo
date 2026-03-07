import { test, expect } from '@playwright/test';

/**
 * LearnerDashboard E2E tests.
 *
 * The LearnerDashboard is rendered only for authenticated users. Without real
 * Supabase credentials in the dev environment, the app falls back to either
 * the auth form or guest mode. Therefore these tests focus on:
 *
 * 1. Guest mode UI -- which shares VoiceRecorder and diary components with
 *    the authenticated dashboard
 * 2. Auth form rendering -- verifying the fallback path
 *
 * The authenticated dashboard with greeting, Today's Summary, Teacher's
 * Messages, etc. would require real Supabase credentials or a staging
 * environment with seeded data. Those tests should be run separately
 * against a staging URL with `BASE_URL` env var.
 */

test.describe('LearnerDashboard - Guest Mode View', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/app.html');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.goto('/app.html?guest=true');

    // Skip onboarding to reach the guest app
    await expect(page.locator('text=Japanese learning path')).toBeVisible({ timeout: 15000 });
    await page.locator('button', { hasText: 'Skip' }).click();

    // Wait for the guest app to render
    await expect(
      page.getByRole('heading', { name: 'Record Your Diary' }).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('shows Record Your Diary section with description', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: 'Record Your Diary' }).first()
    ).toBeVisible();

    // Description text
    await expect(
      page.getByText('Speak in Japanese', { exact: false }).first()
    ).toBeVisible();
  });

  test('shows voice recorder with microphone button', async ({ page }) => {
    // The VoiceRecorder component renders a record button
    // Look for the microphone-related UI
    const recordSection = page.locator('.bg-white.rounded-lg.shadow-lg').first();
    await expect(recordSection).toBeVisible();

    // The recorder has a red mic icon
    const micIcon = page.locator('.text-red-500').first();
    await expect(micIcon).toBeVisible();
  });

  test('shows guest banner at top of page', async ({ page }) => {
    // The gradient banner with guest mode info
    const banner = page.locator('.bg-gradient-to-r.from-yellow-400');
    await expect(banner).toBeVisible();
  });

  test('shows recording instruction text', async ({ page }) => {
    // VoiceRecorder should show instruction to press microphone
    await expect(
      page.getByText('Press the microphone', { exact: false }).first()
    ).toBeVisible();
  });

  test('shows GuestDiaryList section (initially empty)', async ({ page }) => {
    // With no recordings, the guest diary list shows empty state
    await expect(
      page.getByText('No diary entries yet', { exact: false }).first()
    ).toBeVisible();
  });
});

test.describe('LearnerDashboard - Auth Fallback', () => {
  test('without Supabase config, navigating to app shows auth form', async ({ page }) => {
    // Clear any guest mode state
    await page.goto('/app.html');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.goto('/app.html');

    // Without valid Supabase env vars, the app should either:
    // 1. Show auth form (if not in guest mode)
    // 2. Fall into guest mode (if no config at all)
    // Both are valid fallbacks
    const hasAuthForm = await page.locator('form').isVisible({ timeout: 15000 }).catch(() => false);
    const hasOnboarding = await page
      .locator('text=Japanese learning path')
      .isVisible()
      .catch(() => false);
    const hasGuestApp = await page
      .getByRole('heading', { name: 'Record Your Diary' })
      .first()
      .isVisible()
      .catch(() => false);

    expect(hasAuthForm || hasOnboarding || hasGuestApp).toBeTruthy();
  });

  test('auth form has all required fields', async ({ page }) => {
    await page.goto('/app.html?login=true');

    const form = page.locator('form');
    await expect(form).toBeVisible({ timeout: 15000 });

    // Email and password inputs
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();

    // Submit button
    await expect(form.locator('button[type="submit"]')).toBeVisible();

    // Google sign-in
    await expect(page.locator('button', { hasText: 'Continue with Google' })).toBeVisible();

    // Guest mode fallback
    await expect(page.locator('button', { hasText: 'Try as Guest' })).toBeVisible();
  });

  test('clicking Try as Guest from auth form enters guest mode', async ({ page }) => {
    await page.goto('/app.html?login=true');

    const form = page.locator('form');
    await expect(form).toBeVisible({ timeout: 15000 });

    // Click Try as Guest -- this calls window.location.reload()
    const guestButton = page.locator('button', { hasText: 'Try as Guest' });
    await expect(guestButton).toBeVisible();

    // Wait for the reload triggered by the guest button
    await Promise.all([
      page.waitForEvent('load', { timeout: 15000 }),
      guestButton.click(),
    ]);

    // After reload, should be in guest mode.
    // Wait for framer-motion animation to complete using Playwright's .or() combinator.
    const onboardingText = page.locator('text=Japanese learning path');
    const guestHeading = page.getByRole('heading', { name: 'Record Your Diary' }).first();

    await expect(onboardingText.or(guestHeading)).toBeVisible({ timeout: 15000 });
  });
});

test.describe('LearnerDashboard - Staging Only', () => {
  // These tests require a real Supabase backend and should only run against staging.
  // Skip in local dev where Supabase credentials are not available.

  const isStaging = !!process.env.STAGING_URL;

  test.skip(!isStaging, 'Requires staging environment with Supabase credentials');

  test('authenticated dashboard shows greeting', async ({ page }) => {
    await page.goto('/app.html');

    // On staging with valid Supabase config, user should see the dashboard
    const greetingPattern = /Good (morning|afternoon|evening)/;
    await expect(page.locator('h1').filter({ hasText: greetingPattern })).toBeVisible({
      timeout: 15000,
    });
  });

  test('authenticated dashboard shows Today Summary', async ({ page }) => {
    await page.goto('/app.html');

    await expect(page.locator('h1').filter({ hasText: /Good/ })).toBeVisible({ timeout: 15000 });
    await expect(page.locator("text=Today's Summary")).toBeVisible();
    await expect(page.locator('text=Speaking Score')).toBeVisible();
    await expect(page.locator("text=Today's Mood")).toBeVisible();
    await expect(page.locator("text=Teacher's Comments")).toBeVisible();
  });

  test('authenticated dashboard shows Teacher Messages', async ({ page }) => {
    await page.goto('/app.html');

    await expect(page.locator('h1').filter({ hasText: /Good/ })).toBeVisible({ timeout: 15000 });
    await expect(page.locator("text=Teacher's Messages")).toBeVisible();
  });
});
