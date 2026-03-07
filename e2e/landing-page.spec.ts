import { test, expect } from '@playwright/test';

test.describe('Landing Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('loads with correct title and hero content', async ({ page }) => {
    await expect(page).toHaveTitle(/NihonGo/);

    const hero = page.locator('h1');
    await expect(hero).toContainText('Speak Japanese');
    await expect(hero).toContainText('Get Real Feedback');
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

  test('has Start Free and Try as Guest CTAs', async ({ page }) => {
    // Start Free CTA exists (at least one should be visible)
    const startFreeLinks = page.locator('a[href="/app.html?signup=true"]');
    const startFreeCount = await startFreeLinks.count();
    expect(startFreeCount).toBeGreaterThan(0);

    // Try as Guest CTA exists in the DOM (nav one is hidden on mobile, hero one is visible)
    const guestLinks = page.locator('a[href="/app.html?guest=true"]');
    const guestCount = await guestLinks.count();
    expect(guestCount).toBeGreaterThan(0);
  });

  test('shows features section with six feature cards', async ({ page }) => {
    const featuresSection = page.locator('#features');
    await expect(featuresSection).toBeVisible();

    await expect(featuresSection.locator('h4', { hasText: 'Voice Diary' })).toBeVisible();
    await expect(featuresSection.locator('h4', { hasText: 'AI That Explains Why' })).toBeVisible();
    await expect(featuresSection.locator('h4', { hasText: 'N5 to N1 Speaking' })).toBeVisible();
    await expect(featuresSection.locator('h4', { hasText: 'Teacher Connection' })).toBeVisible();
    await expect(featuresSection.locator('h4', { hasText: 'Track Progress' })).toBeVisible();
    await expect(featuresSection.locator('h4', { hasText: 'Works Everywhere' })).toBeVisible();
  });

  test('shows how it works section with three steps', async ({ page }) => {
    const howSection = page.locator('#how-it-works');
    await expect(howSection).toBeVisible();

    await expect(howSection.locator('text=Record Your Diary')).toBeVisible();
    await expect(howSection.locator('text=Get AI Feedback')).toBeVisible();
    await expect(howSection.locator('text=Improve Every Day')).toBeVisible();
  });

  test('shows pricing section with Free and Premium plans', async ({ page }) => {
    const pricingSection = page.locator('#pricing');
    await expect(pricingSection).toBeVisible();

    await expect(pricingSection.locator('h4', { hasText: 'Free' })).toBeVisible();
    await expect(pricingSection.locator('h4', { hasText: 'Premium' })).toBeVisible();
    await expect(pricingSection.locator('text=$0')).toBeVisible();
    await expect(pricingSection.locator('text=$4.99')).toBeVisible();
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
    await expect(hero).toContainText('Speak Japanese');

    // Mobile nav should hide Features/How It Works/Pricing text links
    const desktopNav = page.locator('.hidden.md\\:flex');
    await expect(desktopNav).not.toBeVisible();
  });

  test('renders correctly on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');

    await expect(page.locator('h1')).toContainText('Speak Japanese');
  });

  test('renders correctly on desktop viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');

    await expect(page.locator('h1')).toContainText('Speak Japanese');

    // Desktop nav links should be visible
    const desktopNav = page.locator('.hidden.md\\:flex');
    await expect(desktopNav).toBeVisible();
  });
});
