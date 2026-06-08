import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  loadProgress,
  saveProgress,
  recordAttempt,
  isMastered,
  masteredCount,
  nextWordIndex,
  mergeProgress,
  fetchRemoteProgress,
  upsertRemoteAttempt,
  MASTERY_THRESHOLD,
} from './pitch-progress';

const WORDS = ['あ', 'い', 'う', 'え'];

describe('pitch-progress', () => {
  beforeEach(() => localStorage.clear());

  it('loads empty progress when nothing is stored', () => {
    expect(loadProgress()).toEqual({});
  });

  it('loads empty progress when stored JSON is garbage', () => {
    localStorage.setItem('pitchWordStats', '{not json');
    expect(loadProgress()).toEqual({});
  });

  it('round-trips through save/load', () => {
    const p = recordAttempt({}, 'あ', 90);
    saveProgress(p);
    expect(loadProgress()).toEqual(p);
  });

  it('records attempts and keeps the best accuracy', () => {
    let p = recordAttempt({}, 'あ', 60);
    p = recordAttempt(p, 'あ', 85);
    p = recordAttempt(p, 'あ', 70);
    expect(p['あ']).toEqual({ attempts: 3, best: 85 });
  });

  it('clamps non-finite or out-of-range accuracy', () => {
    let p = recordAttempt({}, 'あ', NaN);
    expect(p['あ'].best).toBe(0);
    p = recordAttempt({}, 'い', 150);
    expect(p['い'].best).toBe(100);
  });

  it('marks a word mastered at the threshold', () => {
    const p = recordAttempt({}, 'あ', MASTERY_THRESHOLD);
    expect(isMastered(p, 'あ')).toBe(true);
    expect(isMastered(p, 'い')).toBe(false);
  });

  it('counts mastered words', () => {
    let p = recordAttempt({}, 'あ', 90);
    p = recordAttempt(p, 'う', 81);
    p = recordAttempt(p, 'い', 40);
    expect(masteredCount(p, WORDS)).toBe(2);
  });

  it('resurfaces the nearest unmastered word, wrapping around', () => {
    let p = recordAttempt({}, 'い', 95); // index 1 mastered
    // from index 0: skip mastered 'い'(1) -> 'う'(2)
    expect(nextWordIndex(WORDS, p, 0)).toBe(2);
    // wraps: from index 3, 'あ'(0) is unmastered
    expect(nextWordIndex(WORDS, p, 3)).toBe(0);
    p = recordAttempt(p, 'あ', 90);
    p = recordAttempt(p, 'う', 90);
    p = recordAttempt(p, 'え', 90);
    // all mastered -> just advance by one
    expect(nextWordIndex(WORDS, p, 0)).toBe(1);
  });

  it('merges two progress maps keeping the strongest record per word', () => {
    const local = { あ: { attempts: 2, best: 70 }, い: { attempts: 1, best: 90 } };
    const remote = { あ: { attempts: 5, best: 60 }, う: { attempts: 3, best: 85 } };
    expect(mergeProgress(local, remote)).toEqual({
      あ: { attempts: 5, best: 70 },
      い: { attempts: 1, best: 90 },
      う: { attempts: 3, best: 85 },
    });
  });

  it('fetchRemoteProgress maps rows and tolerates errors', async () => {
    const ok = {
      from: () => ({
        select: () => ({
          eq: () =>
            Promise.resolve({
              data: [{ word: 'あ', best: 88, attempts: 4 }],
              error: null,
            }),
        }),
      }),
    };
    expect(await fetchRemoteProgress(ok, 'u1')).toEqual({ あ: { best: 88, attempts: 4 } });

    const bad = {
      from: () => ({
        select: () => ({ eq: () => Promise.resolve({ data: null, error: { message: 'x' } }) }),
      }),
    };
    expect(await fetchRemoteProgress(bad, 'u1')).toEqual({});
  });

  it('upsertRemoteAttempt sends the row with onConflict and swallows failures', async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const client = { from: () => ({ upsert }) };
    await upsertRemoteAttempt(client, 'u1', 'あ', { best: 90, attempts: 3 });
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'u1', word: 'あ', best: 90, attempts: 3 }),
      { onConflict: 'user_id,word' },
    );

    const throwing = { from: () => ({ upsert: () => { throw new Error('offline'); } }) };
    await expect(upsertRemoteAttempt(throwing, 'u1', 'あ', { best: 1, attempts: 1 })).resolves.toBeUndefined();
  });
});
