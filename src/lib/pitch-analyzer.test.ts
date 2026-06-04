import { describe, it, expect } from 'vitest';
import {
  segmentPitchByMora,
  classifySegment,
  comparePitchToPattern,
  getPitchStats,
} from './pitch-analyzer';
import type { PitchFrame } from './pitch-tracker';

// Build evenly-spaced frames; pass a pitch per frame (null = unvoiced).
function framesFrom(pitches: (number | null)[], stepMs = 10): PitchFrame[] {
  return pitches.map((pitch, i) => ({ time: i * stepMs, pitch, clarity: pitch === null ? 0 : 0.95 }));
}

describe('segmentPitchByMora', () => {
  it('returns empty segments for empty input', () => {
    expect(segmentPitchByMora([], 3)).toEqual([[], [], []]);
  });

  it('splits frames into equal-duration mora segments', () => {
    const frames = framesFrom([100, 100, 100, 200, 200, 200]); // times 0..50
    const segments = segmentPitchByMora(frames, 2);
    expect(segments).toHaveLength(2);
    // Last segment is inclusive of the final frame, so the split is 3 / 3 here.
    expect(segments[0].length + segments[1].length).toBe(frames.length);
    expect(segments[0].every((f) => f.pitch === 100)).toBe(true);
    expect(segments[1].some((f) => f.pitch === 200)).toBe(true);
  });
});

describe('classifySegment', () => {
  it('returns null for a fully unvoiced segment', () => {
    expect(classifySegment(framesFrom([null, null]), 150)).toBeNull();
  });

  it('classifies above-median as HIGH (true)', () => {
    expect(classifySegment(framesFrom([200, 210]), 150)).toBe(true);
  });

  it('classifies below-median as LOW (false)', () => {
    expect(classifySegment(framesFrom([100, 110]), 150)).toBe(false);
  });
});

describe('comparePitchToPattern', () => {
  it('returns zero accuracy and all-null matches with no voiced frames', () => {
    const result = comparePitchToPattern(framesFrom([null, null, null]), [0, 1], 2);
    expect(result.accuracy).toBe(0);
    expect(result.matches).toEqual([null, null]);
  });

  it('scores a correct low→high contour as 100', () => {
    // First mora low (100Hz), second mora high (200Hz); expected [low, high].
    const frames = framesFrom([100, 100, 100, 200, 200, 200]);
    const result = comparePitchToPattern(frames, [0, 1], 2);
    expect(result.matches).toEqual([true, true]);
    expect(result.accuracy).toBe(100);
  });

  it('penalises a reversed contour', () => {
    // Spoken high→low, but the expected pattern is low→high.
    const frames = framesFrom([200, 200, 200, 100, 100, 100]);
    const result = comparePitchToPattern(frames, [0, 1], 2);
    expect(result.matches).toEqual([false, false]);
    expect(result.accuracy).toBe(0);
  });

  it('ignores unvoiced morae when computing accuracy', () => {
    // mora0 voiced, mora1 unvoiced -> only 1 decidable mora. With a single voiced
    // level the segment sits at/above the overall median, so it classifies HIGH;
    // expected [high, low] therefore matches the one decidable mora.
    const frames = framesFrom([100, 100, 100, null, null, null]);
    const result = comparePitchToPattern(frames, [1, 0], 2);
    expect(result.matches[0]).toBe(true);
    expect(result.matches[1]).toBeNull();
    expect(result.accuracy).toBe(100);
  });
});

describe('getPitchStats', () => {
  it('returns zeros for no voiced frames', () => {
    expect(getPitchStats(framesFrom([null, null]))).toEqual({ min: 0, max: 0, median: 0, mean: 0 });
  });

  it('computes min/max/median/mean over voiced frames only', () => {
    const stats = getPitchStats(framesFrom([100, null, 200, 300]));
    expect(stats.min).toBe(100);
    expect(stats.max).toBe(300);
    expect(stats.median).toBe(200);
    expect(stats.mean).toBe(200);
  });
});
