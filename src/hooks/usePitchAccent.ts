import { useEffect, useState } from 'react';
import { hatsuon } from 'hatsuon';

export interface PitchAccentResult {
  morae: string[];
  /** H/L pattern array (0=low, 1=high), length = moraCount + 1 (includes particle) */
  pattern: number[];
  patternName: string;
  reading: string;
}

type AccentEntry = { r: string; p: number };
type AccentDict = Record<string, AccentEntry[]>;

// Module-level caches — shared across all hook instances.
// The practice feature only needs ~23 words, so we ship a tiny dict (~1KB) and
// load it first. The full 4.3MB dictionary is fetched lazily ONLY if a looked-up
// word is missing from the slim set — so the common path never pays for it.
let slimDict: AccentDict | null = null;
let slimPromise: Promise<AccentDict> | null = null;
let fullDict: AccentDict | null = null;
let fullPromise: Promise<AccentDict> | null = null;

function fetchDict(path: string): Promise<AccentDict> {
  return fetch(path).then((res) => {
    if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
    return res.json() as Promise<AccentDict>;
  });
}

async function loadDict(): Promise<AccentDict> {
  if (slimDict !== null) return slimDict;
  if (slimPromise !== null) return slimPromise;
  slimPromise = fetchDict('/pitch-practice-dict.json').then((d) => (slimDict = d));
  return slimPromise;
}

async function loadFullDict(): Promise<AccentDict> {
  if (fullDict !== null) return fullDict;
  if (fullPromise !== null) return fullPromise;
  fullPromise = fetchDict('/pitch-accents.json').then((d) => (fullDict = d));
  return fullPromise;
}

function lookupWord(dict: AccentDict, word: string, preferredReading?: string): PitchAccentResult | null {
  const entries = dict[word];
  if (!entries || entries.length === 0) return null;

  // Dictionary entries are not ordered by commonness and may include rare or
  // non-Japanese readings (e.g. 学生 → がくしょう before がくせい, 先生 → シーサン).
  // When the caller knows the intended reading, pick that exact entry; otherwise
  // fall back to the first entry.
  const entry = (preferredReading && entries.find((e) => e.r === preferredReading)) || entries[0];
  const { r: reading, p: pitchNum } = entry;
  const result = hatsuon({ reading, pitchNum, locale: 'JA' });

  return {
    morae: result.morae,
    pattern: result.pattern,
    patternName: result.patternName,
    reading,
  };
}

/**
 * Lazily loads the pitch accent dictionary and looks up a word.
 * Returns null when loading or when the word is not found.
 */
export function usePitchAccent(
  word: string | null,
  preferredReading?: string,
): PitchAccentResult | null {
  const [result, setResult] = useState<PitchAccentResult | null>(null);

  useEffect(() => {
    if (!word) {
      setResult(null);
      return;
    }

    let cancelled = false;

    loadDict()
      .then(async (dict) => {
        let found = lookupWord(dict, word, preferredReading);
        // Word not in the slim practice set — fall back to the full dictionary.
        if (found === null && dict[word] === undefined) {
          found = lookupWord(await loadFullDict(), word, preferredReading);
        }
        if (!cancelled) setResult(found);
      })
      .catch(() => {
        if (!cancelled) setResult(null);
      });

    return () => {
      cancelled = true;
    };
  }, [word, preferredReading]);

  return result;
}
