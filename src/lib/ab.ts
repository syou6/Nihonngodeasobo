// Tiny client-side A/B assignment. A device is assigned a variant once per
// experiment (persisted in localStorage) so funnel events can be segmented in
// GA4 by `ab_<experiment>` param. No server, no flicker for in-app use.

const PREFIX = 'ab:';

export function getVariant<T extends string>(experiment: string, variants: readonly T[]): T {
  if (variants.length === 0) throw new Error('getVariant: variants must be non-empty');
  const key = PREFIX + experiment;
  try {
    const existing = localStorage.getItem(key);
    if (existing && (variants as readonly string[]).includes(existing)) {
      return existing as T;
    }
    const assigned = variants[Math.floor(Math.random() * variants.length)];
    localStorage.setItem(key, assigned);
    return assigned;
  } catch {
    // Storage unavailable (private mode etc.) — stable default, no experiment.
    return variants[0];
  }
}
