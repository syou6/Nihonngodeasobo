import { describe, it, expect, beforeEach } from 'vitest';
import {
  loadProgress,
  saveProgress,
  recordAttempt,
  isMastered,
  masteredCount,
  nextWordIndex,
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
});
