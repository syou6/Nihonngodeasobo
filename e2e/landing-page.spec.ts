import { test, expect } from '@playwright/test';

// The LP is the pitch-accent positioned page (single source: /index.html,
// emitted as dist/index.html). These tests pin its core sections + CTAs.

test.describe('Landing Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('loads with correct title and hero content', async ({ page }) => {
    await expect(page).toHaveTitle(/NihonGo/);

    const hero = page.locator('h1');
    await expect(hero).toContainText('Stop Sounding');
    await expect(hero).toContainText('Like a Foreigner');
  });

  test('shows navigation bar', async ({ page }) => {
    const nav = page.locator('nav');
    await expect(nav).toBeVisible();

    // Desktop nav links (hidden on mobile)
    const viewport = page.viewportSize();
    if (viewport && viewport.width >= 768) {
      await expect(nav.locator('a', { hasText: 'Features' })).toBeVisible();
      await expect(nav.locator('a', { hasText: 'How It Works' })).toBeVisible();
      await expect(nav.locator('a', { hasText: 'Pricing' })).toBeVisible();
    }
  });

  test('has signup and guest CTAs', async ({ page }) => {
    // Signup CTA exists somewhere on the page
    const startFreeLinks = page.locator('a[href="/app.html?signup=true"]');
    expect(await startFreeLinks.count()).toBeGreaterThan(0);

    // Guest CTA (the primary "Score My Pitch — Free" funnel) exists
    const guestLinks = page.locator('a[href="/app.html?guest=true"]');
    expect(await guestLinks.count()).toBeGreaterThan(0);
  });

  test('shows features section with six pitch feature cards', async ({ page }) => {
    const featuresSection = page.locator('#features');
    await expect(featuresSection).toBeVisible();

    await expect(featuresSection.locator('h4', { hasText: 'See Your Pitch vs Native' })).toBeVisible();
    await expect(featuresSection.locator('h4', { hasText: 'Honest Scoring' })).toBeVisible();
    await expect(featuresSection.locator('h4', { hasText: 'All 4 Pitch Patterns' })).toBeVisible();
    await expect(featuresSection.locator('h4', { hasText: 'Minimal Pairs' })).toBeVisible();
    await expect(featuresSection.locator('h4', { hasText: 'Instant Coaching' })).toBeVisible();
    await expect(featuresSection.locator('h4', { hasText: 'Practice Anywhere' })).toBeVisible();
  });

  test('shows how it works section with three steps', async ({ page }) => {
    const howSection = page.locator('#how-it-works');
    await expect(howSection).toBeVisible();

    await expect(howSection.getByText('Listen to a Native', { exact: true })).toBeVisible();
    await expect(howSection.getByText('Say It Yourself', { exact: true })).toBeVisible();
    await expect(howSection.getByText('See Your Drop', { exact: true })).toBeVisible();
  });

  test('shows pricing section with Free and Premium plans', async ({ page }) => {
    const pricingSection = page.locator('#pricing');
    await expect(pricingSection).toBeVisible();

    await expect(pricingSection.locator('h4', { hasText: 'Free' })).toBeVisible();
    await expect(pricingSection.locator('h4', { hasText: 'Premium' })).toBeVisible();
    await expect(pricingSection.locator('text=$0')).toBeVisible();
    // Must match the actual Stripe charge ($8.99/mo) — guards price drift.
    await expect(pricingSection.locator('text=$8.99')).toBeVisible();
  });

  test('shows testimonials from learners', async ({ page }) => {
    await expect(page.locator('text=Why Learners Love It')).toBeVisible();
    await expect(page.locator('text=Sarah K.')).toBeVisible();
    await expect(page.locator('text=Marco R.')).toBeVisible();
    await expect(page.locator('text=Emily T.')).toBeVisible();
  });

  test('shows footer with legal links', async ({ page }) => {
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();
    await expect(footer.locator('a', { hasText: 'Legal Notice' })).toBeVisible();
    await expect(footer.locator('a', { hasText: 'Terms of Service' })).toBeVisible();
    await expect(footer.locator('a', { hasText: 'Privacy Policy' })).toBeVisible();
  });

  test('loads without critical console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const criticalErrors = errors.filter(
      (e) =>
        !e.includes('supabase') &&
        !e.includes('firebase') &&
        !e.includes('Failed to fetch') &&
        !e.includes('net::ERR') &&
        !e.includes('favicon')
    );

    expect(criticalErrors).toEqual([]);
  });
});

test.describe('Landing Page - Responsive', () => {
  test('renders correctly on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');

    const hero = page.locator('h1');
    await expect(hero).toContainText('Stop Sounding');

    // The hide-on-mobile assertion needs the Tailwind CDN stylesheet. In
    // sandboxes where the browser can't reach the CDN (cert interception),
    // no CSS loads at all — skip the styling check rather than fail on env.
    const tailwindLoaded = await page
      .waitForFunction(() => typeof (window as { tailwind?: unknown }).tailwind !== 'undefined', undefined, { timeout: 5000 })
      .then(() => true)
      .catch(() => false);
    test.skip(!tailwindLoaded, 'Tailwind CDN unreachable in this environment');

    // Mobile nav should hide the Features/How It Works/Pricing text links
    const desktopNavLinks = page.locator('nav a', { hasText: 'Features' });
    await expect(desktopNavLinks).not.toBeVisible();
  });

  test('renders correctly on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');

    await expect(page.locator('h1')).toContainText('Stop Sounding');
  });

  test('renders correctly on desktop viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');

    await expect(page.locator('h1')).toContainText('Stop Sounding');

    // Desktop nav links should be visible
    await expect(page.locator('nav a', { hasText: 'Features' })).toBeVisible();
  });
});
