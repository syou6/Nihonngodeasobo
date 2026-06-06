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

export function PitchWordCard({ word, reading, detectedPattern, compact = false }: Props): React.ReactElement {
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
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm flex flex-col items-center gap-3">
      {/* Word heading */}
      <div className="flex flex-col items-center gap-0.5">
        <span className="text-2xl font-bold text-gray-900">{word}</span>
        {pitchData && (
          <span className="text-sm text-gray-500">{pitchData.reading}</span>
        )}
      </div>

      {isLoading ? (
        <LoadingState compact={false} />
      ) : pitchData === null ? (
        <NotFoundState word={word} compact={false} />
      ) : (
        <PitchAccentDisplay
          morae={pitchData.morae}
          pattern={pitchData.pattern}
          patternName={pitchData.patternName}
          detectedPattern={detectedPattern}
        />
      )}
    </div>
  );
}
