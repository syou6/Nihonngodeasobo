/**
 * Client-side rate limiter using localStorage.
 * Uses a sliding window approach: tracks timestamps of recent actions
 * and allows an action only if fewer than maxActions occurred within windowMs.
 *
 * Usage:
 *   if (!limiter.canProceed()) { show error; return; }
 *   await doAction();
 *   limiter.recordAction();
 */

interface RateLimiterConfig {
  key: string
  maxActions: number
  windowMs: number
}

export interface RateLimiterInstance {
  canProceed: () => boolean
  getRemainingCooldown: () => number
  recordAction: () => void
}

function getStoredTimestamps(key: string): number[] {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((v) => typeof v === 'number')
  } catch {
    return []
  }
}

function storeTimestamps(key: string, timestamps: number[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(timestamps))
  } catch {
    // localStorage may be unavailable (private browsing quota, etc.)
  }
}

function getActiveTimestamps(timestamps: number[], windowMs: number, now: number): number[] {
  return timestamps.filter((ts) => now - ts < windowMs)
}

export function createRateLimiter(config: RateLimiterConfig): RateLimiterInstance {
  const { key, maxActions, windowMs } = config

  const canProceed = (): boolean => {
    const now = Date.now()
    const stored = getStoredTimestamps(key)
    const active = getActiveTimestamps(stored, windowMs, now)
    // Persist cleaned-up timestamps (expired ones removed)
    if (active.length !== stored.length) {
      storeTimestamps(key, active)
    }
    return active.length < maxActions
  }

  const getRemainingCooldown = (): number => {
    const now = Date.now()
    const stored = getStoredTimestamps(key)
    const active = getActiveTimestamps(stored, windowMs, now)

    if (active.length < maxActions) return 0

    // The oldest active timestamp determines when the window first opens up
    const oldest = Math.min(...active)
    const msUntilOldestExpires = windowMs - (now - oldest)
    return Math.max(0, msUntilOldestExpires)
  }

  const recordAction = (): void => {
    const now = Date.now()
    const stored = getStoredTimestamps(key)
    const active = getActiveTimestamps(stored, windowMs, now)
    storeTimestamps(key, [...active, now])
  }

  return { canProceed, getRemainingCooldown, recordAction }
}

// Pre-configured limiters for common actions

export const diaryLimiter = createRateLimiter({
  key: 'rl:diary',
  maxActions: 5,
  windowMs: 3_600_000, // 1 hour
})

export const commentLimiter = createRateLimiter({
  key: 'rl:comment',
  maxActions: 10,
  windowMs: 300_000, // 5 minutes
})

export const aiFeedbackLimiter = createRateLimiter({
  key: 'rl:ai_feedback',
  maxActions: 20,
  windowMs: 3_600_000, // 1 hour
})

export const signupLimiter = createRateLimiter({
  key: 'rl:signup',
  maxActions: 3,
  windowMs: 3_600_000, // 1 hour
})
