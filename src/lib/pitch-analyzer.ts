import type { PitchFrame } from './pitch-tracker';

export interface PitchStats {
  min: number;
  max: number;
  median: number;
  mean: number;
}

export interface PitchComparisonResult {
  matches: (boolean | null)[];
  accuracy: number;
}

/**
 * Divide frames into equal-duration mora segments.
 * Returns an array of moraCount arrays; frames with null pitch are included.
 */
export function segmentPitchByMora(
  frames: PitchFrame[],
  moraCount: number,
): PitchFrame[][] {
  if (frames.length === 0 || moraCount <= 0) {
    return Array.from({ length: moraCount }, () => []);
  }

  const maxTime = frames[frames.length - 1].time;
  const segmentDuration = maxTime / moraCount;

  return Array.from({ length: moraCount }, (_, i) => {
    const segStart = i * segmentDuration;
    const segEnd = (i + 1) * segmentDuration;
    return frames.filter(
      (f) => f.time >= segStart && (i === moraCount - 1 ? f.time <= segEnd : f.time < segEnd),
    );
  });
}

/**
 * Classify a segment as HIGH (true), LOW (false), or unvoiced (null).
 * Uses median pitch relative to overall median of all voiced frames in segment.
 */
export function classifySegment(
  segment: PitchFrame[],
  overallMedian: number,
): boolean | null {
  const voiced = segment.filter((f) => f.pitch !== null).map((f) => f.pitch as number);
  if (voiced.length === 0) return null;

  const segMedian = computeMedian(voiced);
  return segMedian >= overallMedian;
}

/**
 * Compare detected pitch frames to an expected accent pattern.
 * expectedPattern is an array of integers where 1 = HIGH, 0 = LOW.
 */
export function comparePitchToPattern(
  frames: PitchFrame[],
  expectedPattern: number[],
  moraCount: number,
): PitchComparisonResult {
  const voicedPitches = frames
    .filter((f) => f.pitch !== null)
    .map((f) => f.pitch as number);

  if (voicedPitches.length === 0) {
    return {
      matches: Array.from({ length: moraCount }, () => null),
      accuracy: 0,
    };
  }

  const overallMedian = computeMedian(voicedPitches);
  const segments = segmentPitchByMora(frames, moraCount);

  const matches = segments.map((seg, i): boolean | null => {
    const detected = classifySegment(seg, overallMedian);
    if (detected === null) return null;
    const expected = expectedPattern[i] === 1;
    return detected === expected;
  });

  const decidable = matches.filter((m) => m !== null);
  const correct = decidable.filter(Boolean).length;
  const accuracy =
    decidable.length === 0 ? 0 : Math.round((correct / decidable.length) * 100);

  return { matches, accuracy };
}

/**
 * Compute basic statistics over voiced frames only.
 */
export function getPitchStats(frames: PitchFrame[]): PitchStats {
  const voiced = frames
    .filter((f) => f.pitch !== null)
    .map((f) => f.pitch as number);

  if (voiced.length === 0) {
    return { min: 0, max: 0, median: 0, mean: 0 };
  }

  const sorted = [...voiced].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const median = computeMedian(voiced);
  const mean = voiced.reduce((sum, v) => sum + v, 0) / voiced.length;

  return { min, max, median, mean };
}

function computeMedian(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}
