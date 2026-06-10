import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Mic, Square, ArrowLeft, RotateCcw, ChevronRight, Loader2, Volume2, Trophy, Share2, X, Sparkles } from 'lucide-react';
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
import { useSubscription } from '../../hooks/useSubscription';
import { supabase } from '../../lib/supabase';
import { loadNativeContours, type ContourMap } from '../../lib/native-contours';
import { buildShareCard } from '../../lib/share-card';
import { getVariant } from '../../lib/ab';
import {
  canScore,
  recordScoring,
  scoringsRemaining,
  wordLimitFor,
  FREE_DAILY_SCORINGS,
} from '../../lib/pitch-limits';
import { trackEvent } from '../../lib/analytics';

import { PRACTICE_WORDS } from './practiceWords';

const WORD_LIST = PRACTICE_WORDS.map((w) => w.word);

type Phase = 'ready' | 'recording' | 'result';

interface PitchPracticeProps {
  onBack: () => void;
  /** Navigate to the in-app pricing view (logged-in users). Guests go to signup. */
  onUpgrade?: () => void;
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

export const PitchPractice: React.FC<PitchPracticeProps> = ({ onBack, onUpgrade }) => {
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
  const isGuest = !userId;
  const { isPremium, loading: subLoading } = useSubscription();
  const tier: 'guest' | 'free' | 'premium' = isGuest ? 'guest' : isPremium ? 'premium' : 'free';
  // While the subscription is still resolving, don't flash limits at a user who
  // may turn out to be premium — fail open until we know.
  const limitsKnown = isGuest || !subLoading;
  const tierWordLimit = wordLimitFor(tier);
  const tierWordCount = Math.min(PRACTICE_WORDS.length, tierWordLimit);
  const tierWordList = WORD_LIST.slice(0, tierWordCount);
  const [paywall, setPaywall] = useState<null | 'daily_limit'>(null);
  const [remainingToday, setRemainingToday] = useState(() => scoringsRemaining(isPremium));

  // A/B: when to show the guest signup prompt. 'peak' = first mastery or 3
  // scored reps (value peak); 'first_score' = right after the first score.
  const promptVariant = useRef(getVariant('signup_prompt_trigger', ['peak', 'first_score'] as const)).current;

  // This-session stats for the wrap-up summary.
  const [showSummary, setShowSummary] = useState(false);
  const [signupPrompt, setSignupPrompt] = useState<{ reason: 'mastered' | 'engaged' } | null>(null);
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
  // Single words take ~1-2s; auto-stop so a forgotten Stop doesn't feed 30s of
  // room noise into the scorer.
  const autoStopRef = useRef<number | null>(null);

  const { word, reading, meaning } = PRACTICE_WORDS[wordIndex];
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
      if (autoStopRef.current !== null) clearTimeout(autoStopRef.current);
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
  // record (best-of per word), then persist the merge both ways — including
  // pushing up anything earned as a guest before signup, so "save your
  // progress" actually holds.
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      const remote = await fetchRemoteProgress(supabase, userId);
      if (cancelled) return;
      const merged = mergeProgress(progressRef.current, remote);
      progressRef.current = merged;
      setProgress(merged);
      saveProgress(merged);
      const words = Object.keys(merged);
      if (words.length > 0) void upsertRemoteProgress(supabase, userId, merged, words);
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
    // The upgrade moment: free scoring is capped per day (as priced).
    if (limitsKnown && !canScore(isPremium)) {
      setPaywall('daily_limit');
      trackEvent('pitch_paywall_hit', { reason: 'daily_limit', tier });
      return;
    }
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
      autoStopRef.current = window.setTimeout(() => stopRecording(), 6000);
    } catch {
      setError('Microphone access was denied. Please allow mic access and try again.');
      releaseMic();
    }
  };

  const stopRecording = () => {
    const tracker = trackerRef.current;
    if (!tracker || !pitchData) return;

    if (autoStopRef.current !== null) {
      clearTimeout(autoStopRef.current);
      autoStopRef.current = null;
    }
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
    const attemptsNow = sessionAttempts + 1;
    const masteredNow = sessionMastered + (justMastered ? 1 : 0);
    setSessionAttempts(attemptsNow);
    if (justMastered) setSessionMastered((n) => n + 1);

    setPhase('result');
    trackEvent('pitch_scored', { word, accuracy: result.accuracy });

    if (!isPremium) {
      recordScoring();
      setRemainingToday(scoringsRemaining(false));
    }

    // Convert at the value peak: invite the guest to save progress — once per
    // session so it never nags. The trigger point is A/B tested.
    const shouldPrompt =
      promptVariant === 'first_score' ? attemptsNow >= 1 : justMastered || attemptsNow >= 3;
    if (isGuest && !sessionStorage.getItem('pitchSignupPromptSeen') && shouldPrompt) {
      const reason = justMastered ? 'mastered' : 'engaged';
      sessionStorage.setItem('pitchSignupPromptSeen', '1');
      setSignupPrompt({ reason });
      trackEvent('pitch_guest_signup_prompt', {
        reason,
        attempts: attemptsNow,
        mastered: masteredNow,
        ab_signup_prompt_trigger: promptVariant,
      });
    }
  };

  const goToSignup = (source: string) => {
    flushRemote();
    trackEvent('pitch_guest_signup_click', {
      source,
      totalMastered: mastered,
      ab_signup_prompt_trigger: promptVariant,
    });
    window.location.href = '/app.html?signup=true';
  };

  // Guests upgrade by signing up first; logged-in users go to the pricing view.
  const handleUpgrade = (source: string) => {
    trackEvent('pitch_upgrade_click', { source, tier });
    if (isGuest) {
      goToSignup(source);
    } else if (onUpgrade) {
      onUpgrade();
    } else {
      window.location.href = '/app.html?view=pricing';
    }
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
  // than marching through the curriculum in a fixed loop. Guests cycle within
  // the free slice; an account unlocks the rest.
  const nextWord = () => {
    setWordIndex((i) => nextWordIndex(tierWordList, progress, i));
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
            Word {wordIndex + 1} of {tierWordCount}
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
          <PitchWordCard word={word} reading={reading} english={meaning} detectedPattern={matches} pairWith={pairWith} />
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

          {limitsKnown && tier !== 'premium' && phase !== 'recording' && (
            <button
              onClick={() => (isGuest ? goToSignup('word_gate') : handleUpgrade('word_gate'))}
              className="text-xs text-gray-400 hover:text-brand-600 transition-colors"
            >
              🔒 {isGuest ? 'Guest preview' : 'Free plan'}: {tierWordCount} of {PRACTICE_WORDS.length} words ·{' '}
              <span className="font-semibold text-brand-600 underline underline-offset-2">
                {isGuest ? 'unlock more free' : 'unlock all 66'}
              </span>
              {remainingToday !== Infinity && (
                <span className="ml-2 text-gray-400">
                  🎙 {remainingToday}/{FREE_DAILY_SCORINGS} scorings left today
                </span>
              )}
            </button>
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
          isGuest={!userId}
          onShare={shareProgress}
          onResume={resumeSession}
          onDone={onBack}
        />
      )}

      {paywall && (
        <PaywallModal
          isGuest={isGuest}
          remainingTomorrow={FREE_DAILY_SCORINGS}
          onUpgrade={() => handleUpgrade('paywall_daily_limit')}
          onDismiss={() => {
            trackEvent('pitch_paywall_dismiss', { reason: paywall, tier });
            setPaywall(null);
          }}
        />
      )}

      {signupPrompt && (
        <GuestSignupPrompt
          reason={signupPrompt.reason}
          mastered={mastered}
          totalWords={PRACTICE_WORDS.length}
          streak={streak}
          onSignup={() => goToSignup(`prompt_${signupPrompt.reason}`)}
          onDismiss={() => {
            trackEvent('pitch_guest_signup_dismiss', { reason: signupPrompt.reason });
            setSignupPrompt(null);
          }}
        />
      )}
    </div>
  );
};

interface PaywallModalProps {
  isGuest: boolean;
  remainingTomorrow: number;
  onUpgrade: () => void;
  onDismiss: () => void;
}

// Shown when the free daily scoring cap is reached — the natural upgrade moment.
const PaywallModal: React.FC<PaywallModalProps> = ({
  isGuest,
  remainingTomorrow,
  onUpgrade,
  onDismiss,
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
    >
      <button
        onClick={onDismiss}
        className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
        aria-label="Close"
      >
        <X className="w-5 h-5" />
      </button>

      <div className="text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
          <Mic className="h-7 w-7 text-amber-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">You're on a roll — daily limit reached</h2>
        <p className="mt-2 text-sm text-gray-600">
          Free includes <strong>{remainingTomorrow} voice scorings a day</strong> (resets tomorrow).
          Premium removes the cap and unlocks all 66 words, minimal pairs, and progress tracking.
        </p>
      </div>

      <div className="mt-5 flex flex-col gap-2">
        <Button onClick={onUpgrade} variant="primary" size="lg" className="w-full">
          {isGuest ? 'Create account & go unlimited' : 'Go unlimited — $8.99/mo'}
        </Button>
        <button
          onClick={onDismiss}
          className="text-sm text-gray-400 hover:text-gray-600 underline underline-offset-2"
        >
          Come back tomorrow
        </button>
      </div>
      <p className="mt-3 text-center text-xs text-gray-400">
        $59/yr saves 45% · cancel anytime
      </p>
    </motion.div>
  </div>
);

interface GuestSignupPromptProps {
  reason: 'mastered' | 'engaged';
  mastered: number;
  totalWords: number;
  streak: number;
  onSignup: () => void;
  onDismiss: () => void;
}

const GuestSignupPrompt: React.FC<GuestSignupPromptProps> = ({
  reason,
  mastered,
  totalWords,
  streak,
  onSignup,
  onDismiss,
}) => {
  const headline =
    reason === 'mastered'
      ? mastered === 1
        ? 'You just mastered your first word! 🎉'
        : `${mastered} words mastered! 🎉`
      : "You're getting the hang of this 🎯";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
      >
        <button
          onClick={onDismiss}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-brand-50">
            <Sparkles className="h-7 w-7 text-brand-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">{headline}</h2>
          {/* Loss aversion: their progress lives only on this device until they sign up. */}
          <p className="mt-2 text-sm text-gray-600">
            Create a free account to <strong>save your progress</strong>
            {streak > 1 ? <> and your 🔥{streak} streak</> : null}, sync across devices,
            and keep unlocking all {totalWords} words.
          </p>
          <p className="mt-1 text-xs text-gray-400">
            Right now it's only saved on this device — clearing your browser loses it.
          </p>
        </div>

        <div className="mt-5 flex flex-col gap-2">
          <Button onClick={onSignup} variant="primary" size="lg" className="w-full">
            Create my free account
          </Button>
          <button
            onClick={onDismiss}
            className="text-sm text-gray-400 hover:text-gray-600 underline underline-offset-2"
          >
            Keep practicing as guest
          </button>
        </div>
        <p className="mt-3 text-center text-xs text-gray-400">No card required · takes 10 seconds</p>
      </motion.div>
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
  isGuest: boolean;
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
  isGuest,
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

        {isGuest && (
          <a
            href="/app.html?signup=true"
            onClick={() => trackEvent('pitch_summary_signup_click', { totalMastered })}
            className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-brand-50 px-4 py-3 text-sm font-bold text-brand-700 hover:bg-brand-100 transition-colors"
          >
            <Sparkles className="h-4 w-4" />
            Save your {totalMastered > 0 ? `${totalMastered}-word progress` : 'progress'} — create a free account
          </a>
        )}
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
