import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Mic, Square, ArrowLeft, RotateCcw, ChevronRight, Loader2, Volume2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { PitchWordCard } from './PitchWordCard';
import { PitchContourGraph } from './PitchContourGraph';
import { usePitchAccent } from '../../hooks/usePitchAccent';
import { PitchTracker, type PitchFrame } from '../../lib/pitch-tracker';
import { comparePitchToPattern } from '../../lib/pitch-analyzer';
import { trackEvent } from '../../lib/analytics';
import { logAttempt } from '../../lib/pitchAttempts';
import { useAuthStore } from '../../stores/authStore';

import { PRACTICE_WORDS } from './practiceWords';

type Phase = 'ready' | 'recording' | 'result';

interface PitchPracticeProps {
  onBack: () => void;
  onViewKarte?: () => void;
}

function scoreColor(score: number): string {
  if (score >= 80) return 'text-green-600';
  if (score >= 50) return 'text-amber-600';
  return 'text-red-600';
}

// Actionable feedback from the detected vs target accent nucleus.
function coachText(
  result: { userNucleus: number; targetNucleus: number; accuracy: number },
  morae: string[],
): string {
  const at = (n: number) => (n >= 1 && n <= morae.length ? `「${morae[n - 1]}」` : 'the particle');
  const { userNucleus, targetNucleus, accuracy } = result;
  if (accuracy >= 80) {
    return targetNucleus === 0
      ? 'Nice — 平板: it stays high with no drop. ✅'
      : `Nice — the drop after ${at(targetNucleus)} is right. ✅`;
  }
  const target = targetNucleus === 0 ? 'no drop — 平板, stays high' : `a drop after ${at(targetNucleus)}`;
  const you = userNucleus === 0 ? 'you kept it flat' : `you dropped after ${at(userNucleus)}`;
  return `Target: ${target}. But ${you}.`;
}

const KARTE_UNLOCK = 5; // scores needed to "unlock" the first Karte reveal

export const PitchPractice: React.FC<PitchPracticeProps> = ({ onBack, onViewKarte }) => {
  const { user } = useAuthStore();
  const [wordIndex, setWordIndex] = useState(0);
  const [scoredCount, setScoredCount] = useState(0); // scorings this session → Karte pull
  const [phase, setPhase] = useState<Phase>('ready');
  const [frames, setFrames] = useState<PitchFrame[]>([]);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [matches, setMatches] = useState<(boolean | null)[] | undefined>(undefined);
  const [coach, setCoach] = useState<string | null>(null);
  const [streak, setStreak] = useState(() => {
    const n = Number(localStorage.getItem('pitchStreak'));
    return Number.isFinite(n) && n > 0 ? n : 0;
  });
  const [error, setError] = useState<string | null>(null);

  const trackerRef = useRef<PitchTracker | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const { word, reading } = PRACTICE_WORDS[wordIndex];
  const pitchData = usePitchAccent(word, reading);
  const isLoadingAccent = pitchData === null;
  // Minimal pair: another curriculum word with the same reading (箸/橋, 雨/飴).
  const pairWith = PRACTICE_WORDS.find((w) => w.reading === reading && w.word !== word)?.word;

  const releaseMic = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    trackerRef.current = null;
  };

  // Stop the mic if the component unmounts mid-recording.
  useEffect(() => {
    return () => {
      trackerRef.current?.stop();
      releaseMic();
    };
  }, []);

  const resetAttempt = () => {
    setPhase('ready');
    setFrames([]);
    setAccuracy(null);
    setMatches(undefined);
    setCoach(null);
    setError(null);
  };

  const startRecording = async () => {
    if (!pitchData) return;
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const tracker = new PitchTracker();
      trackerRef.current = tracker;
      tracker.start(stream);
      setPhase('recording');
    } catch {
      setError('Microphone access was denied. Please allow mic access and try again.');
      releaseMic();
    }
  };

  const stopRecording = () => {
    const tracker = trackerRef.current;
    if (!tracker || !pitchData) return;

    const captured = tracker.stop();
    releaseMic();

    const moraCount = pitchData.morae.length;
    const result = comparePitchToPattern(captured, pitchData.pattern, moraCount);

    setFrames(captured);
    setMatches(result.matches);
    setAccuracy(result.accuracy);
    setCoach(coachText(result, pitchData.morae));
    const newStreak = result.accuracy >= 80 ? streak + 1 : 0;
    setStreak(newStreak);
    localStorage.setItem('pitchStreak', String(newStreak));
    // Lightweight progress stats for the home dashboard.
    const num = (k: string) => Number(localStorage.getItem(k)) || 0;
    localStorage.setItem('pitchBest', String(Math.max(num('pitchBest'), newStreak)));
    localStorage.setItem('pitchScored', String(num('pitchScored') + 1));
    if (result.accuracy >= 80) {
      const mastered = new Set(JSON.parse(localStorage.getItem('pitchMastered') || '[]'));
      mastered.add(word);
      localStorage.setItem('pitchMastered', JSON.stringify([...mastered]));
    }
    setPhase('result');
    setScoredCount((c) => c + 1);
    trackEvent('pitch_scored', { word, accuracy: result.accuracy });
    // Karte foundation: log every attempt (server for members, localStorage for
    // guests — backfilled at signup).
    logAttempt(user?.id ?? null, {
      word,
      reading,
      pattern_name: pitchData.patternName ?? null,
      target_nucleus: result.targetNucleus,
      detected_nucleus: result.userNucleus,
      accuracy: result.accuracy,
    });
  };

  const nextWord = () => {
    setWordIndex((i) => (i + 1) % PRACTICE_WORDS.length);
    resetAttempt();
  };

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onBack}
          className="p-2 -ml-2 text-gray-500 hover:text-gray-800 transition-colors"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Pitch Accent Practice</h1>
          <p className="text-sm text-gray-500">
            Word {wordIndex + 1} of {PRACTICE_WORDS.length}
          </p>
        </div>
        {streak > 0 && (
          <div className="ml-auto inline-flex items-center gap-1 rounded-full bg-orange-50 text-orange-600 font-bold text-sm px-3 py-1">
            🔥 {streak}
          </div>
        )}
      </div>

      <motion.div
        key={word}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Target word + expected pattern (green/red overlay after an attempt) */}
        <div className="flex justify-center">
          <PitchWordCard word={word} reading={reading} detectedPattern={matches} pairWith={pairWith} />
        </div>

        {/* Result: score + recorded contour vs expected bands */}
        {phase === 'result' && accuracy !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-2xl border border-gray-200 bg-white p-5"
          >
            <div className="text-center mb-4">
              <div className={`text-5xl font-black ${scoreColor(accuracy)}`}>
                {accuracy}
                <span className="text-2xl text-gray-400">/100</span>
              </div>
              <p className="text-sm text-gray-500 mt-1">Pitch accuracy</p>
            </div>

            {coach && (
              <p className={`text-center text-sm font-medium mb-4 ${accuracy >= 80 ? 'text-green-700' : 'text-gray-700'}`}>
                {coach}
              </p>
            )}

            {/* Karte pull — give the scoring loop a visible GOAL so users don't just
                drill aimlessly and bounce. Progress bar until KARTE_UNLOCK, then a
                prominent reveal that pulls them into their diagnosis (the carrot). */}
            {(() => {
              const goKarte = () => {
                trackEvent('karte_pull_click', { scored: scoredCount });
                if (onViewKarte) onViewKarte();
                else window.location.href = '/app.html?guest=true&view=karte';
              };
              if (scoredCount >= KARTE_UNLOCK) {
                return (
                  <button onClick={goKarte} className="w-full mb-4">
                    <div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-500 text-white p-4 text-center shadow-md">
                      <p className="font-bold">🎉 Your Pitch Karte is ready</p>
                      <p className="text-xs text-white/80 mt-0.5">See exactly which patterns you're getting wrong</p>
                      <span className="inline-block mt-2 bg-white text-indigo-600 text-sm font-bold px-5 py-2 rounded-full">
                        See my diagnosis →
                      </span>
                    </div>
                  </button>
                );
              }
              return (
                <div className="mb-4 rounded-xl bg-indigo-50 border border-indigo-100 p-3">
                  <div className="flex items-center justify-between text-xs font-medium text-indigo-900 mb-1.5">
                    <span>📋 Pitch Karte unlocking</span>
                    <span>{scoredCount}/{KARTE_UNLOCK}</span>
                  </div>
                  <div className="h-2 bg-indigo-100 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${(scoredCount / KARTE_UNLOCK) * 100}%` }} />
                  </div>
                  <p className="text-xs text-indigo-700/80 mt-1.5 text-center">
                    {KARTE_UNLOCK - scoredCount} more word{KARTE_UNLOCK - scoredCount === 1 ? '' : 's'} to unlock your diagnosis
                  </p>
                </div>
              );
            })()}

            {pitchData && (
              <PitchContourGraph
                frames={frames}
                expectedPattern={{ morae: pitchData.morae, pattern: pitchData.pattern }}
              />
            )}

            <p className="text-xs text-gray-400 text-center mt-2">
              Blue line = your pitch · shaded bands = target high/low
            </p>
          </motion.div>
        )}

        {error && (
          <p className="text-sm text-red-600 text-center">{error}</p>
        )}

        {/* Controls */}
        <div className="flex flex-col items-center gap-3">
          {/* Listen FIRST (no mic needed) — the low-friction entry that lets a new
              user "get it" before the mic-permission prompt. */}
          <Button
            onClick={() => {
              const a = new Audio(`/pitch-audio/${encodeURIComponent(word)}.mp3`);
              a.play().catch(() => {/* asset missing or autoplay blocked */});
            }}
            variant="outline"
            size="lg"
            className="w-full sm:w-64"
          >
            <Volume2 className="w-5 h-5 mr-2" />
            Listen to a native
          </Button>

          {phase === 'ready' && wordIndex === 0 && (
            <p className="text-xs text-gray-400 text-center">
              👂 Tap Listen first — then record yourself and we'll score your pitch.
            </p>
          )}

          {phase === 'ready' && (
            <Button
              onClick={startRecording}
              variant="primary"
              size="lg"
              className="w-full sm:w-64"
              disabled={isLoadingAccent}
            >
              {isLoadingAccent ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Loading…
                </>
              ) : (
                <>
                  <Mic className="w-5 h-5 mr-2" />
                  Record & say it
                </>
              )}
            </Button>
          )}

          {phase === 'recording' && (
            <Button
              onClick={stopRecording}
              variant="primary"
              size="lg"
              className="w-full sm:w-64 !bg-red-500 hover:!bg-red-600"
            >
              <Square className="w-5 h-5 mr-2" />
              Stop
            </Button>
          )}

          {phase === 'result' && (
            <div className="flex gap-3 w-full sm:w-auto">
              <Button onClick={resetAttempt} variant="outline" size="lg" className="flex-1">
                <RotateCcw className="w-5 h-5 mr-2" />
                Retry
              </Button>
              <Button onClick={nextWord} variant="primary" size="lg" className="flex-1">
                Next
                <ChevronRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
