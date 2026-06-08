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

// Combine two progress maps, keeping the strongest record per word — used to
// reconcile this device's localStorage with the user's cloud-synced row.
export function mergeProgress(a: PitchProgress, b: PitchProgress): PitchProgress {
  const out: PitchProgress = { ...a };
  for (const [word, s] of Object.entries(b)) {
    const prev = out[word];
    out[word] = prev
      ? { attempts: Math.max(prev.attempts, s.attempts), best: Math.max(prev.best, s.best) }
      : s;
  }
  return out;
}

// --- Cloud sync (logged-in users) -----------------------------------------
// Best-effort: callers gate on a real authenticated user, and every call is
// wrapped so a network/RLS failure never breaks practice (localStorage remains
// the source of truth). `client` is the supabase-js client (typed loosely
// because the project's client is untyped).

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function fetchRemoteProgress(
  client: any,
  userId: string,
): Promise<PitchProgress> {
  try {
    const { data, error } = await client
      .from('pitch_progress')
      .select('word, best, attempts')
      .eq('user_id', userId);
    if (error || !Array.isArray(data)) return {};
    const out: PitchProgress = {};
    for (const row of data) {
      if (row && typeof row.word === 'string') {
        out[row.word] = {
          attempts: Number(row.attempts) || 0,
          best: Number(row.best) || 0,
        };
      }
    }
    return out;
  } catch {
    return {};
  }
}

export async function upsertRemoteAttempt(
  client: any,
  userId: string,
  word: string,
  stats: WordStats,
): Promise<void> {
  try {
    await client.from('pitch_progress').upsert(
      {
        user_id: userId,
        word,
        best: stats.best,
        attempts: stats.attempts,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,word' },
    );
  } catch {
    /* offline or RLS — local progress already saved, sync will catch up later */
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */
