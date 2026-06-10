import { test, expect } from '@playwright/test';

// Revenue / conversion coverage for the Pitch Trainer's guest funnel.
//
// Environment note: this app falls back to GUEST mode whenever Supabase env
// vars are absent (which is the case here and in local dev). So these tests
// only exercise guest-reachable conversion UI. Anything that requires a real
// authenticated session or a real microphone (and therefore an actual score)
// is intentionally skipped — see the test.skip below — because it cannot be
// honestly driven without Supabase creds (CI-only) or a mic device.
//
// Pattern mirrors e2e/guest-mode.spec.ts: land via ?guest=true, wait for the
// lazy-loaded trainer (generous 15s timeout), clear storage in beforeEach.

const today = () => new Date().toISOString().slice(0, 10); // matches pitch-limits todayStamp()

test.describe('Revenue Flow → Guest Conversion UI', () => {
  test.beforeEach(async ({ page }) => {
    // Same-origin visit first so localStorage/sessionStorage are clearable.
    await page.goto('/app.html');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('guest word-gate line + "Word 1 of 20" header are visible on load', async ({ page }) => {
    await page.goto('/app.html?guest=true');

    await expect(
      page.getByRole('heading', { name: 'Pitch Accent Practice' })
    ).toBeVisible({ timeout: 15000 });

    // Header reflects the 20-word guest curriculum cap (GUEST_WORD_LIMIT=20).
    await expect(page.getByText('Word 1 of 20')).toBeVisible();

    // The guest word gate: "🔒 Guest preview: 20 of 66 words · unlock more free".
    await expect(page.getByText(/Guest preview/)).toBeVisible();

    // The conversion CTA ("unlock more free") lives inside the gate button.
    const gateButton = page.getByRole('button', { name: /Guest preview/ });
    await expect(gateButton).toBeVisible();
    await expect(gateButton.getByText(/unlock more free/)).toBeVisible();
  });

  test('daily-scoring paywall appears when the free cap is already reached', async ({ page }) => {
    // Seed the daily-scoring counter to the free cap (5) for today, on the same
    // origin, BEFORE the trainer renders. Then enter the trainer as a guest.
    await page.evaluate((date) => {
      localStorage.setItem(
        'pitchDailyScorings',
        JSON.stringify({ date, count: 5 })
      );
    }, today());

    await page.goto('/app.html?guest=true');

    await expect(
      page.getByRole('heading', { name: 'Pitch Accent Practice' })
    ).toBeVisible({ timeout: 15000 });

    // Sanity: the gate line should reflect 0 scorings left today.
    await expect(page.getByText(/0\/5 scorings left today/)).toBeVisible();

    // Click "Record & say it" — startRecording() must hit the paywall guard and
    // return BEFORE requesting the mic (canScore() is false at the cap).
    await page.getByRole('button', { name: /Record & say it/ }).click();

    // Paywall modal appears with its daily-limit copy.
    await expect(page.getByText(/daily limit reached/)).toBeVisible();
    await expect(
      page.getByRole('heading', { name: /You're on a roll/ })
    ).toBeVisible();

    // The mic/record flow did NOT proceed: no "Recording" / "Stop" state.
    await expect(page.getByText('Recording — match the shaded bands')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^Stop$/ })).toHaveCount(0);
    // The mic-denied error path must also not have fired.
    await expect(page.getByText(/Microphone access was denied/)).toHaveCount(0);
  });

  test('guest paywall modal CTA offers account creation (conversion copy)', async ({ page }) => {
    await page.evaluate((date) => {
      localStorage.setItem(
        'pitchDailyScorings',
        JSON.stringify({ date, count: 5 })
      );
    }, today());

    await page.goto('/app.html?guest=true');

    await expect(
      page.getByRole('heading', { name: 'Pitch Accent Practice' })
    ).toBeVisible({ timeout: 15000 });

    await page.getByRole('button', { name: /Record & say it/ }).click();
    await expect(page.getByText(/daily limit reached/)).toBeVisible();

    // For a guest the upgrade CTA is "Create account & go unlimited".
    await expect(
      page.getByRole('button', { name: /Create account & go unlimited/ })
    ).toBeVisible();
  });

  test('guest word-gate CTA routes to the signup funnel (reachable without scoring)', async ({ page }) => {
    await page.goto('/app.html?guest=true');

    await expect(
      page.getByRole('heading', { name: 'Pitch Accent Practice' })
    ).toBeVisible({ timeout: 15000 });

    // Clicking the gate calls goToSignup(), which navigates to the signup route.
    // This is the only signup CTA reachable without a mic/score, so we verify
    // the navigation target rather than the (mic-gated) session-summary CTA.
    await page.getByRole('button', { name: /Guest preview/ }).click();

    await page.waitForURL(/\/app\.html\?signup=true/, { timeout: 15000 });
    expect(page.url()).toContain('signup=true');
  });

  // The session-summary "Save your progress" signup CTA only renders after at
  // least one scored attempt (sessionAttempts > 0 → "Finish session" → summary).
  // Scoring requires a real microphone stream (navigator.mediaDevices.getUserMedia),
  // which this headless container cannot provide. Skipped rather than faked.
  test.skip('session summary signup CTA appears after a scored session', async () => {
    // Requires a real mic to produce a score and reach the SessionSummary modal.
  });
});
