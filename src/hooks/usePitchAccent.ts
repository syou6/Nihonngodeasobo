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

// Module-level cache — shared across all hook instances
let cachedDict: AccentDict | null = null;
let loadPromise: Promise<AccentDict> | null = null;

async function loadDict(): Promise<AccentDict> {
  if (cachedDict !== null) return cachedDict;
  if (loadPromise !== null) return loadPromise;

  loadPromise = fetch('/pitch-accents.json')
    .then((res) => {
      if (!res.ok) throw new Error(`Failed to load pitch-accents.json: ${res.status}`);
      return res.json() as Promise<AccentDict>;
    })
    .then((dict) => {
      cachedDict = dict;
      return dict;
    });

  return loadPromise;
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
      .then((dict) => {
        if (!cancelled) {
          setResult(lookupWord(dict, word, preferredReading));
        }
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
