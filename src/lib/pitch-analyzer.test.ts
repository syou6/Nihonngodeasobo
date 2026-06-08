import { describe, it, expect } from 'vitest';
import { comparePitchToPattern, detectAccentNucleus, getPitchStats } from './pitch-analyzer';
import type { PitchFrame } from './pitch-tracker';

// Build voiced frames from a per-mora Hz sequence (one even segment per mora).
function framesFromMorae(moraHz: (number | null)[], durMs = 900): PitchFrame[] {
  const frames: PitchFrame[] = [];
  const per = durMs / moraHz.length;
  moraHz.forEach((hz, i) => {
    for (let t = 0; t < per; t += 10) frames.push({ time: i * per + t, pitch: hz, clarity: hz === null ? 0 : 0.95 });
  });
  return frames;
}

const ATAMADAKA = [1, 0, 0]; // HL + low particle (drop after mora 1)
const HEIBAN = [0, 1, 1]; // LH(H) — no drop
const NAKADAKA_3 = [0, 1, 0, 0]; // LHL — drop after mora 2

describe('detectAccentNucleus', () => {
  it('finds an early drop (atamadaka)', () => {
    expect(detectAccentNucleus([240, 170]).nucleus).toBe(1);
  });
  it('reports NO drop for a rising heiban contour', () => {
    expect(detectAccentNucleus([180, 210]).nucleus).toBe(0);
  });
  it('reports NO drop for a monotone contour', () => {
    expect(detectAccentNucleus([200, 201, 199]).nucleus).toBe(0);
  });
  it('finds a mid drop (nakadaka)', () => {
    expect(detectAccentNucleus([170, 230, 175]).nucleus).toBe(2);
  });
});

describe('comparePitchToPattern — trustworthy scoring', () => {
  it('passes a correct atamadaka production', () => {
    expect(comparePitchToPattern(framesFromMorae([245, 165]), ATAMADAKA, 2).accuracy).toBeGreaterThanOrEqual(80);
  });
  it('FAILS a monotone production vs atamadaka (false-positive killer)', () => {
    expect(comparePitchToPattern(framesFromMorae([200, 200]), ATAMADAKA, 2).accuracy).toBeLessThanOrEqual(40);
  });
  it('FAILS a reversed (rising) production vs atamadaka', () => {
    expect(comparePitchToPattern(framesFromMorae([165, 245]), ATAMADAKA, 2).accuracy).toBeLessThanOrEqual(40);
  });
  it('passes a correct heiban production (rise, no drop)', () => {
    expect(comparePitchToPattern(framesFromMorae([175, 215]), HEIBAN, 2).accuracy).toBeGreaterThanOrEqual(80);
  });
  it('does NOT give heiban full marks for a flat monotone', () => {
    expect(comparePitchToPattern(framesFromMorae([200, 200]), HEIBAN, 2).accuracy).toBeLessThanOrEqual(60);
  });
  it('FAILS an early-drop production vs heiban', () => {
    expect(comparePitchToPattern(framesFromMorae([240, 165]), HEIBAN, 2).accuracy).toBeLessThanOrEqual(40);
  });
  it('passes a correct nakadaka production', () => {
    expect(comparePitchToPattern(framesFromMorae([170, 235, 170]), NAKADAKA_3, 3).accuracy).toBeGreaterThanOrEqual(70);
  });
  it('returns 0 with all-unvoiced input (conservative)', () => {
    const r = comparePitchToPattern(framesFromMorae([null, null]), ATAMADAKA, 2);
    expect(r.accuracy).toBe(0);
    expect(r.matches.every((m) => m === null)).toBe(true);
  });
});

describe('getPitchStats', () => {
  it('returns zeros for no voiced frames', () => {
    expect(getPitchStats(framesFromMorae([null, null]))).toEqual({ min: 0, max: 0, median: 0, mean: 0 });
  });
  it('computes min/max/median/mean over voiced frames only', () => {
    const s = getPitchStats([
      { time: 0, pitch: 100, clarity: 0.9 }, { time: 10, pitch: null, clarity: 0 },
      { time: 20, pitch: 200, clarity: 0.9 }, { time: 30, pitch: 300, clarity: 0.9 },
    ]);
    expect(s.min).toBe(100);
    expect(s.max).toBe(300);
    expect(s.median).toBe(200);
  });
});
