// Adaptive review: persist per-word accuracy so the trainer can resurface the
// words a learner hasn't mastered yet, instead of marching through all 66 in a
// fixed loop. Pure functions + localStorage so the logic is unit-testable.

export interface WordStats {
  attempts: number;
  best: number; // best accuracy seen, 0-100
}

export type PitchProgress = Record<string, WordStats>;

const STORAGE_KEY = 'pitchWordStats';
export const MASTERY_THRESHOLD = 80;

export function loadProgress(): PitchProgress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed === null || typeof parsed !== 'object') return {};
    return parsed as PitchProgress;
  } catch {
    return {};
  }
}

export function saveProgress(progress: PitchProgress): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    /* storage full or unavailable — progress is best-effort */
  }
}

// Returns a new progress map with this attempt folded in (does not persist).
export function recordAttempt(
  progress: PitchProgress,
  word: string,
  accuracy: number,
): PitchProgress {
  const safe = Number.isFinite(accuracy) ? Math.max(0, Math.min(100, accuracy)) : 0;
  const prev = progress[word] ?? { attempts: 0, best: 0 };
  return {
    ...progress,
    [word]: {
      attempts: prev.attempts + 1,
      best: Math.max(prev.best, safe),
    },
  };
}

export function isMastered(progress: PitchProgress, word: string): boolean {
  return (progress[word]?.best ?? 0) >= MASTERY_THRESHOLD;
}

export function masteredCount(progress: PitchProgress, words: string[]): number {
  return words.reduce((n, w) => (isMastered(progress, w) ? n + 1 : n), 0);
}

// Pick the next word to practice: the nearest not-yet-mastered word after the
// current one (wrapping around). If everything is mastered, just advance by one
// so the user can still keep practicing.
export function nextWordIndex(
  words: string[],
  progress: PitchProgress,
  currentIndex: number,
): number {
  const n = words.length;
  if (n === 0) return 0;
  for (let step = 1; step <= n; step++) {
    const i = (currentIndex + step) % n;
    if (!isMastered(progress, words[i])) return i;
  }
  return (currentIndex + 1) % n;
}
