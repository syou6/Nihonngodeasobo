import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Volume2, VolumeX, RotateCcw, Mic } from 'lucide-react';
import { EAR_PAIRS, type MinimalPair, type PairSide } from './earPairs';
import { DROP_WORDS, type DropWord } from './dropWords';
import { playCorrect, playWrong, playClear, playBigWin, isMuted, setMutedFlag } from '../../lib/sfx';
import { logEarAnswer } from '../../lib/pitchAttempts';
import { trackEvent } from '../../lib/analytics';
import { PitchBird } from '../mascot/PitchBird';
import { shareEarResult } from '../../lib/earShareCard';
import { Share2 } from 'lucide-react';

// Ear Sprint — a 60s, no-mic, 2-choice minimal-pair perception game. Never says
// your voice is bad (your voice isn't involved); 50% luck floor; combo builds the
// 'one more' pull; every answer ends in 'here's the difference'. The free wedge.

interface Props {
  onBack: () => void;
  onGoTrainer?: () => void;
  onSignup?: () => void; // guest-only: capture them after a good run (save streak/best)
}

const ROUND_MS = 60_000;
const BEST_KEY = 'earSprintBest';

type Round =
  | { kind: 'pair'; pair: MinimalPair; played: PairSide; other: PairSide; leftIsPlayed: boolean }
  | { kind: 'drop'; word: DropWord };

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

function makeRound(prev?: Round): Round {
  // ~45% "where's the drop?" rounds, ~55% minimal-pair rounds — a much bigger
  // question pool than pairs alone.
  const wantDrop = Math.random() < 0.45 && DROP_WORDS.length > 0;
  if (wantDrop) {
    let w = pick(DROP_WORDS);
    if (prev?.kind === 'drop' && DROP_WORDS.length > 1) { while (w.word === prev.word.word) w = pick(DROP_WORDS); }
    return { kind: 'drop', word: w };
  }
  const pair = pick(EAR_PAIRS);
  const playA = Math.random() < 0.5;
  return { kind: 'pair', pair, played: playA ? pair.a : pair.b, other: playA ? pair.b : pair.a, leftIsPlayed: Math.random() < 0.5 };
}

function earRank(score: number): string {
  if (score >= 240) return 'Native ear 👂✨';
  if (score >= 160) return 'Sharp ear 👂';
  if (score >= 90) return 'Getting it 🎯';
  if (score >= 40) return 'Warming up 🔥';
  return 'Keep training 💪';
}

export const EarSprint: React.FC<Props> = ({ onBack, onGoTrainer, onSignup }) => {
  const [phase, setPhase] = useState<'intro' | 'play' | 'over'>('intro');
  const [round, setRound] = useState<Round | null>(null);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [timeLeft, setTimeLeft] = useState(ROUND_MS);
  const [verdict, setVerdict] = useState<'right' | 'wrong' | null>(null);
  const [muted, setMuted] = useState(isMuted());
  const [best, setBest] = useState(() => Number(localStorage.getItem(BEST_KEY)) || 0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const endAtRef = useRef(0);
  const lockRef = useRef(false);

  const mult = combo >= 15 ? 4 : combo >= 10 ? 3 : combo >= 5 ? 2 : 1;

  const playRound = useCallback((r: Round) => {
    if (isMuted()) return;
    const src = r.kind === 'pair' ? `/pair-audio/${r.played.audio}.mp3` : `/word-audio/${r.word.word}.mp3`;
    const a = new Audio(src);
    audioRef.current = a;
    a.play().catch(() => {});
  }, []);

  const replay = useCallback(() => { if (round) playRound(round); }, [round, playRound]);

  const nextRound = useCallback(() => {
    setRound((prev) => {
      const r = makeRound(prev ?? undefined);
      setVerdict(null);
      lockRef.current = false;
      // small delay so the card is on screen before the clip plays
      setTimeout(() => playRound(r), 250);
      return r;
    });
  }, [playRound]);

  const start = useCallback(() => {
    setScore(0); setCombo(0); setBestCombo(0); setTimeLeft(ROUND_MS);
    setPhase('play');
    endAtRef.current = Date.now() + ROUND_MS;
    trackEvent('ear_sprint_start');
    nextRound();
  }, [nextRound]);

  // timer
  useEffect(() => {
    if (phase !== 'play') return;
    const id = setInterval(() => {
      const left = endAtRef.current - Date.now();
      if (left <= 0) {
        clearInterval(id);
        setTimeLeft(0);
        setPhase('over');
        const prevBest = Number(localStorage.getItem(BEST_KEY)) || 0;
        const isNewBest = score > prevBest && score > 0;
        setBest((b) => {
          const nb = Math.max(b, score);
          localStorage.setItem(BEST_KEY, String(nb));
          return nb;
        });
        if (isNewBest) playBigWin(); else playClear(); // milestone gets the full flourish
        trackEvent('ear_sprint_end', { score, bestCombo });
      } else {
        setTimeLeft(left);
      }
    }, 100);
    return () => clearInterval(id);
  }, [phase, score, bestCombo]);

  const answer = (correct: boolean) => {
    if (!round || lockRef.current || phase !== 'play') return;
    lockRef.current = true;
    logEarAnswer(correct); // feeds the ear-vs-mouth gap in the Karte
    if (correct) {
      const gained = 10 * mult;
      setScore((s) => s + gained);
      setCombo((c) => { const n = c + 1; setBestCombo((b) => Math.max(b, n)); return n; });
      setVerdict('right');
      playCorrect(combo);
      setTimeout(nextRound, 650);
    } else {
      setCombo(0);
      setVerdict('wrong');
      playWrong();
      setTimeout(nextRound, 1500); // linger so they learn the difference
    }
  };

  const toggleMute = () => { const m = !muted; setMutedFlag(m); setMuted(m); };

  // ---- intro ----
  if (phase === 'intro') {
    return (
      <div className="max-w-md mx-auto p-4 sm:p-6 text-center">
        <div className="flex items-center gap-3 mb-8">
          <button onClick={onBack} className="text-gray-400 hover:text-gray-600"><ArrowLeft className="w-5 h-5" /></button>
          <h1 className="font-display text-xl font-extrabold text-ink">Ear Sprint</h1>
        </div>
        <div className="flex justify-center mb-2"><PitchBird mood="idle" size={132} /></div>
        <h2 className="font-display text-2xl font-extrabold text-ink mb-2">Can you hear the pitch?</h2>
        <p className="text-gray-500 mb-1">Same sounds, different pitch, different word.</p>
        <p className="text-gray-500 mb-8">60 seconds. How many can you catch?</p>
        <div className="rounded-2xl bg-white shadow-card ring-1 ring-gray-100 p-4 mb-8 text-sm text-gray-500">
          🌧 <b className="text-ink">あめ</b> rain &nbsp;vs&nbsp; 🍬 <b className="text-ink">あめ</b> candy<br />
          <span className="text-xs">your best: <b className="text-brand-600">{best}</b></span>
        </div>
        <button onClick={start} className="w-full bg-brand-gradient text-white font-display font-extrabold text-lg py-4 rounded-2xl shadow-soft hover:scale-[1.02] transition-transform">
          Start →
        </button>
        <p className="text-xs text-gray-300 mt-3">no mic · just listen</p>
      </div>
    );
  }

  // ---- over ----
  if (phase === 'over') {
    const isBest = score >= best && score > 0;
    return (
      <div className="max-w-md mx-auto p-4 sm:p-6 text-center">
        <motion.div initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 14 }}>
          <div className="flex justify-center mb-1"><PitchBird mood={score > 0 ? 'celebrate' : 'happy'} size={120} /></div>
          <h2 className="font-display text-2xl font-extrabold text-ink mb-1">{isBest ? 'New best!' : 'Time!'}</h2>
          <div className="font-display text-6xl font-black text-brand-600 my-3">{score}</div>
          <p className="text-gray-500 mb-1">{earRank(score)}</p>
          <p className="text-sm text-gray-400 mb-6">best combo ×{bestCombo} · all-time {best}</p>
        </motion.div>
        {onSignup && score > 0 && (
          <button
            onClick={() => { trackEvent('ear_signup_nudge_click', { score }); onSignup(); }}
            className="w-full bg-amber-50 ring-1 ring-amber-200 text-amber-900 font-bold py-3 rounded-2xl mb-3 text-sm hover:bg-amber-100 transition-colors"
          >
            🔒 Sign up free — save your best ({best}) & daily streak
          </button>
        )}
        {score > 0 && (
          <button
            onClick={async () => {
              trackEvent('ear_share_click', { score });
              await shareEarResult({ score, rank: earRank(score), bestCombo, best });
            }}
            className="w-full bg-white ring-1 ring-brand-200 text-brand-600 font-display font-extrabold py-3.5 rounded-2xl shadow-soft mb-3 hover:bg-brand-50 transition-colors"
          >
            <Share2 className="w-5 h-5 inline mr-2" />Share my score
          </button>
        )}
        <button onClick={start} className="w-full bg-brand-gradient text-white font-display font-extrabold py-3.5 rounded-2xl shadow-soft mb-3 hover:scale-[1.02] transition-transform">
          <RotateCcw className="w-5 h-5 inline mr-2" />Play again
        </button>
        {onGoTrainer && (
          <button onClick={onGoTrainer} className="w-full bg-white ring-1 ring-gray-200 text-brand-600 font-bold py-3.5 rounded-2xl hover:bg-gray-50">
            <Mic className="w-5 h-5 inline mr-2" />You can HEAR it — now SAY it →
          </button>
        )}
      </div>
    );
  }

  // ---- play ----
  const secs = Math.ceil(timeLeft / 1000);
  const show = verdict !== null;

  return (
    <div className="max-w-md mx-auto p-4 sm:p-6">
      {/* top bar */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={onBack} className="text-gray-400 hover:text-gray-600"><ArrowLeft className="w-5 h-5" /></button>
        <div className="flex items-center gap-3">
          <span className="font-display text-2xl font-black text-ink tabular-nums">{score}</span>
          {combo >= 2 && (
            <motion.span key={combo} initial={{ scale: 1.4 }} animate={{ scale: 1 }} className="text-sm font-bold text-accent-500">
              🔥{combo} {mult > 1 && <span className="text-brand-600">×{mult}</span>}
            </motion.span>
          )}
        </div>
        <button onClick={toggleMute} className="text-gray-300 hover:text-gray-500">{muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}</button>
      </div>

      {/* timer bar */}
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-4">
        <div className="h-full bg-brand-500 rounded-full transition-[width] duration-100 ease-linear" style={{ width: `${(timeLeft / ROUND_MS) * 100}%` }} />
      </div>

      {/* mascot reacts to the round */}
      <div className="flex justify-center mb-2">
        <PitchBird mood={verdict === 'right' ? 'happy' : verdict === 'wrong' ? 'sad' : 'thinking'} size={84} />
      </div>

      {round?.kind === 'drop'
        ? <DropQuestion round={round} show={show} verdict={verdict} secs={secs} onReplay={replay} onAnswer={answer} />
        : round?.kind === 'pair'
        ? <PairQuestion round={round} show={show} verdict={verdict} secs={secs} onReplay={replay} onAnswer={answer} />
        : null}
    </div>
  );
};

// ---- minimal-pair question (which word did you hear?) ----
const PairQuestion: React.FC<{
  round: Extract<Round, { kind: 'pair' }>;
  show: boolean; verdict: 'right' | 'wrong' | null; secs: number;
  onReplay: () => void; onAnswer: (correct: boolean) => void;
}> = ({ round, show, verdict, secs, onReplay, onAnswer }) => {
  const left = round.leftIsPlayed ? round.played : round.other;
  const right = round.leftIsPlayed ? round.other : round.played;
  return (
    <>
      <div className="text-center mb-2">
        <p className="text-sm text-gray-400 font-medium">Which did you hear? <span className="text-gray-300">({secs}s)</span></p>
        <button onClick={onReplay} className="mt-2 inline-flex items-center gap-2 text-brand-600 font-bold">
          <Volume2 className="w-5 h-5" /> play again
        </button>
        <div className="font-display text-5xl font-black text-ink mt-3">{round.pair.reading}</div>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-6">
        {[left, right].map((side, i) => {
          const isPlayed = side === round.played;
          const cls = !show ? 'bg-white ring-gray-200 hover:ring-brand-300'
            : isPlayed ? 'bg-green-50 ring-green-400'
            : 'bg-gray-50 ring-gray-200 opacity-60';
          return (
            <button
              key={i}
              disabled={show}
              data-played={isPlayed ? '1' : '0'}
              onClick={() => onAnswer(isPlayed)}
              className={`rounded-2xl ring-2 p-5 text-center transition-all ${cls}`}
            >
              <div className="font-display text-4xl font-black text-ink">{side.word}</div>
              <div className="text-sm text-gray-500 mt-1">{side.en}</div>
              {show && <div className="text-xs font-mono font-bold mt-1.5" style={{ color: isPlayed ? '#16a34a' : '#9ca3af' }}>{side.pattern}</div>}
            </button>
          );
        })}
      </div>

      <AnimatePresence>
        {verdict && (
          <motion.div
            initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }}
            className={`mt-5 rounded-xl p-3 text-center text-sm font-semibold ${verdict === 'right' ? 'bg-green-50 text-green-700' : 'bg-rose-50 text-rose-700'}`}
          >
            {verdict === 'right'
              ? `Yes — ${round.played.word} (${round.played.pattern}) ✓`
              : `It was ${round.played.word} ${round.played.en} — ${round.played.pattern}, not ${round.other.pattern}`}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

// High/Low per mora given the nucleus (drop-after index; 0 = heiban/no drop).
function dropPattern(morae: string[], dropAfter: number): ('H' | 'L')[] {
  if (dropAfter === 1) return morae.map((_, i) => (i === 0 ? 'H' : 'L'));
  return morae.map((_, i) => {
    if (i === 0) return 'L';
    if (dropAfter === 0) return 'H';
    return i < dropAfter ? 'H' : 'L';
  });
}

// ---- "where's the drop?" question (tap the mora the pitch drops after) ----
const DropQuestion: React.FC<{
  round: Extract<Round, { kind: 'drop' }>;
  show: boolean; verdict: 'right' | 'wrong' | null; secs: number;
  onReplay: () => void; onAnswer: (correct: boolean) => void;
}> = ({ round, show, verdict, secs, onReplay, onAnswer }) => {
  const { word, morae, en, dropAfter, reading } = round.word;
  const pat = dropPattern(morae, dropAfter);
  // options: drop-after-each-mora (1..n) + "no drop" (0)
  const opts: { label: string; value: number }[] = [
    ...morae.map((m, i) => ({ label: `${m} ↘`, value: i + 1 })),
    { label: 'stays high →', value: 0 },
  ];
  return (
    <>
      <div className="text-center mb-2">
        <p className="text-sm text-gray-400 font-medium">Where does the pitch drop? <span className="text-gray-300">({secs}s)</span></p>
        <button onClick={onReplay} className="mt-2 inline-flex items-center gap-2 text-brand-600 font-bold">
          <Volume2 className="w-5 h-5" /> play again
        </button>
        <div className="font-display text-5xl font-black text-ink mt-3">{word}</div>
        <div className="text-sm text-gray-400 mt-1">{reading} · {en}</div>
      </div>

      {/* reveal the contour once answered */}
      {show && (
        <div className="flex justify-center gap-1 mt-4">
          {morae.map((m, i) => (
            <span key={i} className={`font-display text-2xl font-black px-2.5 py-1 rounded-lg ${pat[i] === 'H' ? 'bg-green-100 text-green-700 -translate-y-1' : 'bg-gray-100 text-gray-400'} transition-transform`}>{m}</span>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 mt-6">
        {opts.map((o, i) => {
          const isCorrect = o.value === dropAfter;
          const cls = !show ? 'bg-white ring-gray-200 hover:ring-brand-300'
            : isCorrect ? 'bg-green-50 ring-green-400'
            : 'bg-gray-50 ring-gray-200 opacity-60';
          return (
            <button
              key={i}
              disabled={show}
              data-correct={isCorrect ? '1' : '0'}
              onClick={() => onAnswer(isCorrect)}
              className={`rounded-2xl ring-2 p-4 text-center font-display text-2xl font-black text-ink transition-all ${cls}`}
            >
              {o.label}
            </button>
          );
        })}
      </div>

      <AnimatePresence>
        {verdict && (
          <motion.div
            initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }}
            className={`mt-5 rounded-xl p-3 text-center text-sm font-semibold ${verdict === 'right' ? 'bg-green-50 text-green-700' : 'bg-rose-50 text-rose-700'}`}
          >
            {verdict === 'right'
              ? `Yes — ${word} ${pat.join('')} ✓`
              : dropAfter === 0
              ? `It stays high — ${word} is ${pat.join('')} (no drop)`
              : `It drops after ${morae[dropAfter - 1]} — ${word} is ${pat.join('')}`}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
