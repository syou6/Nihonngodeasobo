// Free-tier limits for the pitch trainer, enforcing what the pricing page has
// always promised: free = 5 voice scorings/day + intro words; premium = all 66
// words, unlimited scoring. Counter is client-side (localStorage, date-keyed) —
// an honest-user speed bump that creates the upgrade moment, not DRM.

export const FREE_DAILY_SCORINGS = 5;
export const GUEST_WORD_LIMIT = 20;
export const FREE_WORD_LIMIT = 30;

const KEY = 'pitchDailyScorings';

function todayStamp(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD local-enough
}

export function getScoringsToday(): number {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return 0;
    const { date, count } = JSON.parse(raw);
    if (date !== todayStamp()) return 0;
    const n = Number(count);
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}

export function recordScoring(): number {
  const next = getScoringsToday() + 1;
  try {
    localStorage.setItem(KEY, JSON.stringify({ date: todayStamp(), count: next }));
  } catch {
    /* storage unavailable — fail open */
  }
  return next;
}

export function scoringsRemaining(isPremium: boolean): number {
  return isPremium ? Infinity : Math.max(0, FREE_DAILY_SCORINGS - getScoringsToday());
}

export function canScore(isPremium: boolean): boolean {
  return scoringsRemaining(isPremium) > 0;
}

/** Word-curriculum size for the tier. */
export function wordLimitFor(tier: 'guest' | 'free' | 'premium'): number {
  if (tier === 'premium') return Infinity;
  return tier === 'guest' ? GUEST_WORD_LIMIT : FREE_WORD_LIMIT;
}
