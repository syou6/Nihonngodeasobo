import { describe, it, expect, beforeEach } from 'vitest';
import { initAnalytics, trackEvent, trackPageView, identify } from './analytics';

// VITE_GA_MEASUREMENT_ID is unset in the test env, so everything must be a safe
// no-op — calling these never throws and never touches window.gtag.
describe('analytics (no measurement id)', () => {
  beforeEach(() => {
    (window as unknown as { gtag?: unknown }).gtag = undefined;
  });

  it('initAnalytics does not inject gtag when unconfigured', () => {
    initAnalytics();
    expect(window.gtag).toBeUndefined();
  });

  it('trackEvent / trackPageView / identify are safe no-ops', () => {
    expect(() => trackEvent('diary_created', { has_audio: true })).not.toThrow();
    expect(() => trackPageView('home')).not.toThrow();
    expect(() => identify('user-1')).not.toThrow();
    expect(() => identify(null)).not.toThrow();
    expect(window.gtag).toBeUndefined();
  });
});
