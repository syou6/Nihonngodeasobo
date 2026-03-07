import { test, expect } from '@playwright/test';

test.describe('Auth Form', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to app with signup param to trigger auth form display
    // The app checks for Supabase config; without valid env vars it goes to guest mode.
    // With signup=true, it sets sessionStorage flags before auth init.
    await page.goto('/app.html?signup=true');
  });

  test('renders sign up form by default when signup param is set', async ({ page }) => {
    // Auth form should appear - it shows either Login or Sign Up
    // With signup=true, the form should show Sign Up mode
    const authForm = page.locator('form');
    await expect(authForm).toBeVisible({ timeout: 15000 });

    // Should show email and password fields
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();

    // In sign up mode, name field should be visible
    await expect(page.locator('input[type="text"]')).toBeVisible();
  });

  test('renders login form when login param is set', async ({ page }) => {
    await page.goto('/app.html?login=true');

    const authForm = page.locator('form');
    await expect(authForm).toBeVisible({ timeout: 15000 });

    // Should show email and password
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();

    // Login mode should NOT show name field
    const nameInputs = page.locator('input[type="text"]');
    await expect(nameInputs).toHaveCount(0);
  });

  test('can toggle between login and sign up modes', async ({ page }) => {
    const authForm = page.locator('form');
    await expect(authForm).toBeVisible({ timeout: 15000 });

    // Find the toggle button - it contains Login or Sign Up text with arrow
    const toggleButton = page.locator('button', { hasText: /Login|Sign Up/ }).last();
    await expect(toggleButton).toBeVisible();

    // Click toggle to switch modes
    await toggleButton.click();

    // Form should still be visible after toggle
    await expect(authForm).toBeVisible();
  });

  test('shows Google sign-in button', async ({ page }) => {
    const authForm = page.locator('form');
    await expect(authForm).toBeVisible({ timeout: 15000 });

    // Google button should be present
    const googleButton = page.locator('button', { hasText: 'Continue with Google' });
    await expect(googleButton).toBeVisible();
  });

  test('shows Try as Guest button', async ({ page }) => {
    await expect(page.locator('form')).toBeVisible({ timeout: 15000 });

    const guestButton = page.locator('button', { hasText: 'Try as Guest' });
    await expect(guestButton).toBeVisible();

    // Should show "(3 tries)" label
    await expect(page.locator('text=3 tries')).toBeVisible();
  });

  test('shows form validation on empty submit', async ({ page }) => {
    await expect(page.locator('form')).toBeVisible({ timeout: 15000 });

    // Try to submit empty form - HTML5 validation should prevent
    const submitButton = page.locator('form button[type="submit"]');
    await expect(submitButton).toBeVisible();

    // Email field should be required
    const emailInput = page.locator('input[type="email"]');
    const isRequired = await emailInput.getAttribute('required');
    expect(isRequired !== null).toBeTruthy();
  });

  test('shows app logo and branding', async ({ page }) => {
    await expect(page.locator('form')).toBeVisible({ timeout: 15000 });

    // NihonGo branding should be visible on auth page
    await expect(page.locator('text=NihonGo')).toBeVisible();
  });

  test('shows "or" divider between form and Google signin', async ({ page }) => {
    await expect(page.locator('form')).toBeVisible({ timeout: 15000 });

    await expect(page.getByText('or', { exact: true })).toBeVisible();
  });
});
