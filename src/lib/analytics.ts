/**
 * Google Analytics 4 wrapper.
 *
 * Safe to call unconditionally: when VITE_GA_MEASUREMENT_ID is not set, every
 * export is a no-op, so local/dev builds never hit GA. Set the env var
 * (e.g. "G-XXXXXXXXXX") in Vercel to activate.
 */

const MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined;

type GtagArgs = [string, ...unknown[]];
declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: GtagArgs) => void;
  }
}

let initialized = false;

export function initAnalytics(): void {
  if (initialized || !MEASUREMENT_ID || typeof window === 'undefined') return;

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag(...args: GtagArgs) {
    window.dataLayer!.push(args);
  };
  window.gtag('js', new Date());
  // SPA: we send page_view manually on view changes.
  window.gtag('config', MEASUREMENT_ID, { send_page_view: false });

  initialized = true;
}

/** Track a custom event (no-op unless GA is configured). */
export function trackEvent(name: string, params?: Record<string, unknown>): void {
  if (!MEASUREMENT_ID || !window.gtag) return;
  window.gtag('event', name, params ?? {});
}

/** Track an in-app view change as a page_view. */
export function trackPageView(view: string): void {
  if (!MEASUREMENT_ID || !window.gtag) return;
  window.gtag('event', 'page_view', {
    page_title: view,
    page_path: `/${view}`,
  });
}

/** Associate subsequent events with a user id (or clear it). */
export function identify(userId: string | null): void {
  if (!MEASUREMENT_ID || !window.gtag) return;
  window.gtag('set', { user_id: userId ?? undefined });
}
