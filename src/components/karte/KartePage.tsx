import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Lock, Loader2, Stethoscope } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useSubscription } from '../../hooks/useSubscription';
import { getKarteData, getGuestKarteData, getGuestAttemptCount, getEarAccuracy, type KarteData } from '../../lib/pitchAttempts';
import { startTrialIfEligible } from '../../lib/subscription';
import { pricingPlans, StripeService, ONBOARDING_COUPON_ID } from '../../lib/stripe';
import toast from 'react-hot-toast';
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

// When locked, render a MASK — never the real value — so paid karte numbers are
// not present in the DOM/JS for a free user (blur alone is one CSS toggle away
// from exposing the paywalled diagnosis). Blur kept purely for visual feel.
const Locked: React.FC<{ locked: boolean; mask: string; children: React.ReactNode }> = ({ locked, mask, children }) =>
  locked
    ? <span className="blur-sm select-none pointer-events-none">{mask}</span>
    : <>{children}</>;

// Ear vs Mouth — the emotional hook: you can often HEAR the drop before you can
// SAY it. Two bars + the gap insight. Only shows once both signals exist.
const EarMouthGap: React.FC<{ ear: number; mouth: number; onPlayEar?: () => void }> = ({ ear, mouth, onPlayEar }) => {
  const gap = ear - mouth;
  const insight = gap >= 15 ? 'Your ear is ahead of your mouth — you can hear the drop, now train your voice to make it.'
    : gap <= -15 ? 'Your mouth is ahead of your ear — sharpen your ear so you can self-correct.'
    : 'Ear and mouth are in sync — keep leveling both up.';
  return (
    <div className="rounded-2xl bg-white border border-gray-100 p-5">
      <h2 className="font-semibold text-gray-900 mb-3">👂 Ear vs 🎤 Mouth</h2>
      {[{ label: '👂 Your ear', v: ear, c: '#4f46e5' }, { label: '🎤 Your mouth', v: mouth, c: '#fb923c' }].map((r) => (
        <div key={r.label} className="mb-2">
          <div className="flex justify-between text-sm mb-1"><span className="text-gray-500">{r.label}</span><span className="font-bold" style={{ color: r.c }}>{r.v}%</span></div>
          <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${r.v}%`, backgroundColor: r.c }} /></div>
        </div>
      ))}
      <p className="text-xs text-gray-500 mt-3">{insight}</p>
      {onPlayEar && <button onClick={onPlayEar} className="mt-2 text-sm font-bold text-brand-600">Train your ear →</button>}
    </div>
  );
};

export const KartePage: React.FC<KartePageProps> = ({ onBack, onViewChange }) => {
  const { user } = useAuthStore();
  const { isPremium, isTrialing, trialEndsAt } = useSubscription();
  const [karte, setKarte] = useState<KarteData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    trackEvent('karte_viewed');
    if (!user) {
      if (getGuestAttemptCount() > 0) trackEvent('karte_save_gate_shown');
      setLoading(false);
      return;
    }
    // Reverse trial: a registered user's first Karte view starts their 14 days
    // of full access (fire-and-forget; no-op if already trialed/paid).
    void startTrialIfEligible(user.id).then((started) => { if (started) trackEvent('trial_started'); });
    getKarteData(user.id)
      .then(setKarte)
      .catch(() => setKarte(null))
      .finally(() => setLoading(false));
  }, [user]);

  const trialDaysLeft = trialEndsAt
    ? Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / 86400000))
    : 0;

  // Trial-end win-back: the 50% coupon (Moment 3) is spent HERE, on monthly.
  // Start a checkout with the coupon applied so $4.49 is real, not a teaser.
  const claimTrialOffer = async () => {
    const monthly = pricingPlans.find((p) => p.id === 'premium');
    trackEvent('karte_section_lock_tapped', { section: 'trial_ended' });
    if (!monthly?.stripePriceId || !user?.id || !ONBOARDING_COUPON_ID) {
      onViewChange('pricing');
      return;
    }
    try {
      await StripeService.createCheckoutSession(monthly.stripePriceId, user.id, ONBOARDING_COUPON_ID);
    } catch {
      toast.error('Something went wrong. Please try again.');
    }
  };

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
    // Only truly empty (no recordings at all) → nudge to start scoring.
    if (n === 0) {
      return (
        <div className="max-w-2xl mx-auto p-4 sm:p-6 text-center">
          <Stethoscope className="w-10 h-10 text-indigo-500 mx-auto mb-3" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Your Pitch Karte</h1>
          <p className="text-gray-600 mb-1">No recordings yet.</p>
          <p className="text-sm text-gray-500 mb-5">Score a few words and your personal diagnosis appears here.</p>
          <button onClick={() => { window.location.href = '/app.html?guest=true'; }}
            className="bg-indigo-600 text-white font-bold px-6 py-3 rounded-xl hover:bg-indigo-500">
            🎯 Score some words
          </button>
        </div>
      );
    }
    // >=1 recording → always show the headline score + save-gate (the carrot).
    // The per-pattern verdict only appears once a pattern has enough samples.
    const worst = g.patterns[0];
    return (
      <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-4">
        <h1 className="text-xl font-bold text-gray-900">Your Pitch Karte 📋</h1>
        <div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-500 text-white p-6 text-center">
          <p className="text-sm text-white/80 mb-1">Your Pitch Accent Score</p>
          <p className="text-5xl font-black">{g.headlineScore}<span className="text-2xl text-white/70">%</span></p>
          <p className="text-xs text-white/70 mt-2">native-like · from your {g.totalAttempts} recordings on this device</p>
        </div>
        {getEarAccuracy().total >= 4 && (
          <EarMouthGap ear={getEarAccuracy().pct} mouth={g.headlineScore} onPlayEar={() => { window.location.href = '/app.html?guest=true&view=ear'; }} />
        )}
        {worst ? (
          <div className="rounded-2xl bg-white border border-red-100 p-5">
            <p className="text-xs text-gray-400 mb-1">Weakest pattern</p>
            <div className="flex items-center justify-between">
              <span className="font-bold text-gray-900">{worst.pattern}</span>
              <span className="text-sm font-bold text-red-600">{worst.accuracy}%</span>
            </div>
            <p className="text-sm text-gray-700 mt-1">{patternDiagnosis(worst.pattern, worst.accuracy)}</p>
          </div>
        ) : (
          <div className="rounded-2xl bg-white border border-gray-100 p-5 text-center text-sm text-gray-500">
            Score a few more words to unlock your per-pattern breakdown (3+ recordings per pattern).
          </div>
        )}
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

      {/* Trial countdown — full access ticking down (loss aversion building) */}
      {isTrialing && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-center text-sm">
          <span className="font-bold text-amber-800">🔓 Full Karte unlocked — {trialDaysLeft} day{trialDaysLeft === 1 ? '' : 's'} left in your free trial.</span>
          <button onClick={() => onViewChange('pricing')} className="ml-2 font-bold text-indigo-600 hover:text-indigo-700">Keep it →</button>
        </div>
      )}
      {/* Trial ended (had a trial, no longer premium) — the loss moment */}
      {!isPremium && trialEndsAt && trialDaysLeft === 0 && (
        <button onClick={claimTrialOffer} className="w-full">
          <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-center">
            <p className="font-bold text-gray-900">Your free trial ended — your full diagnosis is locked.</p>
            <p className="text-sm text-gray-600 mt-1">Your {karte?.totalAttempts ?? 0} recordings and progress are safe. Keep your Karte for <b>$4.49/mo</b> (50% off).</p>
            <span className="inline-block mt-2 bg-indigo-600 text-white text-sm font-bold px-5 py-2 rounded-full">Reactivate →</span>
          </div>
        </button>
      )}

      {/* 1. Headline score — always free */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-500 text-white p-6 text-center">
        <p className="text-sm text-white/80 mb-1">Your Pitch Accent Score</p>
        <p className="text-5xl font-black">{karte.headlineScore}<span className="text-2xl text-white/70">%</span></p>
        <p className="text-xs text-white/70 mt-2">native-like · based on your last {Math.min(karte.totalAttempts, 50)} recordings</p>
      </motion.div>

      {/* Ear vs Mouth — the gap that only NihonGo can show (it owns both halves) */}
      {getEarAccuracy().total >= 4 && (
        <EarMouthGap ear={getEarAccuracy().pct} mouth={karte.headlineScore} onPlayEar={() => onViewChange('ear')} />
      )}

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
                <Locked locked={!isPremium} mask="••%">{p.accuracy}%</Locked>
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
              <Locked locked={!isPremium && i > 0} mask="••（••）"><span className="font-medium">{w.word}（{w.reading}）</span></Locked>
              <Locked locked={!isPremium && i > 0} mask="••%"><span className="text-sm text-red-500 font-bold">{w.accuracy}%</span></Locked>
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
