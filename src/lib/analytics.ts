/**
 * Google Analytics 4 event helpers.
 *
 * The gtag loader lives in the page <head> (index.html / app.html) and only
 * activates on the production domain, so these helpers simply forward events to
 * window.gtag when it exists. On localhost / preview (no gtag) they are no-ops.
 */

type GtagArgs = [string, ...unknown[]];
declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: GtagArgs) => void;
  }
}

// Kept for call-site compatibility; the gtag tag is installed in the HTML head.
export function initAnalytics(): void {
  /* no-op: gtag is loaded by the page head on the production domain */
}

/** Track a custom event (no-op unless GA is active on this domain). */
export function trackEvent(name: string, params?: Record<string, unknown>): void {
  if (typeof window === 'undefined' || !window.gtag) return;
  window.gtag('event', name, params ?? {});
}

/** Track an in-app view change as a page_view. */
export function trackPageView(view: string): void {
  if (typeof window === 'undefined' || !window.gtag) return;
  window.gtag('event', 'page_view', {
    page_title: view,
    page_path: `/${view}`,
  });
}

/** Associate subsequent events with a user id (or clear it). */
export function identify(userId: string | null): void {
  if (typeof window === 'undefined' || !window.gtag) return;
  window.gtag('set', { user_id: userId ?? undefined });
}
