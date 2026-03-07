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

function lookupWord(dict: AccentDict, word: string): PitchAccentResult | null {
  const entries = dict[word];
  if (!entries || entries.length === 0) return null;

  // Use the first entry as the primary reading
  const { r: reading, p: pitchNum } = entries[0];
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
export function usePitchAccent(word: string | null): PitchAccentResult | null {
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
          setResult(lookupWord(dict, word));
        }
      })
      .catch(() => {
        if (!cancelled) setResult(null);
      });

    return () => {
      cancelled = true;
    };
  }, [word]);

  return result;
}
