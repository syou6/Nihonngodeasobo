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

export interface NucleusResult {
  /** Accent nucleus (核): 1-based mora after which pitch drops; 0 = no drop (heiban). */
  nucleus: number;
  /** Magnitude of the detected drop, in semitones (0 if none). */
  dropSemitones: number;
}

// A real Japanese downstep is a clear fall. Require this much (semitones) before we
// believe a drop happened — conservative, so monotone speech does NOT pass.
const DROP_THRESHOLD_ST = 1.8;
// Minimum rise (semitones) to count an initial L→H, used to validate heiban.
const RISE_THRESHOLD_ST = 1.2;
const MIN_VOICED_FRAMES = 6;

function computeMedian(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function semitones(hz: number, ref: number): number {
  return 12 * Math.log2(hz / ref);
}

/**
 * Per-mora median F0. Trims to the voiced span first (drops leading/trailing
 * silence — the main flaw of naive equal-duration segmentation), then bins the
 * voiced span into `moraCount` equal slices. null = no voiced data in that mora.
 */
export function moraMedians(frames: PitchFrame[], moraCount: number): (number | null)[] {
  const voiced = frames.filter((f) => f.pitch !== null) as Array<PitchFrame & { pitch: number }>;
  if (voiced.length === 0 || moraCount <= 0) {
    return Array.from({ length: Math.max(moraCount, 0) }, () => null);
  }
  const t0 = voiced[0].time;
  const span = Math.max(voiced[voiced.length - 1].time - t0, 1);
  const bins: number[][] = Array.from({ length: moraCount }, () => []);
  for (const f of voiced) {
    const idx = Math.min(moraCount - 1, Math.max(0, Math.floor(((f.time - t0) / span) * moraCount)));
    bins[idx].push(f.pitch);
  }
  return bins.map((b) => (b.length ? computeMedian(b) : null));
}

/**
 * Detect the accent nucleus from a per-mora F0 contour: the boundary with the
 * largest sustained FALL. This models the one perceptual cue that defines Japanese
 * pitch accent (the downstep), instead of classifying each mora high/low vs a
 * median (which passes monotone speech ~50% of the time).
 */
export function detectAccentNucleus(moraF0: (number | null)[]): NucleusResult {
  const defined = moraF0
    .map((hz, i) => ({ hz, i }))
    .filter((m): m is { hz: number; i: number } => m.hz !== null);
  if (defined.length < 2) return { nucleus: 0, dropSemitones: 0 };

  const ref = computeMedian(defined.map((m) => m.hz));
  const st = defined.map((m) => ({ i: m.i, v: semitones(m.hz, ref) }));

  let maxFall = 0;
  let nucleusMoraIndex = -1; // index (in original moraF0) of the last high mora before the fall
  for (let k = 0; k < st.length - 1; k++) {
    const fall = st[k].v - st[k + 1].v; // positive => pitch dropped
    if (fall > maxFall) {
      maxFall = fall;
      nucleusMoraIndex = st[k].i;
    }
  }

  if (maxFall < DROP_THRESHOLD_ST) return { nucleus: 0, dropSemitones: maxFall };
  return { nucleus: nucleusMoraIndex + 1, dropSemitones: maxFall };
}

/** Target accent nucleus from an H/L pattern (1=high,0=low): first 1→0 transition. */
function patternToNucleus(pattern: number[]): number {
  for (let i = 0; i < pattern.length - 1; i++) {
    if (pattern[i] === 1 && pattern[i + 1] === 0) return i + 1;
  }
  return 0; // no drop => heiban
}

/** Reconstruct the standard Tokyo H/L pattern (per mora) implied by a nucleus. */
function nucleusToPattern(nucleus: number, moraCount: number): number[] {
  return Array.from({ length: moraCount }, (_, i) => {
    const mora = i + 1; // 1-based
    if (nucleus === 0) return mora === 1 ? 0 : 1; // heiban: L then H...
    if (nucleus === 1) return mora === 1 ? 1 : 0; // atamadaka: H then L...
    // nakadaka/odaka: L, then H up to and including the nucleus, then L
    return mora >= 2 && mora <= nucleus ? 1 : 0;
  });
}

/**
 * Compare a recorded contour to the expected accent pattern.
 * Scores by ACCENT-NUCLEUS (drop-location) match — conservative, so wrong or
 * monotone productions fail rather than scoring ~50% by chance.
 */
export function comparePitchToPattern(
  frames: PitchFrame[],
  expectedPattern: number[],
  moraCount: number,
): PitchComparisonResult {
  const voiced = frames.filter((f) => f.pitch !== null);
  if (voiced.length < MIN_VOICED_FRAMES) {
    return { matches: Array.from({ length: moraCount }, () => null), accuracy: 0 };
  }

  const moraF0 = moraMedians(frames, moraCount);
  const definedCount = moraF0.filter((m) => m !== null).length;
  if (definedCount === 0) {
    return { matches: Array.from({ length: moraCount }, () => null), accuracy: 0 };
  }

  const user = detectAccentNucleus(moraF0);
  const targetNucleus = patternToNucleus(expectedPattern);

  // Odaka: the drop lands on the following particle, which the learner usually
  // doesn't say — a flat-high word with no internal drop is acceptable.
  const odakaPass = targetNucleus === moraCount && user.nucleus === 0;
  const nucleusMatch = user.nucleus === targetNucleus || odakaPass;

  let accuracy: number;
  if (nucleusMatch) {
    accuracy = 100;
    // Heiban must actually rise (L→H); a flat/falling contour is not heiban.
    if (targetNucleus === 0) {
      const st = (moraF0.filter((m) => m !== null) as number[]).map((hz, _i, arr) =>
        semitones(hz, computeMedian(arr)),
      );
      const rise = st.length >= 2 ? st[st.length - 1] - st[0] : 0;
      if (rise < RISE_THRESHOLD_ST) accuracy = 50;
    }
  } else if (user.nucleus !== 0 && targetNucleus !== 0 && Math.abs(user.nucleus - targetNucleus) === 1) {
    accuracy = 55; // right idea, off by one mora
  } else {
    accuracy = 25; // wrong location / missed the drop / dropped where it shouldn't
  }

  // Slight penalty for sparse voiced data (conservative).
  const voicedRatio = definedCount / moraCount;
  accuracy = Math.round(accuracy * (0.85 + 0.15 * Math.min(1, voicedRatio)));
  accuracy = Math.max(0, Math.min(100, accuracy));

  const userPattern = nucleusToPattern(user.nucleus, moraCount);
  const matches = moraF0.map((hz, i): boolean | null => {
    if (hz === null) return null;
    const expected = expectedPattern[i] === 1;
    return userPattern[i] === 1 === expected;
  });

  return { matches, accuracy };
}

/** Basic stats over voiced frames only. */
export function getPitchStats(frames: PitchFrame[]): PitchStats {
  const voiced = frames.filter((f) => f.pitch !== null).map((f) => f.pitch as number);
  if (voiced.length === 0) return { min: 0, max: 0, median: 0, mean: 0 };
  const sorted = [...voiced].sort((a, b) => a - b);
  return {
    min: sorted[0],
    max: sorted[sorted.length - 1],
    median: computeMedian(voiced),
    mean: voiced.reduce((s, v) => s + v, 0) / voiced.length,
  };
}
