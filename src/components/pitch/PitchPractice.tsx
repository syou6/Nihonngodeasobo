import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Mic, Square, ArrowLeft, RotateCcw, ChevronRight, Loader2, Volume2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { PitchWordCard } from './PitchWordCard';
import { PitchContourGraph } from './PitchContourGraph';
import { usePitchAccent } from '../../hooks/usePitchAccent';
import { PitchTracker, type PitchFrame } from '../../lib/pitch-tracker';
import { comparePitchToPattern } from '../../lib/pitch-analyzer';
import {
  loadProgress,
  saveProgress,
  recordAttempt,
  isMastered,
  masteredCount,
  nextWordIndex,
  type PitchProgress,
} from '../../lib/pitch-progress';
import { trackEvent } from '../../lib/analytics';

import { PRACTICE_WORDS } from './practiceWords';

const WORD_LIST = PRACTICE_WORDS.map((w) => w.word);

type Phase = 'ready' | 'recording' | 'result';

interface PitchPracticeProps {
  onBack: () => void;
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

export const PitchPractice: React.FC<PitchPracticeProps> = ({ onBack }) => {
  const [wordIndex, setWordIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('ready');
  const [frames, setFrames] = useState<PitchFrame[]>([]);
  const [liveFrames, setLiveFrames] = useState<PitchFrame[]>([]);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [matches, setMatches] = useState<(boolean | null)[] | undefined>(undefined);
  const [coach, setCoach] = useState<string | null>(null);
  const [streak, setStreak] = useState(() => {
    const n = Number(localStorage.getItem('pitchStreak'));
    return Number.isFinite(n) && n > 0 ? n : 0;
  });
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<PitchProgress>(() => loadProgress());

  const trackerRef = useRef<PitchTracker | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  // Live contour: onPitch fires ~60fps, so buffer frames in a ref and flush to
  // state on an interval — decouples React re-renders from the detection rate.
  const liveBufferRef = useRef<PitchFrame[]>([]);
  const liveTimerRef = useRef<number | null>(null);

  const { word, reading } = PRACTICE_WORDS[wordIndex];
  const pitchData = usePitchAccent(word, reading);
  const isLoadingAccent = pitchData === null;
  // Minimal pair: another curriculum word with the same reading (箸/橋, 雨/飴).
  const pairWith = PRACTICE_WORDS.find((w) => w.reading === reading && w.word !== word)?.word;
  const mastered = masteredCount(progress, WORD_LIST);
  const wordMastered = isMastered(progress, word);

  const stopLiveFlush = () => {
    if (liveTimerRef.current !== null) {
      clearInterval(liveTimerRef.current);
      liveTimerRef.current = null;
    }
  };

  const releaseMic = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    trackerRef.current = null;
  };

  // Stop the mic if the component unmounts mid-recording.
  useEffect(() => {
    return () => {
      stopLiveFlush();
      trackerRef.current?.stop();
      releaseMic();
    };
  }, []);

  const resetAttempt = () => {
    stopLiveFlush();
    setPhase('ready');
    setFrames([]);
    setLiveFrames([]);
    liveBufferRef.current = [];
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
      liveBufferRef.current = [];
      setLiveFrames([]);
      tracker.onPitch = (frame) => {
        liveBufferRef.current.push(frame);
      };
      tracker.start(stream);
      setPhase('recording');
      // Flush the buffered frames to state ~10x/sec for a live contour.
      liveTimerRef.current = window.setInterval(() => {
        setLiveFrames(liveBufferRef.current.slice());
      }, 100);
    } catch {
      setError('Microphone access was denied. Please allow mic access and try again.');
      releaseMic();
    }
  };

  const stopRecording = () => {
    const tracker = trackerRef.current;
    if (!tracker || !pitchData) return;

    stopLiveFlush();
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

    const updated = recordAttempt(progress, word, result.accuracy);
    setProgress(updated);
    saveProgress(updated);

    setPhase('result');
    trackEvent('pitch_scored', { word, accuracy: result.accuracy });
  };

  // Resurface the nearest word the learner hasn't mastered yet (≥80), rather
  // than marching through the curriculum in a fixed loop.
  const nextWord = () => {
    setWordIndex((i) => nextWordIndex(WORD_LIST, progress, i));
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
            {wordMastered && <span className="ml-2 text-green-600 font-semibold">✓ mastered</span>}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div
            className="inline-flex items-center gap-1 rounded-full bg-green-50 text-green-700 font-semibold text-sm px-3 py-1"
            title="Words mastered (≥80)"
          >
            ✓ {mastered}/{PRACTICE_WORDS.length}
          </div>
          {streak > 0 && (
            <div className="inline-flex items-center gap-1 rounded-full bg-orange-50 text-orange-600 font-bold text-sm px-3 py-1">
              🔥 {streak}
            </div>
          )}
        </div>
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

        {/* Live: stream the user's pitch against the target bands while recording */}
        {phase === 'recording' && pitchData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-2xl border border-red-200 bg-white p-5"
          >
            <div className="flex items-center justify-center gap-2 mb-3">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
              </span>
              <p className="text-sm font-semibold text-red-600">
                Recording — match the shaded bands
              </p>
            </div>

            <PitchContourGraph
              frames={liveFrames}
              expectedPattern={{ morae: pitchData.morae, pattern: pitchData.pattern }}
            />

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
