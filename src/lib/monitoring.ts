import * as Sentry from '@sentry/react';

/**
 * Error monitoring wrapper around Sentry.
 *
 * Safe to call unconditionally: when VITE_SENTRY_DSN is not set (local dev,
 * preview builds) every export becomes a no-op, so the app never depends on a
 * configured backend to run.
 */

const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;

let initialized = false;

export function initMonitoring(): void {
  if (initialized || !dsn) return;

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    // Keep the trace sample rate conservative to control cost; raise per-route later.
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 0,
    // Never ship PII by default.
    sendDefaultPii: false,
  });

  initialized = true;
}

export function captureError(error: unknown, context?: Record<string, unknown>): void {
  if (!dsn) return;
  Sentry.captureException(error, context ? { extra: context } : undefined);
}

export function identifyUser(userId: string | null): void {
  if (!dsn) return;
  Sentry.setUser(userId ? { id: userId } : null);
}
