import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Lock, Loader2, Stethoscope } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useSubscription } from '../../hooks/useSubscription';
import { getKarteData, getGuestKarteData, getGuestAttemptCount, type KarteData } from '../../lib/pitchAttempts';
import { PRACTICE_WORDS } from '../pitch/practiceWords';
import { trackEvent } from '../../lib/analytics';

interface KartePageProps {
  onBack: () => void;
  onViewChange: (view: string) => void;
}

const TOTAL_SECTIONS = 7;
const FREE_SECTIONS = 2;

// Plain-language one-liner per pattern for the diagnosis rows.
function patternDiagnosis(pattern: string, accuracy: number): string {
  const base: Record<string, string> = {
    平板: "you're dropping the pitch when it should stay high to the end",
    頭高: "you're missing the drop right after the first mora",
    中高: "your drop lands on the wrong mora mid-word",
    尾高: "you're dropping inside the word instead of on the particle",
  };
  return `${accuracy}% — ${base[pattern] ?? 'pitch shape needs work'}.`;
}

// Deterministic daily pick (no Math.random — stable per day).
function dailyIndex(len: number): number {
  const d = new Date();
  const day = d.getFullYear() * 1000 + d.getMonth() * 50 + d.getDate();
  return len > 0 ? day % len : 0;
}

const Blur: React.FC<{ locked: boolean; children: React.ReactNode }> = ({ locked, children }) => (
  <span className={locked ? 'blur-sm select-none pointer-events-none' : ''}>{children}</span>
);

export const KartePage: React.FC<KartePageProps> = ({ onBack, onViewChange }) => {
  const { user } = useAuthStore();
  const { isPremium } = useSubscription();
  const [karte, setKarte] = useState<KarteData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    trackEvent('karte_viewed');
    if (!user) {
      if (getGuestKarteData().patterns.length > 0) trackEvent('karte_save_gate_shown');
      setLoading(false);
      return;
    }
    getKarteData(user.id)
      .then(setKarte)
      .catch(() => setKarte(null))
      .finally(() => setLoading(false));
  }, [user]);

  const lockTap = (section: string) => {
    trackEvent('karte_section_lock_tapped', { section });
    onViewChange('pricing');
  };

  // ---- Guest: show the REAL diagnosis from local attempts + a save-gate.
  // This is the registration carrot — endowment/loss-aversion on a karte they
  // can see and feel they own, but lose when they close the tab. ----
  if (!user) {
    const g = getGuestKarteData();
    const n = getGuestAttemptCount();
    // Not enough to diagnose yet → nudge to keep scoring.
    if (g.patterns.length === 0) {
      return (
        <div className="max-w-2xl mx-auto p-4 sm:p-6 text-center">
          <Stethoscope className="w-10 h-10 text-indigo-500 mx-auto mb-3" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Your Pitch Karte</h1>
          <p className="text-gray-600 mb-1">{n > 0 ? `${n} recordings so far.` : 'No recordings yet.'}</p>
          <p className="text-sm text-gray-500 mb-5">Score a few words and your personal diagnosis appears here.</p>
          <button onClick={() => { window.location.href = '/app.html?guest=true'; }}
            className="bg-indigo-600 text-white font-bold px-6 py-3 rounded-xl hover:bg-indigo-500">
            🎯 Score some words
          </button>
        </div>
      );
    }
    const worst = g.patterns[0];
    return (
      <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-4">
        <h1 className="text-xl font-bold text-gray-900">Your Pitch Karte 📋</h1>
        <div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-500 text-white p-6 text-center">
          <p className="text-sm text-white/80 mb-1">Your Pitch Accent Score</p>
          <p className="text-5xl font-black">{g.headlineScore}<span className="text-2xl text-white/70">%</span></p>
          <p className="text-xs text-white/70 mt-2">native-like · from your {g.totalAttempts} recordings on this device</p>
        </div>
        <div className="rounded-2xl bg-white border border-red-100 p-5">
          <p className="text-xs text-gray-400 mb-1">Weakest pattern</p>
          <div className="flex items-center justify-between">
            <span className="font-bold text-gray-900">{worst.pattern}</span>
            <span className="text-sm font-bold text-red-600">{worst.accuracy}%</span>
          </div>
          <p className="text-sm text-gray-700 mt-1">{patternDiagnosis(worst.pattern, worst.accuracy)}</p>
        </div>
        {/* Save gate — loss aversion */}
        <div className="rounded-2xl border-2 border-dashed border-indigo-200 bg-indigo-50/60 p-5 text-center">
          <p className="font-bold text-gray-900">⚠️ Saved only on this device — gone when you close the tab.</p>
          <p className="text-sm text-gray-500 mt-1">Create a free account to keep your Karte, track progress, and unlock your full diagnosis.</p>
          <button
            onClick={() => { trackEvent('karte_save_gate_signup_click'); window.location.href = '/app.html?signup=true'; }}
            className="inline-block mt-3 bg-indigo-600 text-white text-sm font-bold px-6 py-3 rounded-full hover:bg-indigo-500"
          >
            Save my Karte — free →
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;
  }

  // ---- Empty state: not enough data to diagnose anything ----
  if (!karte || karte.patterns.length === 0) {
    const n = karte?.totalAttempts ?? 0;
    return (
      <div className="max-w-2xl mx-auto p-4 sm:p-6 text-center">
        <Stethoscope className="w-10 h-10 text-indigo-500 mx-auto mb-3" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Your Pitch Karte</h1>
        <p className="text-gray-600 mb-1">
          {n === 0 ? 'No recordings yet.' : `${n} recordings so far — keep going.`}
        </p>
        <p className="text-sm text-gray-500 mb-5">
          Score a few words in each pattern and your diagnosis will appear here
          (we never diagnose a pattern from fewer than 3 recordings).
        </p>
        <button
          onClick={() => onViewChange('pitch')}
          className="bg-indigo-600 text-white font-bold px-6 py-3 rounded-xl hover:bg-indigo-500"
        >
          🎯 Start the 2-minute check
        </button>
      </div>
    );
  }

  const worst = karte.patterns[0];
  const rest = karte.patterns.slice(1);
  const todaysWord = karte.wrongWords.length
    ? karte.wrongWords[dailyIndex(karte.wrongWords.length)]
    : null;
  const drillSuggestions = todaysWord
    ? PRACTICE_WORDS.filter((w) => w.pattern === (todaysWord.pattern ?? worst.pattern) && w.word !== todaysWord.word).slice(0, 3)
    : [];

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-gray-400 hover:text-gray-600"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="text-xl font-bold text-gray-900">Your Pitch Karte 📋</h1>
      </div>

      {/* 1. Headline score — always free */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-500 text-white p-6 text-center">
        <p className="text-sm text-white/80 mb-1">Your Pitch Accent Score</p>
        <p className="text-5xl font-black">{karte.headlineScore}<span className="text-2xl text-white/70">%</span></p>
        <p className="text-xs text-white/70 mt-2">native-like · based on your last {Math.min(karte.totalAttempts, 50)} recordings</p>
      </motion.div>

      {/* 2. Completeness meter */}
      <div className="rounded-xl bg-white border border-gray-100 p-3 text-center text-sm text-gray-600">
        You've unlocked <b>{isPremium ? TOTAL_SECTIONS : FREE_SECTIONS} of {TOTAL_SECTIONS}</b> sections of your Karte
        <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${((isPremium ? TOTAL_SECTIONS : FREE_SECTIONS) / TOTAL_SECTIONS) * 100}%` }} />
        </div>
      </div>

      {/* 3. Pattern breakdown — worst row free, rest blurred for free users */}
      <div className="rounded-2xl bg-white border border-gray-100 p-5">
        <h2 className="font-semibold text-gray-900 mb-3">Pattern diagnosis</h2>
        <div className="rounded-xl bg-red-50 border border-red-100 p-3 mb-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-gray-900">{worst.pattern}</span>
            <span className="text-sm font-bold text-red-600">{worst.accuracy}%</span>
          </div>
          <p className="text-sm text-gray-700 mt-1">{patternDiagnosis(worst.pattern, worst.accuracy)}</p>
          <p className="text-xs text-gray-400 mt-1">based on {worst.attempts} recordings · {worst.errors} errors</p>
        </div>
        {rest.map((p) => (
          <button key={p.pattern} onClick={() => !isPremium && lockTap('pattern')} className="w-full text-left">
            <div className="flex items-center justify-between rounded-xl border border-gray-100 p-3 mb-2 hover:border-indigo-200">
              <span className="font-bold text-gray-900">{p.pattern}</span>
              <span className="text-xs text-gray-400">{p.errors} errors detected</span>
              <span className="text-sm font-bold text-gray-700 flex items-center gap-1">
                {!isPremium && <Lock className="w-3 h-3 text-gray-400" />}
                <Blur locked={!isPremium}>{p.accuracy}%</Blur>
              </span>
            </div>
          </button>
        ))}
        {karte.insufficientPatterns.length > 0 && (
          <p className="text-xs text-gray-400 mt-1">
            {karte.insufficientPatterns.join('・')}: not enough recordings yet (need 3+ each)
          </p>
        )}
      </div>

      {/* 4. Today's Diagnosis — one full-quality card per day, free */}
      {todaysWord && (
        <div className="rounded-2xl bg-white border border-indigo-100 p-5">
          <h2 className="font-semibold text-gray-900 mb-2">🩺 Today's free diagnosis</h2>
          <p className="text-sm text-gray-700">
            <b>{todaysWord.word}</b>（{todaysWord.reading}）— {todaysWord.accuracy}% on your last try.
            {' '}{patternDiagnosis(todaysWord.pattern ?? worst.pattern, todaysWord.accuracy)}
          </p>
          {drillSuggestions.length > 0 && (
            <p className="text-sm text-gray-500 mt-2">
              Drill these next: {drillSuggestions.map((w) => w.word).join('・')}
            </p>
          )}
          <button onClick={() => onViewChange('pitch')} className="mt-3 text-sm font-bold text-indigo-600 hover:text-indigo-700">
            Drill it now →
          </button>
        </div>
      )}

      {/* 5. Error list — count free, rows blurred */}
      <div className="rounded-2xl bg-white border border-gray-100 p-5">
        <h2 className="font-semibold text-gray-900 mb-2">Words you're getting wrong ({karte.wrongWords.length})</h2>
        {karte.wrongWords.slice(0, 5).map((w, i) => (
          <button key={w.word} onClick={() => !isPremium && i > 0 && lockTap('errors')} className="w-full text-left">
            <div className="flex items-center justify-between border-b border-gray-50 py-2">
              <Blur locked={!isPremium && i > 0}><span className="font-medium">{w.word}（{w.reading}）</span></Blur>
              <Blur locked={!isPremium && i > 0}><span className="text-sm text-red-500 font-bold">{w.accuracy}%</span></Blur>
            </div>
          </button>
        ))}
      </div>

      {/* 6+7. Prescription + history — locked teasers for free users */}
      {!isPremium && (
        <button onClick={() => lockTap('prescription')} className="w-full">
          <div className="rounded-2xl border-2 border-dashed border-indigo-200 bg-indigo-50/50 p-5 text-center">
            <Lock className="w-5 h-5 text-indigo-400 mx-auto mb-1" />
            <p className="font-bold text-gray-900">Personal Drill Queue — {karte.wrongWords.length} words targeting YOUR weak patterns</p>
            <p className="text-sm text-gray-500 mt-1">+ progress history & before/after. The X-ray is free — the treatment plan is Premium.</p>
            <span className="inline-block mt-3 bg-indigo-600 text-white text-sm font-bold px-5 py-2.5 rounded-full">Unlock full Karte →</span>
          </div>
        </button>
      )}
      {isPremium && (
        <div className="rounded-2xl bg-white border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-900 mb-2">🎯 Your drill queue</h2>
          <p className="text-sm text-gray-600 mb-2">{karte.wrongWords.map((w) => w.word).join('・') || 'Nothing failing — go push your streak.'}</p>
          <button onClick={() => onViewChange('pitch')} className="text-sm font-bold text-indigo-600">Start drilling →</button>
        </div>
      )}
    </div>
  );
};
