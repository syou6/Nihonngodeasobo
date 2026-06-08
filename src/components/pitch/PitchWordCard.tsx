import React from 'react';
import { usePitchAccent } from '../../hooks/usePitchAccent';
import { PitchAccentDisplay } from './PitchAccentDisplay';

interface Props {
  word: string;
  /** Intended reading so the dictionary lookup picks the correct entry. */
  reading?: string;
  /** Per-mora correctness overlay passed through to PitchAccentDisplay */
  detectedPattern?: (boolean | null)[];
  /** Compact variant for inline use — smaller card, no border */
  compact?: boolean;
  /** English gloss shown under the word (when known). */
  english?: string;
  /** Set when this word shares a reading with another (minimal pair). */
  pairWith?: string;
}

// Plain-language explanation of each accent pattern + where the drop is.
function accentTip(patternName: string, morae: string[], pattern: number[]): string {
  const dropAfter = (() => {
    for (let i = 0; i < pattern.length - 1; i++) {
      if (pattern[i] === 1 && pattern[i + 1] === 0) return i + 1;
    }
    return 0;
  })();
  const at = dropAfter >= 1 && dropAfter <= morae.length ? `「${morae[dropAfter - 1]}」` : 'the next particle';
  switch (patternName) {
    case '平板': return 'Heiban — starts low, rises, and stays high (no drop).';
    case '頭高': return `Atamadaka — starts high, then drops after ${at}.`;
    case '中高': return `Nakadaka — rises, then drops after ${at}.`;
    case '尾高': return 'Odaka — rises and stays high; the drop lands on the following particle.';
    default: return dropAfter ? `The pitch drops after ${at}.` : 'Stays high — no drop.';
  }
}

function LoadingState({ compact }: { compact: boolean }): React.ReactElement {
  if (compact) {
    return (
      <span className="text-xs text-gray-400 animate-pulse">Loading…</span>
    );
  }
  return (
    <div className="flex items-center justify-center h-20 text-sm text-gray-400 animate-pulse">
      Loading…
    </div>
  );
}

function NotFoundState({ word, compact }: { word: string; compact: boolean }): React.ReactElement {
  if (compact) {
    return (
      <span className="text-xs text-gray-400">
        No accent data for “{word}”
      </span>
    );
  }
  return (
    <div className="flex items-center justify-center h-20 text-sm text-gray-400">
      No pitch accent data found for “{word}”
    </div>
  );
}

export function PitchWordCard({ word, reading, detectedPattern, compact = false, english, pairWith }: Props): React.ReactElement {
  const pitchData = usePitchAccent(word, reading);

  // Still loading (null result, no cache hit yet)
  const isLoading = pitchData === null && word.length > 0;

  if (compact) {
    return (
      <div className="inline-flex flex-col items-center gap-1">
        {isLoading ? (
          <LoadingState compact />
        ) : pitchData === null ? (
          <NotFoundState word={word} compact />
        ) : (
          <>
            <span className="text-xs text-gray-600 font-medium">{pitchData.reading}</span>
            <PitchAccentDisplay
              morae={pitchData.morae}
              pattern={pitchData.pattern}
              patternName={pitchData.patternName}
              detectedPattern={detectedPattern}
            />
          </>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-gray-200 bg-white px-6 py-7 shadow-sm flex flex-col items-center gap-4 w-full max-w-sm">
      {/* Word heading */}
      <div className="flex flex-col items-center gap-1">
        <span className="text-6xl font-extrabold text-gray-900 leading-none">{word}</span>
        {pitchData && (
          <span className="text-lg text-gray-500">{pitchData.reading}</span>
        )}
        {english && <span className="text-sm text-gray-400">{english}</span>}
      </div>

      {pairWith && (
        <span className="inline-flex items-center gap-1 text-xs font-bold text-orange-600 bg-orange-50 px-3 py-1 rounded-full">
          ⚖️ minimal pair with {pairWith}
        </span>
      )}

      {isLoading ? (
        <LoadingState compact={false} />
      ) : pitchData === null ? (
        <NotFoundState word={word} compact={false} />
      ) : (
        <>
          <PitchAccentDisplay
            morae={pitchData.morae}
            pattern={pitchData.pattern}
            patternName={pitchData.patternName}
            detectedPattern={detectedPattern}
          />
          <p className="text-sm text-gray-500 text-center leading-relaxed">
            {accentTip(pitchData.patternName, pitchData.morae, pitchData.pattern)}
          </p>
        </>
      )}
    </div>
  );
}
