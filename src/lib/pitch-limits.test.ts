import { describe, it, expect, beforeEach } from 'vitest';
import {
  getScoringsToday,
  recordScoring,
  scoringsRemaining,
  canScore,
  wordLimitFor,
  FREE_DAILY_SCORINGS,
} from './pitch-limits';

describe('pitch-limits', () => {
  beforeEach(() => localStorage.clear());

  it('starts at zero scorings today', () => {
    expect(getScoringsToday()).toBe(0);
    expect(scoringsRemaining(false)).toBe(FREE_DAILY_SCORINGS);
    expect(canScore(false)).toBe(true);
  });

  it('counts scorings and blocks at the daily cap', () => {
    for (let i = 0; i < FREE_DAILY_SCORINGS; i++) {
      expect(canScore(false)).toBe(true);
      recordScoring();
    }
    expect(getScoringsToday()).toBe(FREE_DAILY_SCORINGS);
    expect(scoringsRemaining(false)).toBe(0);
    expect(canScore(false)).toBe(false);
  });

  it('premium is never blocked', () => {
    for (let i = 0; i < FREE_DAILY_SCORINGS + 3; i++) recordScoring();
    expect(canScore(true)).toBe(true);
    expect(scoringsRemaining(true)).toBe(Infinity);
  });

  it('resets when the stored date is not today', () => {
    localStorage.setItem(
      'pitchDailyScorings',
      JSON.stringify({ date: '2000-01-01', count: 99 }),
    );
    expect(getScoringsToday()).toBe(0);
    expect(canScore(false)).toBe(true);
  });

  it('tolerates garbage storage', () => {
    localStorage.setItem('pitchDailyScorings', '{nope');
    expect(getScoringsToday()).toBe(0);
  });

  it('word limits per tier', () => {
    expect(wordLimitFor('guest')).toBe(20);
    expect(wordLimitFor('free')).toBe(30);
    expect(wordLimitFor('premium')).toBe(Infinity);
  });
});
