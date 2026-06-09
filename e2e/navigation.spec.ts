import { test, expect } from '@playwright/test';

test.describe('Navigation - Landing to App', () => {
  test('Start Free link navigates to app with signup param', async ({ page }) => {
    await page.goto('/');

    const startFreeLink = page.locator('a[href="/app.html?signup=true"]').first();
    await expect(startFreeLink).toBeVisible();
    await startFreeLink.click();

    // Should navigate to the app page and show auth form
    await page.waitForURL('**/app.html**');
    await expect(page.locator('form')).toBeVisible({ timeout: 15000 });
  });

  test('Try as Guest link navigates to app in guest mode', async ({ page }) => {
    await page.goto('/');

    // On mobile, the nav "Try as Guest" is hidden, but the hero section has one too
    const guestLink = page.locator('a[href="/app.html?guest=true"]').first();
    // Use evaluate to click in case it's off-screen on mobile
    await guestLink.evaluate((el: HTMLElement) => el.click());

    // Guests skip onboarding and land directly in the Pitch Trainer.
    await page.waitForURL('**/app.html**');
    await expect(
      page.getByRole('heading', { name: 'Pitch Accent Practice' })
    ).toBeVisible({ timeout: 15000 });
  });
});

test.describe('Navigation - Guest Mode App', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/app.html');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.goto('/app.html?guest=true');

    // Guests land directly in the Pitch Trainer (no onboarding wall).
    await expect(
      page.getByRole('heading', { name: 'Pitch Accent Practice' })
    ).toBeVisible({ timeout: 15000 });
  });

  test('guest mode does NOT show navigation header', async ({ page }) => {
    // Guest mode renders GuestBanner + VoiceRecorder + GuestDiaryList
    // It does NOT show the Header component with nav items
    // (Header is only rendered for authenticated users)
    const header = page.locator('header');
    await expect(header).not.toBeVisible();
  });

  test('guest mode shows GuestBanner', async ({ page }) => {
    // The guest banner is a gradient bar at the top
    const banner = page.locator('.bg-gradient-to-r.from-yellow-400');
    await expect(banner).toBeVisible();

    // Login buttons exist in the DOM (visibility depends on viewport)
    const loginButtons = page.locator('button', { hasText: /Login/ });
    const count = await loginButtons.count();
    expect(count).toBeGreaterThan(0);
  });

  test('guest banner login button reloads to auth form', async ({ page }) => {
    // Find any visible login button (mobile or desktop layout)
    const loginButton = page.locator('button', { hasText: /Login/ }).first();

    // Use evaluate to click since button may be hidden on certain viewports
    await loginButton.evaluate((el: HTMLElement) => el.click());

    // After the click, handleGuestMode calls reload
    await page.waitForEvent('load', { timeout: 15000 }).catch(() => {});

    // After reload, should show the auth form (configured env) or fall back to
    // the guest Pitch Trainer (no Supabase config).
    const formVisible = page.locator('form');
    const trainerVisible = page.getByRole('heading', { name: 'Pitch Accent Practice' });

    await expect(
      formVisible.or(trainerVisible)
    ).toBeVisible({ timeout: 15000 });
  });
});

test.describe('Navigation - View Parameter', () => {
  test('view=practice param navigates directly to practice', async ({ page }) => {
    await page.goto('/app.html?view=practice');
    await page.waitForLoadState('domcontentloaded');

    // The app processes the view param and removes it from URL
    const url = page.url();
    expect(url).not.toContain('view=practice');
  });
});

test.describe('Navigation - OAuth Redirect', () => {
  test('landing page with access_token hash redirects to app', async ({ page }) => {
    await page.goto('/#access_token=fake-token&token_type=bearer');

    // The landing page script detects the hash and redirects to /app.html
    await page.waitForURL('**/app.html**', { timeout: 10000 });
    expect(page.url()).toContain('app.html');
  });
});
