import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Mic, Square, ArrowLeft, RotateCcw, ChevronRight, Loader2, Volume2, Trophy, Share2, X } from 'lucide-react';
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
  mergeProgress,
  fetchRemoteProgress,
  upsertRemoteProgress,
  type PitchProgress,
} from '../../lib/pitch-progress';
import { useAuthStore } from '../../stores/authStore';
import { supabase } from '../../lib/supabase';
import { loadNativeContours, type ContourMap } from '../../lib/native-contours';
import { buildShareCard } from '../../lib/share-card';
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
  const [contours, setContours] = useState<ContourMap>({});
  // First-run nudge: highlight "Listen" until the user has tried it once. Kept
  // non-blocking — the funnel goal is to reach the aha with zero walls.
  const [introSeen, setIntroSeen] = useState(() => !!localStorage.getItem('pitchIntroSeen'));

  const markIntroSeen = () => {
    if (introSeen) return;
    setIntroSeen(true);
    localStorage.setItem('pitchIntroSeen', '1');
  };

  const playNative = () => {
    markIntroSeen();
    const a = new Audio(`/pitch-audio/${encodeURIComponent(word)}.mp3`);
    // play() returns undefined in some environments (jsdom, older browsers).
    const p = a.play();
    if (p && typeof p.catch === 'function') p.catch(() => {/* asset missing or autoplay blocked */});
  };

  const userId = useAuthStore((s) => s.user?.id) ?? null;

  // This-session stats for the wrap-up summary.
  const [showSummary, setShowSummary] = useState(false);
  const [sessionAttempts, setSessionAttempts] = useState(0);
  const [sessionMastered, setSessionMastered] = useState(0);
  const sessionWordsRef = useRef<Set<string>>(new Set());

  // Cloud sync is batched: collect changed words + the latest progress, then
  // flush in one upsert on a debounce / summary / unmount instead of per attempt.
  const progressRef = useRef<PitchProgress>(progress);
  progressRef.current = progress;
  const dirtyRef = useRef<Set<string>>(new Set());
  const flushTimerRef = useRef<number | null>(null);
  const userIdRef = useRef<string | null>(userId);
  userIdRef.current = userId;

  const flushRemote = () => {
    if (flushTimerRef.current !== null) {
      clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
    }
    const uid = userIdRef.current;
    if (!uid || dirtyRef.current.size === 0) return;
    const words = [...dirtyRef.current];
    dirtyRef.current = new Set();
    void upsertRemoteProgress(supabase, uid, progressRef.current, words);
  };

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
  const nativeContour = contours[word];
  const showIntro = !introSeen && wordIndex === 0 && phase === 'ready';

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
      flushRemote(); // best-effort final sync of anything still queued
    };
  }, []);

  // Load the real native contours once (degrades to the idealized model line).
  useEffect(() => {
    let cancelled = false;
    loadNativeContours().then((c) => {
      if (!cancelled) setContours(c);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // On login, pull cloud progress and reconcile it with this device's local
  // record (best-of per word), then persist the merge both ways.
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      const remote = await fetchRemoteProgress(supabase, userId);
      if (cancelled) return;
      setProgress((local) => {
        const merged = mergeProgress(local, remote);
        saveProgress(merged);
        return merged;
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

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
    markIntroSeen();
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

    const justMastered = !isMastered(progress, word) && result.accuracy >= 80;
    const updated = recordAttempt(progress, word, result.accuracy);
    setProgress(updated);
    progressRef.current = updated;
    saveProgress(updated);
    // Queue this word and debounce the cloud flush (8s of inactivity).
    if (userId) {
      dirtyRef.current.add(word);
      if (flushTimerRef.current !== null) clearTimeout(flushTimerRef.current);
      flushTimerRef.current = window.setTimeout(flushRemote, 8000);
    }

    sessionWordsRef.current.add(word);
    setSessionAttempts((n) => n + 1);
    if (justMastered) setSessionMastered((n) => n + 1);

    setPhase('result');
    trackEvent('pitch_scored', { word, accuracy: result.accuracy });
  };

  const openSummary = () => {
    flushRemote();
    trackEvent('pitch_session_summary', {
      attempts: sessionAttempts,
      newlyMastered: sessionMastered,
      totalMastered: mastered,
    });
    setShowSummary(true);
  };

  const resumeSession = () => setShowSummary(false);

  const shareProgress = async () => {
    const text = `I just practiced Japanese pitch accent — ${mastered}/${PRACTICE_WORDS.length} words mastered${streak > 0 ? `, 🔥${streak} streak` : ''}!`;
    const url = typeof window !== 'undefined' ? window.location.origin : '';
    trackEvent('pitch_session_share', { totalMastered: mastered });
    try {
      const blob = await buildShareCard({ mastered, total: PRACTICE_WORDS.length, streak });
      const file = blob ? new File([blob], 'pitch-progress.png', { type: 'image/png' }) : null;

      const nav = typeof navigator !== 'undefined' ? navigator : undefined;
      // Prefer sharing the image where supported.
      if (file && nav?.canShare?.({ files: [file] }) && nav.share) {
        await nav.share({ files: [file], title: 'Pitch Accent Trainer', text });
        return;
      }
      if (nav?.share) {
        await nav.share({ title: 'Pitch Accent Trainer', text, url });
        return;
      }
      // No Web Share — download the image (or copy the text) as a fallback.
      if (blob) {
        const href = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = href;
        a.download = 'pitch-progress.png';
        a.click();
        URL.revokeObjectURL(href);
      } else if (nav?.clipboard) {
        await nav.clipboard.writeText(`${text} ${url}`.trim());
      }
    } catch {
      /* user dismissed the share sheet — nothing to do */
    }
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
                nativeContour={nativeContour}
              />
            )}

            <p className="text-xs text-gray-400 text-center mt-2">
              Blue = your pitch · green dashed = native model · bands = target high/low
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
              nativeContour={nativeContour}
            />

            <p className="text-xs text-gray-400 text-center mt-2">
              Blue = your pitch · green dashed = native model · bands = target high/low
            </p>
          </motion.div>
        )}

        {error && (
          <p className="text-sm text-red-600 text-center">{error}</p>
        )}

        {/* Controls */}
        <div className="flex flex-col items-center gap-3">
          {/* Listen FIRST (no mic needed) — the low-friction entry that lets a new
              user "get it" before the mic-permission prompt. Pulsing ring on the
              very first run points the user at where to start. */}
          <div className="relative w-full sm:w-64">
            {showIntro && (
              <span className="pointer-events-none absolute -inset-1 rounded-xl ring-2 ring-brand-400 animate-pulse" />
            )}
            <Button onClick={playNative} variant="outline" size="lg" className="w-full">
              <Volume2 className="w-5 h-5 mr-2" />
              Listen to a native
            </Button>
          </div>

          {phase === 'ready' && (showIntro || wordIndex === 0) && (
            <p className={`text-xs text-center ${showIntro ? 'text-brand-600 font-medium' : 'text-gray-400'}`}>
              {showIntro
                ? '👂 Start here — tap Listen, then record. 箸 or 橋? Your pitch decides.'
                : 'Tap Listen first — then record yourself and we\'ll score your pitch.'}
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

          {sessionAttempts > 0 && phase !== 'recording' && (
            <button
              onClick={openSummary}
              className="text-sm text-gray-400 hover:text-gray-600 underline underline-offset-2 transition-colors"
            >
              Finish session
            </button>
          )}
        </div>
      </motion.div>

      {showSummary && (
        <SessionSummary
          attempts={sessionAttempts}
          wordsPracticed={sessionWordsRef.current.size}
          newlyMastered={sessionMastered}
          totalMastered={mastered}
          totalWords={PRACTICE_WORDS.length}
          streak={streak}
          onShare={shareProgress}
          onResume={resumeSession}
          onDone={onBack}
        />
      )}
    </div>
  );
};

interface SessionSummaryProps {
  attempts: number;
  wordsPracticed: number;
  newlyMastered: number;
  totalMastered: number;
  totalWords: number;
  streak: number;
  onShare: () => void;
  onResume: () => void;
  onDone: () => void;
}

const SessionSummary: React.FC<SessionSummaryProps> = ({
  attempts,
  wordsPracticed,
  newlyMastered,
  totalMastered,
  totalWords,
  streak,
  onShare,
  onResume,
  onDone,
}) => {
  const pct = Math.round((totalMastered / totalWords) * 100);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
      >
        <button
          onClick={onResume}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
            <Trophy className="h-7 w-7 text-amber-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Session complete</h2>
          <p className="mt-1 text-sm text-gray-500">Nice work — here's how you did.</p>
        </div>

        <div className="my-5 grid grid-cols-3 gap-3 text-center">
          <Stat label="Practiced" value={wordsPracticed} />
          <Stat label="New mastered" value={newlyMastered} highlight />
          <Stat label="Attempts" value={attempts} />
        </div>

        <div className="mb-5">
          <div className="mb-1 flex justify-between text-xs text-gray-500">
            <span>Total mastered</span>
            <span>
              {totalMastered}/{totalWords}
              {streak > 0 && <span className="ml-2 text-orange-500">🔥 {streak}</span>}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
            <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Button onClick={onShare} variant="primary" size="lg" className="w-full">
            <Share2 className="mr-2 h-5 w-5" />
            Share my progress
          </Button>
          <div className="flex gap-2">
            <Button onClick={onResume} variant="outline" size="lg" className="flex-1">
              Keep practicing
            </Button>
            <Button onClick={onDone} variant="ghost" size="lg" className="flex-1">
              Done
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const Stat: React.FC<{ label: string; value: number; highlight?: boolean }> = ({
  label,
  value,
  highlight,
}) => (
  <div className="rounded-xl bg-gray-50 py-3">
    <div className={`text-2xl font-black ${highlight ? 'text-green-600' : 'text-gray-900'}`}>
      {value}
    </div>
    <div className="mt-0.5 text-xs text-gray-500">{label}</div>
  </div>
);
