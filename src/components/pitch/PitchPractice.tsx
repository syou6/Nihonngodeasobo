import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Mic, Square, ArrowLeft, RotateCcw, ChevronRight, Loader2, Volume2, VolumeX } from 'lucide-react';
import { Button } from '../ui/Button';
import { PitchWordCard } from './PitchWordCard';
import { PitchContourGraph } from './PitchContourGraph';
import { usePitchAccent } from '../../hooks/usePitchAccent';
import { PitchTracker, type PitchFrame } from '../../lib/pitch-tracker';
import { comparePitchToPattern } from '../../lib/pitch-analyzer';
import { trackEvent } from '../../lib/analytics';
import { logAttempt } from '../../lib/pitchAttempts';
import { useAuthStore } from '../../stores/authStore';
import { shareResult } from '../../lib/shareCard';
import { Share2 } from 'lucide-react';
import { LivePitchLane, type LiveFrame } from './LivePitchLane';
import { meaningFlipFor } from './earPairs';
import { PitchBird, type BirdMood } from '../mascot/PitchBird';

const PATTERN_EN: Record<string, string> = { 平板: 'Heiban', 頭高: 'Atamadaka', 中高: 'Nakadaka', 尾高: 'Odaka' };

import { PRACTICE_WORDS } from './practiceWords';

type Phase = 'ready' | 'recording' | 'result';

interface PitchPracticeProps {
  onBack: () => void;
  onViewKarte?: () => void;
}

// Emotional reaction headline — makes each score feel like a win/near-miss
// (dopamine loop) instead of a flat number.
function reaction(score: number): { emoji: string; text: string } {
  if (score >= 90) return { emoji: '🎉', text: 'Native-like!' };
  if (score >= 80) return { emoji: '✅', text: "Nailed the drop!" };
  if (score >= 60) return { emoji: '👍', text: 'So close — almost there' };
  if (score >= 40) return { emoji: '💪', text: 'Keep going — you can feel it' };
  return { emoji: '🎧', text: 'Listen again, then retry' };
}

const WORD_BEST_PREFIX = 'pitchWordBest:';
function readWordBest(word: string): number {
  return Number(localStorage.getItem(WORD_BEST_PREFIX + word)) || 0;
}

const SET_SIZE = 8; // a bounded daily set gives the session a shape (Duolingo "one more")

// Daily streak by set-completion (controllable), not by score>=80 (skill-gated).
function bumpDailyStreak(): number {
  const today = new Date().toISOString().slice(0, 10);
  const last = localStorage.getItem('pitchDailyDate');
  let s = Number(localStorage.getItem('pitchDailyStreak')) || 0;
  if (last === today) return s; // already counted today
  const y = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  s = last === y ? s + 1 : 1;
  localStorage.setItem('pitchDailyStreak', String(s));
  localStorage.setItem('pitchDailyDate', today);
  return s;
}

// ── Sound design (the biggest sterile tell is silence). Synthesized via the
// Web Audio API — no asset pipeline. A nailed drop = a bright rising perfect
// fifth; a miss = a soft, non-judgy low tone. Mutable. ──────────────────────
let _actx: AudioContext | null = null;
function audioCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!_actx) _actx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (_actx.state === 'suspended') void _actx.resume();
    return _actx;
  } catch { return null; }
}
function tone(freq: number, start: number, dur: number, gain = 0.12, type: OscillatorType = 'sine') {
  const ctx = audioCtx();
  if (!ctx) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type; o.frequency.value = freq;
  o.connect(g); g.connect(ctx.destination);
  const t = ctx.currentTime + start;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.start(t); o.stop(t + dur + 0.02);
}
function isMuted(): boolean { return localStorage.getItem('pitchMuted') === '1'; }
function playFeedback(accuracy: number, combo = 0) {
  if (isMuted()) return;
  if (accuracy >= 80) {
    // rising perfect fifth, nudged up per combo — the SNAP "ding"
    const base = 523 * Math.pow(2 ** (1 / 12), Math.min(combo, 7));
    tone(base, 0, 0.18, 0.13, 'triangle');
    tone(base * 1.5, 0.08, 0.28, 0.13, 'triangle');
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(18);
  } else if (accuracy >= 50) {
    tone(440, 0, 0.16, 0.08, 'sine'); // gentle "almost"
  } else {
    tone(294, 0, 0.20, 0.07, 'sine'); // soft low, never a buzzer
  }
}

// Per-mora result chips — partial credit made visible (ELSA-style). Green =
// right, red = wrong, resolving left-to-right. Turns a harsh whole-word verdict
// into "4 of 5 right, just the drop after し".
const MoraChips: React.FC<{ morae: string[]; matches?: (boolean | null)[]; spin: number }> = ({ morae, matches, spin }) => (
  <div className="flex items-center justify-center gap-1.5 flex-wrap">
    {morae.map((m, i) => {
      const ok = matches?.[i];
      const cls = ok === true ? 'bg-green-100 text-green-700 ring-green-200'
        : ok === false ? 'bg-red-50 text-red-600 ring-red-200'
        : 'bg-gray-100 text-gray-400 ring-gray-200';
      return (
        <motion.span
          key={`${spin}-${i}`}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.12 + i * 0.1, type: 'spring', stiffness: 320, damping: 16 }}
          className={`font-display text-xl font-bold px-3 py-1.5 rounded-xl ring-1 ${cls}`}
        >
          {m}
        </motion.span>
      );
    })}
  </div>
);

// "You sound N% native" bar — animates up from your personal-best ghost. The
// value IS the honest accuracy (never inflated); only the FRAME changes from a
// cold grade to felt progress.
const NativeBar: React.FC<{ score: number; prevBest: number; spin: number }> = ({ score, prevBest, spin }) => {
  const col = score >= 80 ? '#16a34a' : score >= 50 ? '#d97706' : '#e11d48';
  return (
    <div className="w-full max-w-xs mx-auto">
      <div className="flex items-end justify-between mb-1.5">
        <span className="text-sm font-semibold text-gray-500">You sound</span>
        <span className="font-display text-3xl font-black" style={{ color: col }}>{score}%<span className="text-base text-gray-400 font-bold"> native</span></span>
      </div>
      <div className="relative h-3 bg-gray-100 rounded-full overflow-hidden">
        {prevBest > 0 && (
          <div className="absolute top-0 bottom-0 w-0.5 bg-gray-300 z-10" style={{ left: `${prevBest}%` }} title={`best ${prevBest}`} />
        )}
        <motion.div
          key={spin}
          className="h-full rounded-full"
          style={{ backgroundColor: col }}
          initial={{ width: `${prevBest}%` }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
        />
      </div>
      {prevBest > 0 && score > prevBest && (
        <p className="text-xs font-bold text-green-600 mt-1 text-center">↑ {score - prevBest} past your best!</p>
      )}
    </div>
  );
};

// Celebration burst for a high score — the peak dopamine moment. Deterministic
// particles (fixed angles), no dependency.
const CONFETTI = ['🎉', '✨', '🎊', '⭐️', '🟣', '🟡', '🔵', '🟠', '🎉', '✨', '⭐️', '🎊'];
const Confetti: React.FC<{ fire: number }> = ({ fire }) =>
  fire ? (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {CONFETTI.map((c, i) => {
        const angle = (i / CONFETTI.length) * 2 * Math.PI;
        const dx = Math.cos(angle) * 120;
        const dy = Math.sin(angle) * 120 - 40;
        return (
          <motion.span
            key={`${fire}-${i}`}
            className="absolute left-1/2 top-6 text-xl"
            initial={{ x: 0, y: 0, opacity: 1, scale: 0.6 }}
            animate={{ x: dx, y: dy + 160, opacity: 0, scale: 1.1, rotate: i * 40 }}
            transition={{ duration: 1.1, ease: 'easeOut' }}
          >
            {c}
          </motion.span>
        );
      })}
    </div>
  ) : null;

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
  // Optional deep-link to a specific word: ?w=<word> (used by the marketing
  // recorder + future drill-queue links).
  const [wordIndex, setWordIndex] = useState(() => {
    const w = new URLSearchParams(window.location.search).get('w');
    if (!w) return 0;
    const i = PRACTICE_WORDS.findIndex((x) => x.word === w);
    return i >= 0 ? i : 0;
  });
  const [scoredCount, setScoredCount] = useState(0); // scorings this session → Karte pull
  const [prevBest, setPrevBest] = useState(0);
  const [confetti, setConfetti] = useState(0); // bump to fire a celebration burst
  const [muted, setMuted] = useState(() => localStorage.getItem('pitchMuted') === '1');
  const [cleared, setCleared] = useState(false); // hit the daily set → celebration card
  const [dailyStreak, setDailyStreak] = useState(0);
  const [phase, setPhase] = useState<Phase>('ready');
  const [talking, setTalking] = useState(false); // sheep lip-syncs while native audio plays
  const [frames, setFrames] = useState<PitchFrame[]>([]);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [targetNucleus, setTargetNucleus] = useState(0);
  const [matches, setMatches] = useState<(boolean | null)[] | undefined>(undefined);
  const [coach, setCoach] = useState<string | null>(null);
  const [streak, setStreak] = useState(() => {
    const n = Number(localStorage.getItem('pitchStreak'));
    return Number.isFinite(n) && n > 0 ? n : 0;
  });
  const [error, setError] = useState<string | null>(null);

  const trackerRef = useRef<PitchTracker | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const liveRef = useRef<LiveFrame[]>([]); // real-time F0 for the karaoke lane

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

  // Play the native clip and lip-sync the sheep for the duration.
  const playNative = () => {
    const a = new Audio(`/pitch-audio/${encodeURIComponent(word)}.mp3`);
    setTalking(true);
    const stop = () => setTalking(false);
    a.addEventListener('ended', stop);
    a.addEventListener('error', stop);
    a.play().catch(stop); // asset missing or autoplay blocked
  };

  const startRecording = async () => {
    if (!pitchData) return;
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const tracker = new PitchTracker();
      trackerRef.current = tracker;
      liveRef.current = [];
      tracker.onPitch = (f) => { liveRef.current.push({ t: f.time, pitch: f.pitch }); };
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
    setTargetNucleus(result.targetNucleus);
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
    // Per-word personal best — a chase mechanic ("beat your best") that keeps
    // users retrying instead of bouncing.
    const best = readWordBest(word);
    setPrevBest(best);
    if (result.accuracy > best) localStorage.setItem(WORD_BEST_PREFIX + word, String(result.accuracy));
    if (result.accuracy >= 90) setConfetti((c) => c + 1); // celebrate the win
    playFeedback(result.accuracy, streak); // the win-moment sound + haptic
    setPhase('result');
    setScoredCount((c) => {
      const n = c + 1;
      if (n === SET_SIZE) { setDailyStreak(bumpDailyStreak()); setCleared(true); } // Daily Clear!
      return n;
    });
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

  // Daily Clear! — the session boundary that creates the "come back tomorrow" pull.
  if (cleared) {
    return (
      <div className="max-w-md mx-auto p-6 text-center min-h-[70vh] flex flex-col items-center justify-center">
        <Confetti fire={1} />
        <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 13 }}>
          <div className="text-6xl mb-3">🎉</div>
          <h2 className="font-display text-3xl font-extrabold text-ink mb-1">Daily set clear!</h2>
          <p className="text-gray-500 mb-5">{SET_SIZE} words trained. Your pitch is leveling up.</p>
          <div className="inline-flex items-center gap-2 rounded-full bg-accent-300/20 text-accent-500 font-bold px-5 py-2 mb-8">
            🔥 {dailyStreak}-day streak
          </div>
        </motion.div>
        <button onClick={() => { setCleared(false); setScoredCount(0); resetAttempt(); }}
          className="w-full bg-brand-gradient text-white font-display font-extrabold py-3.5 rounded-2xl shadow-soft mb-3 hover:scale-[1.02] transition-transform">
          Keep going →
        </button>
        <button onClick={onBack} className="w-full bg-white ring-1 ring-gray-200 text-gray-600 font-bold py-3.5 rounded-2xl hover:bg-gray-50">
          Done for today
        </button>
        <p className="text-xs text-gray-300 mt-4">Come back tomorrow to keep your streak 🔒</p>
      </div>
    );
  }

  const sheepMood: BirdMood = talking ? 'talking'
    : phase === 'recording' ? 'thinking'
    : phase === 'result' && accuracy !== null ? (accuracy >= 80 ? 'celebrate' : accuracy >= 50 ? 'happy' : 'sad')
    : 'idle';

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
        <PitchBird mood={sheepMood} size={48} className="shrink-0" />
        <div>
          <h1 className="font-display text-xl font-extrabold text-ink">Pitch Trainer</h1>
          <p className="text-sm text-gray-400 font-medium">
            Today: {Math.min(scoredCount, SET_SIZE)} / {SET_SIZE} words
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {streak > 0 && (
            <div className="inline-flex items-center gap-1 rounded-full bg-accent-300/20 text-accent-500 font-bold text-sm px-3 py-1">
              🔥 {streak}
            </div>
          )}
          {/* daily-set progress ring */}
          <svg width="34" height="34" viewBox="0 0 34 34" className="-rotate-90">
            <circle cx="17" cy="17" r="14" fill="none" stroke="#eef2ff" strokeWidth="4" />
            <circle cx="17" cy="17" r="14" fill="none" stroke="#4f46e5" strokeWidth="4" strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 14}
              strokeDashoffset={2 * Math.PI * 14 * (1 - Math.min(scoredCount, SET_SIZE) / SET_SIZE)} />
          </svg>
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

        {/* Live karaoke lane — while recording, your voice drives a dot that rides
            the target bands; steer it through the DROP gate. */}
        {phase === 'recording' && pitchData && (
          <LivePitchLane
            framesRef={liveRef}
            morae={pitchData.morae}
            pattern={pitchData.pattern.slice(0, pitchData.morae.length)}
            active={phase === 'recording'}
            onSnap={() => { if (!isMuted()) { tone(784, 0, 0.12, 0.14, 'triangle'); tone(1175, 0.07, 0.2, 0.14, 'triangle'); } if (navigator.vibrate) navigator.vibrate(22); }}
          />
        )}

        {/* Result: score + recorded contour vs expected bands */}
        {phase === 'result' && accuracy !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="relative rounded-3xl bg-white p-5 shadow-card ring-1 ring-gray-100 overflow-hidden"
          >
            <Confetti fire={confetti} />
            {/* Mute toggle */}
            <button
              onClick={() => { localStorage.setItem('pitchMuted', isMuted() ? '0' : '1'); setMuted(isMuted()); }}
              className="absolute top-3 right-3 text-gray-300 hover:text-gray-500"
              aria-label="Toggle sound"
            >
              {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>

            <div className="text-center mb-4">
              {/* Reaction headline (the felt verdict, not a grade) */}
              <motion.div
                key={`react-${scoredCount}`}
                initial={{ scale: 0.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 14 }}
                className="text-3xl mb-1"
              >
                {reaction(accuracy).emoji}
              </motion.div>
              <p className={`text-base font-extrabold mb-4 ${accuracy >= 80 ? 'text-green-700' : accuracy >= 60 ? 'text-amber-700' : 'text-gray-700'}`}>
                {reaction(accuracy).text}
              </p>

              {/* HERO: per-mora chips (partial credit) + native-likeness bar */}
              <div className="mb-4"><MoraChips morae={pitchData?.morae ?? []} matches={matches} spin={scoredCount} /></div>
              <NativeBar score={accuracy} prevBest={prevBest} spin={scoredCount} />
            </div>

            {/* SNAP meaning-flip — the identity jolt: nailing the drop on a homograph
                doesn't earn a number, it changes WHAT YOU SAID. */}
            {accuracy >= 70 && (() => {
              const flip = meaningFlipFor(word);
              if (!flip) return null;
              return (
                <motion.div
                  initial={{ scale: 0.7, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 220, damping: 14 }}
                  className="mb-4 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 text-white p-4 text-center shadow-md"
                >
                  <p className="font-display text-lg font-extrabold">You said {word} — {flip.en.toUpperCase()}!</p>
                  <p className="text-xs text-white/80 mt-1">not <span className="line-through opacity-70">{flip.twinWord} {flip.twinEn}</span> — your pitch decided it 🎯</p>
                </motion.div>
              );
            })()}

            {/* The one physical cue — what to DO next, not a judgment */}
            {coach && (
              <p className={`text-center text-sm font-semibold mb-4 ${accuracy >= 80 ? 'text-green-700' : 'text-gray-700'}`}>
                {coach}
              </p>
            )}

            {/* Viral share — high & visible (the win moment). Prominent on good
                scores; a polished card → friends try → organic growth. */}
            {pitchData && (
              <button
                onClick={async () => {
                  trackEvent('share_score_click', { accuracy });
                  try {
                    await shareResult({
                      word, reading, score: accuracy,
                      pattern: pitchData.patternName ?? '',
                      patternEn: PATTERN_EN[pitchData.patternName ?? ''] ?? '',
                      frames, targetNucleus, moraCount: pitchData.morae.length, streak,
                    });
                  } catch { /* user cancelled */ }
                }}
                className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold mb-4 transition-colors ${
                  accuracy >= 80
                    ? 'text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-md'
                    : 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100'
                }`}
              >
                <Share2 className="w-4 h-4" />
                {accuracy >= 80 ? 'Share this win — challenge a friend 🔥' : 'Share my score'}
              </button>
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

        {/* Mic denied → don't dead-end. Keep them learning by ear so the session
            (and the Karte data path) isn't lost over a permission prompt. */}
        {error && (
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-center">
            <p className="text-sm font-medium text-amber-900">🎤 No mic? You can still train your ear.</p>
            <p className="text-xs text-amber-700/90 mt-1">
              Tap <b>Listen to a native</b> above and learn the pitch shape — or allow mic access in your browser to get scored.
            </p>
          </div>
        )}

        {/* First-run guidance — mascot points to the low-friction first step
            (design-craft empty state: 1 benefit line + 1 pointer + 1 CTA). */}
        {phase === 'ready' && wordIndex === 0 && scoredCount === 0 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-center gap-2">
            <PitchBird mood={talking ? 'talking' : 'idle'} size={56} className="shrink-0" />
            <div className="relative bg-white ring-1 ring-gray-100 shadow-card rounded-2xl px-4 py-3 text-sm text-gray-600 max-w-xs">
              <span className="absolute -left-1 top-5 w-3 h-3 bg-white rotate-45" />
              Tap <b className="text-brand-600">Listen</b> to hear it 👂 — then record, and I'll score your pitch.
            </div>
          </motion.div>
        )}

        {/* Controls */}
        <div className="flex flex-col items-center gap-3">
          {/* Listen FIRST (no mic needed) — the low-friction entry that lets a new
              user "get it" before the mic-permission prompt. */}
          <Button
            onClick={playNative}
            variant="outline"
            size="lg"
            className="w-full sm:w-64"
          >
            <Volume2 className="w-5 h-5 mr-2" />
            Listen to a native
          </Button>

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
            <div className="w-full sm:w-auto space-y-3">
              <div className="flex gap-3">
                <Button onClick={resetAttempt} variant="outline" size="lg" className="flex-1">
                  <RotateCcw className="w-5 h-5 mr-2" />
                  Retry
                </Button>
                <Button onClick={nextWord} variant="primary" size="lg" className="flex-1">
                  Next
                  <ChevronRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
