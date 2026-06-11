import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../ui/Button';
import { LogoWithText } from '../ui/Logo';
import {
  Mic,
  Brain,
  TrendingUp,
  ChevronRight,
  BookOpen,
  Sparkles,
  Target,
  Clock,
  Users,
  Star,
  Zap,
  CheckCircle,
  AlertTriangle,
  Award,
  Heart,
  Globe,
  Briefcase,
  Gamepad2,
  Plane,
  GraduationCap,
  Volume2,
  PenTool,
  AudioLines,
  Headphones,
  MessageCircle,
  Timer,
  Crown,
  Shield,
  Lock,
  ArrowRight,
  BarChart3,
} from 'lucide-react';
import { pricingPlans, ONBOARDING_COUPON_ID } from '../../lib/stripe';
import StripeService from '../../lib/stripe';
import { useAuthStore } from '../../stores/authStore';

// ─── Types ───────────────────────────────────────────────────────────────────

interface OnboardingFlowProps {
  onComplete: (data: OnboardingData) => void;
  show?: boolean;
}

interface OnboardingData {
  name: string;
  jlptLevel: string;
  motivation: string[];
  studyDuration: string;
  struggles: string[];
  dailyTime: string;
  learningStyle: string[];
  targetLevel: string;
  timeline: string;
}

type StepType =
  | 'welcome'
  | 'name'
  | 'motivation'
  | 'jlpt-level'
  | 'study-duration'
  | 'struggles'
  | 'daily-time'
  | 'learning-style'
  | 'diagnosis'
  | 'pain-point'
  | 'stats-fear'
  | 'target-level'
  | 'timeline'
  | 'commitment'
  | 'building-plan'
  | 'your-plan'
  | 'paywall';

// Pitch-focused 2-minute flow. The old JLPT/exam steps (jlpt-level, target-level,
// study-duration, learning-style, stats-fear, timeline, commitment) are retired —
// they don't serve a pitch-accent trainer and made the flow long. The proven
// quiz→diagnosis→paywall shape is kept. State for the cut steps keeps its
// defaults, so onComplete + the diagnosis/plan/paywall renders still work.
const STEPS: StepType[] = [
  'welcome',
  'name',
  'motivation',
  'struggles',
  'daily-time',
  'diagnosis',
  'pain-point',
  'building-plan',
  'your-plan',
  'paywall',
];

// ─── Option Data ─────────────────────────────────────────────────────────────

const MOTIVATIONS = [
  { id: 'anime', label: 'Anime & Manga', icon: Gamepad2 },
  { id: 'travel', label: 'Travel to Japan', icon: Plane },
  { id: 'work', label: 'Career & Business', icon: Briefcase },
  { id: 'partner', label: 'Partner / Family', icon: Heart },
  { id: 'culture', label: 'Japanese Culture', icon: Globe },
  { id: 'jlpt', label: 'Pass JLPT Exam', icon: GraduationCap },
];

const JLPT_LEVELS = [
  { id: 'N5', label: 'N5 - Beginner', desc: 'Basic greetings & simple phrases', example: 'わたしは がくせい です', num: 1 },
  { id: 'N4', label: 'N4 - Elementary', desc: 'Simple everyday conversations', example: 'きのう ともだちと えいがを みました', num: 2 },
  { id: 'N3', label: 'N3 - Intermediate', desc: 'Everyday Japanese', example: '来週の会議について相談したいんですが', num: 3 },
  { id: 'N2', label: 'N2 - Advanced', desc: 'Read newspapers & discussions', example: '経済状況を踏まえた上で検討する必要がある', num: 4 },
  { id: 'N1', label: 'N1 - Proficient', desc: 'Complex Japanese', example: '彼の主張は一見もっともらしいが、根拠に乏しい', num: 5 },
];

const STUDY_DURATIONS = [
  { id: 'beginner', label: 'Just getting started', desc: 'Less than 1 month', weight: 1 },
  { id: 'few-months', label: 'A few months', desc: '1-6 months', weight: 2 },
  { id: 'half-year', label: 'About a year', desc: '6-12 months', weight: 3 },
  { id: 'years', label: '1-3 years', desc: 'Intermediate learner', weight: 4 },
  { id: 'veteran', label: '3+ years', desc: 'Advanced learner', weight: 5 },
];

const STRUGGLES = [
  { id: 'pitch', label: 'Sounding foreign (pitch accent)', icon: AudioLines },
  { id: 'speaking', label: 'Speaking confidence', icon: Mic },
  { id: 'listening', label: 'Listening comprehension', icon: Headphones },
  { id: 'grammar', label: 'Grammar patterns', icon: PenTool },
  { id: 'vocabulary', label: 'Vocabulary retention', icon: BookOpen },
  { id: 'motivation', label: 'Staying motivated', icon: Zap },
];

const DAILY_TIMES = [
  { id: '5', label: '5 minutes', desc: 'Quick daily check-in' },
  { id: '10', label: '10 minutes', desc: 'Focused micro-session' },
  { id: '15', label: '15 minutes', desc: 'Solid daily practice' },
  { id: '30', label: '30+ minutes', desc: 'Deep learning session' },
];

const LEARNING_STYLES = [
  { id: 'speaking', label: 'Speaking out loud', icon: Volume2, desc: 'Learn by talking' },
  { id: 'listening', label: 'Listening practice', icon: Headphones, desc: 'Learn by hearing' },
  { id: 'reading', label: 'Reading & writing', icon: PenTool, desc: 'Learn by studying' },
  { id: 'conversation', label: 'Real conversations', icon: MessageCircle, desc: 'Learn by doing' },
];

const TIMELINES = [
  { id: '3months', label: '3 months', desc: 'Intensive fast track' },
  { id: '6months', label: '6 months', desc: 'Steady progress' },
  { id: '1year', label: '1 year', desc: 'Comfortable pace' },
  { id: 'flexible', label: 'No rush', desc: 'Enjoy the journey' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function calculateDiagnosisScore(
  struggles: string[],
  studyDuration: string,
  dailyTime: string,
): { score: number; risk: 'low' | 'medium' | 'high' | 'critical'; label: string } {
  // Base: more struggles = higher risk
  let score = struggles.length * 15;

  // Long study but low level = plateau risk
  const durationWeight = STUDY_DURATIONS.find((d) => d.id === studyDuration)?.weight || 2;
  if (durationWeight >= 3) score += 10;
  if (durationWeight >= 4) score += 10;

  // Low daily time = progress risk
  if (dailyTime === '5') score += 10;

  // Pitch accent = the highest-risk gap for this app (the brand promise)
  if (struggles.includes('pitch')) score += 15;
  if (struggles.includes('speaking')) score += 10;
  if (struggles.includes('motivation')) score += 5;

  score = Math.min(score, 100);

  if (score >= 70) return { score, risk: 'critical', label: 'High plateau risk' };
  if (score >= 50) return { score, risk: 'high', label: 'Significant gaps detected' };
  if (score >= 30) return { score, risk: 'medium', label: 'Room for improvement' };
  return { score, risk: 'low', label: 'Good foundation' };
}

function getPainMessage(struggles: string[]): { title: string; message: string } {
  if (struggles.includes('pitch')) {
    return {
      title: 'Pitch accent is the #1 thing that gives you away',
      message:
        'You can have perfect grammar and still sound foreign — because Japanese is a pitch-accent language and your ear can\'t catch your own pitch errors. Natives rarely correct you, so the mistakes fossilize. Without seeing your pitch, you can\'t fix it.',
    };
  }
  if (struggles.includes('speaking')) {
    return {
      title: 'Speaking anxiety is the #1 reason learners quit',
      message:
        'Without regular speaking practice, your Japanese stays "textbook Japanese" — you can read it, but freeze in real conversations. The gap between what you know and what you can say keeps growing.',
    };
  }
  if (struggles.includes('motivation')) {
    return {
      title: 'Motivation fades without visible progress',
      message:
        "Studies show that 73% of language learners abandon their studies within 6 months. The main reason? They can't see their improvement day to day.",
    };
  }
  if (struggles.includes('grammar')) {
    return {
      title: 'Grammar mistakes fossilize without feedback',
      message:
        'When you practice alone, wrong patterns become habits. After 6 months, these fossilized errors become 3x harder to fix. You need immediate, specific corrections.',
    };
  }
  return {
    title: 'Most learners hit a plateau and give up',
    message:
      'After the initial excitement fades, progress feels invisible. Without a structured daily practice and clear feedback, learners lose direction and motivation.',
  };
}

function getLevelNumber(id: string): number {
  return JLPT_LEVELS.find((l) => l.id === id)?.num || 2;
}

// ─── Reusable Sub-Components ─────────────────────────────────────────────────

const ProgressBar: React.FC<{ current: number; total: number }> = ({ current, total }) => {
  const pct = Math.round(((current + 1) / total) * 100);
  return (
    <div className="px-6 pt-4">
      <div className="flex items-center justify-between mb-1">
        <div className="h-1.5 flex-1 bg-gray-200 rounded-full overflow-hidden mr-3">
          <motion.div
            className="h-full bg-brand-500 rounded-full"
            initial={false}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
        <span className="text-xs text-gray-400 font-medium tabular-nums w-8 text-right">{pct}%</span>
      </div>
    </div>
  );
};

const OptionCard: React.FC<{
  selected: boolean;
  onClick: () => void;
  icon?: React.ElementType;
  label: string;
  desc?: string;
  example?: string;
}> = ({ selected, onClick, icon: Icon, label, desc, example }) => (
  <button
    onClick={onClick}
    className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all ${
      selected
        ? 'border-brand-500 bg-brand-50 shadow-sm'
        : 'border-gray-200 hover:border-gray-300 bg-white'
    }`}
  >
    <div className="flex items-center gap-3">
      {Icon && (
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
            selected ? 'bg-brand-100' : 'bg-gray-100'
          }`}
        >
          <Icon className={`w-5 h-5 ${selected ? 'text-brand-600' : 'text-gray-500'}`} />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <span className={`font-semibold text-sm ${selected ? 'text-brand-700' : 'text-gray-900'}`}>
          {label}
        </span>
        {desc && <p className="text-xs text-gray-500 mt-0.5">{desc}</p>}
        {example && <p className="text-xs text-gray-400 mt-0.5 font-mono truncate">{example}</p>}
      </div>
      {selected && (
        <div className="w-5 h-5 bg-brand-500 rounded-full flex items-center justify-center flex-shrink-0">
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}
    </div>
  </button>
);

const MultiSelectCard: React.FC<{
  selected: boolean;
  onClick: () => void;
  icon?: React.ElementType;
  label: string;
  desc?: string;
}> = ({ selected, onClick, icon: Icon, label, desc }) => (
  <button
    onClick={onClick}
    className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all ${
      selected
        ? 'border-brand-500 bg-brand-50 shadow-sm'
        : 'border-gray-200 hover:border-gray-300 bg-white'
    }`}
  >
    <div className="flex items-center gap-3">
      {Icon && (
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${selected ? 'bg-brand-100' : 'bg-gray-100'}`}>
          <Icon className={`w-5 h-5 ${selected ? 'text-brand-600' : 'text-gray-500'}`} />
        </div>
      )}
      <div className="flex-1">
        <span className={`font-semibold text-sm ${selected ? 'text-brand-700' : 'text-gray-900'}`}>
          {label}
        </span>
        {desc && <p className="text-xs text-gray-500">{desc}</p>}
      </div>
      <div
        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
          selected ? 'bg-brand-500 border-brand-500' : 'border-gray-300'
        }`}
      >
        {selected && (
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
    </div>
  </button>
);

const StepHeading: React.FC<{ title: string; subtitle?: string }> = ({ title, subtitle }) => (
  <div className="text-center mb-6">
    <h2 className="text-2xl font-bold text-gray-900 mb-2">{title}</h2>
    {subtitle && <p className="text-gray-500 text-sm">{subtitle}</p>}
  </div>
);

const IconBadge: React.FC<{ icon: React.ElementType; bg: string; color: string }> = ({
  icon: Icon,
  bg,
  color,
}) => (
  <div className={`w-16 h-16 ${bg} rounded-2xl flex items-center justify-center mx-auto mb-6`}>
    <Icon className={`w-8 h-8 ${color}`} />
  </div>
);

/** Fade-in text line by line for storytelling effect */
const FadeInLines: React.FC<{ lines: string[]; delayMs?: number }> = ({ lines, delayMs = 600 }) => {
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    if (visibleCount < lines.length) {
      const timer = setTimeout(() => setVisibleCount(visibleCount + 1), delayMs);
      return () => clearTimeout(timer);
    }
  }, [visibleCount, lines.length, delayMs]);

  return (
    <div className="space-y-3">
      {lines.map((line, i) =>
        i < visibleCount ? (
          <motion.p
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-sm text-gray-700 leading-relaxed"
          >
            {line}
          </motion.p>
        ) : null,
      )}
    </div>
  );
};

/** Countdown timer for paywall urgency */
const CountdownTimer: React.FC<{ minutes: number }> = ({ minutes }) => {
  const [secondsLeft, setSecondsLeft] = useState(minutes * 60);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, [secondsLeft]);

  const m = Math.floor(secondsLeft / 60);
  const s = secondsLeft % 60;

  return (
    <div className="flex items-center justify-center gap-2 text-sm">
      <Timer className="w-4 h-4 text-red-500" />
      <span className="font-mono font-bold text-red-600 tabular-nums">
        {m}:{s.toString().padStart(2, '0')}
      </span>
      <span className="text-gray-500">left at this price</span>
    </div>
  );
};

/** Animated score ring */
const ScoreRing: React.FC<{ score: number; risk: string; label: string }> = ({ score, risk, label }) => {
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  const riskColors: Record<string, string> = {
    low: '#10b981',
    medium: '#f59e0b',
    high: '#f97316',
    critical: '#ef4444',
  };
  const color = riskColors[risk] || riskColors.medium;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-32 h-32">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="45" fill="none" stroke="#e5e7eb" strokeWidth="6" />
          <motion.circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            className="text-3xl font-black"
            style={{ color }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            {score}
          </motion.span>
          <span className="text-xs text-gray-500">/ 100</span>
        </div>
      </div>
      <p className="text-sm font-semibold mt-3" style={{ color }}>
        {label}
      </p>
    </div>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ onComplete, show = true }) => {
  const [stepIndex, setStepIndex] = useState(0);
  const { user } = useAuthStore();
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Collected data
  const [userName, setUserName] = useState('');
  const [motivation, setMotivation] = useState<string[]>([]);
  const [jlptLevel, setJlptLevel] = useState<string | null>(null);
  const [studyDuration, setStudyDuration] = useState<string | null>(null);
  const [struggles, setStruggles] = useState<string[]>([]);
  const [dailyTime, setDailyTime] = useState<string | null>(null);
  const [learningStyle, setLearningStyle] = useState<string[]>([]);
  const [targetLevel, setTargetLevel] = useState<string | null>(null);
  const [timeline, setTimeline] = useState<string | null>(null);
  const [planReady, setPlanReady] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const currentStep = STEPS[stepIndex];

  const toggleMultiSelect = useCallback(
    (list: string[], setList: React.Dispatch<React.SetStateAction<string[]>>, id: string) => {
      setList(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
    },
    [],
  );

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 'name':
        return userName.trim().length >= 1;
      case 'motivation':
        return motivation.length > 0;
      case 'jlpt-level':
        return jlptLevel !== null;
      case 'study-duration':
        return studyDuration !== null;
      case 'struggles':
        return struggles.length > 0;
      case 'daily-time':
        return dailyTime !== null;
      case 'learning-style':
        return learningStyle.length > 0;
      case 'target-level':
        return targetLevel !== null;
      case 'timeline':
        return timeline !== null;
      case 'building-plan':
        return planReady;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (stepIndex < STEPS.length - 1) {
      setStepIndex(stepIndex + 1);
    }
  };

  const handleFinish = () => {
    const data: OnboardingData = {
      name: userName.trim() || 'Learner',
      jlptLevel: jlptLevel || 'N4',
      motivation,
      studyDuration: studyDuration || 'beginner',
      struggles,
      dailyTime: dailyTime || '10',
      learningStyle,
      targetLevel: targetLevel || jlptLevel || 'N3',
      timeline: timeline || '6months',
    };
    localStorage.setItem('onboardingData', JSON.stringify(data));
    localStorage.setItem('onboardingCompleted', 'true');
    onComplete(data);
  };

  const handleCheckout = async () => {
    const premiumPlan = pricingPlans.find((p) => p.id === 'premium');
    if (!premiumPlan?.stripePriceId || !user?.id) {
      handleFinish();
      return;
    }
    setCheckoutLoading(true);
    try {
      // Save to localStorage ONLY (no React state change) so the component stays mounted for redirect
      localStorage.setItem('onboardingCompleted', 'true');
      localStorage.setItem('onboardingData', JSON.stringify({
        name: userName || '', jlptLevel: jlptLevel || 'N4',
        motivation, studyDuration: studyDuration || '', struggles,
        dailyTime: dailyTime || '', learningStyle,
        targetLevel: targetLevel || jlptLevel || 'N3', timeline: timeline || '6months',
      }));
      await StripeService.createCheckoutSession(
        premiumPlan.stripePriceId,
        user.id,
        ONBOARDING_COUPON_ID || undefined
      );
    } catch {
      // Checkout failed — complete onboarding normally and go to dashboard
      handleFinish();
    }
  };

  // Auto-focus name input
  useEffect(() => {
    if (currentStep === 'name') {
      setTimeout(() => nameInputRef.current?.focus(), 400);
    }
  }, [currentStep]);

  // Building plan auto-advance
  useEffect(() => {
    if (currentStep === 'building-plan') {
      setPlanReady(false);
      const timer = setTimeout(() => {
        setPlanReady(true);
        setTimeout(() => handleNext(), 600);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [currentStep]);

  if (!show) return null;

  const slideVariants = {
    enter: { opacity: 0, x: 60 },
    center: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -60 },
  };

  const displayName = userName.trim() || 'there';
  const diagnosis = calculateDiagnosisScore(struggles, studyDuration || 'beginner', dailyTime || '10');

  // ─── Render Steps ────────────────────────────────────────────────────────

  const renderStep = () => {
    switch (currentStep) {
      // ── WELCOME ──────────────────────────────────────────────────────────
      case 'welcome':
        return (
          <div className="text-center">
            <LogoWithText size="lg" className="mb-6" />
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Let's build your personal<br />Japanese learning path
            </h2>
            <p className="text-gray-500 text-sm mb-8">
              Answer a few quick questions so we can<br />
              customize your experience
            </p>
            <div className="flex items-center justify-center gap-2 text-xs text-gray-400 mb-8">
              <Clock className="w-4 h-4" />
              <span>Takes about 2 minutes</span>
            </div>
            <Button variant="primary" size="lg" onClick={handleNext} className="w-full">
              Let's Go
              <ChevronRight className="w-5 h-5 ml-1" />
            </Button>
          </div>
        );

      // ── NAME ─────────────────────────────────────────────────────────────
      case 'name':
        return (
          <>
            <IconBadge icon={Users} bg="bg-blue-50" color="text-blue-500" />
            <StepHeading
              title="What should we call you?"
              subtitle="We'll personalize your experience"
            />
            <div className="mb-6">
              <input
                ref={nameInputRef}
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && canProceed()) handleNext();
                }}
                placeholder="Your first name"
                className="w-full px-4 py-3 text-lg border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all text-center"
                maxLength={30}
                autoComplete="given-name"
              />
            </div>
            <Button
              variant="primary"
              size="lg"
              onClick={handleNext}
              className="w-full"
              disabled={!canProceed()}
            >
              Next
              <ChevronRight className="w-5 h-5 ml-1" />
            </Button>
          </>
        );

      // ── MOTIVATION ───────────────────────────────────────────────────────
      case 'motivation':
        return (
          <>
            <IconBadge icon={Heart} bg="bg-pink-50" color="text-pink-500" />
            <StepHeading
              title={`Nice to meet you, ${displayName}!`}
              subtitle="Why do you want to learn Japanese? (Select all)"
            />
            <div className="space-y-2 mb-6">
              {MOTIVATIONS.map((m) => (
                <MultiSelectCard
                  key={m.id}
                  selected={motivation.includes(m.id)}
                  onClick={() => toggleMultiSelect(motivation, setMotivation, m.id)}
                  icon={m.icon}
                  label={m.label}
                />
              ))}
            </div>
            <Button
              variant="primary"
              size="lg"
              onClick={handleNext}
              className="w-full"
              disabled={!canProceed()}
            >
              Next
              <ChevronRight className="w-5 h-5 ml-1" />
            </Button>
          </>
        );

      // ── JLPT LEVEL ──────────────────────────────────────────────────────
      case 'jlpt-level':
        return (
          <>
            <IconBadge icon={BookOpen} bg="bg-brand-50" color="text-brand-600" />
            <StepHeading
              title="What's your current level?"
              subtitle="Don't worry — you can change this anytime"
            />
            <div className="space-y-2 mb-6">
              {JLPT_LEVELS.map((level) => (
                <OptionCard
                  key={level.id}
                  selected={jlptLevel === level.id}
                  onClick={() => setJlptLevel(level.id)}
                  label={level.label}
                  desc={level.desc}
                  example={level.example}
                />
              ))}
            </div>
            <Button
              variant="primary"
              size="lg"
              onClick={handleNext}
              className="w-full"
              disabled={!canProceed()}
            >
              Next
              <ChevronRight className="w-5 h-5 ml-1" />
            </Button>
          </>
        );

      // ── STUDY DURATION ───────────────────────────────────────────────────
      case 'study-duration':
        return (
          <>
            <IconBadge icon={Timer} bg="bg-blue-50" color="text-blue-500" />
            <StepHeading title="How long have you been studying?" />
            <div className="space-y-2 mb-6">
              {STUDY_DURATIONS.map((d) => (
                <OptionCard
                  key={d.id}
                  selected={studyDuration === d.id}
                  onClick={() => setStudyDuration(d.id)}
                  label={d.label}
                  desc={d.desc}
                />
              ))}
            </div>
            <Button
              variant="primary"
              size="lg"
              onClick={handleNext}
              className="w-full"
              disabled={!canProceed()}
            >
              Next
              <ChevronRight className="w-5 h-5 ml-1" />
            </Button>
          </>
        );

      // ── STRUGGLES ────────────────────────────────────────────────────────
      case 'struggles':
        return (
          <>
            <IconBadge icon={AlertTriangle} bg="bg-amber-50" color="text-amber-500" />
            <StepHeading
              title="What do you struggle with most?"
              subtitle="Select all that apply"
            />
            <div className="space-y-2 mb-6">
              {STRUGGLES.map((s) => (
                <MultiSelectCard
                  key={s.id}
                  selected={struggles.includes(s.id)}
                  onClick={() => toggleMultiSelect(struggles, setStruggles, s.id)}
                  icon={s.icon}
                  label={s.label}
                />
              ))}
            </div>
            <Button
              variant="primary"
              size="lg"
              onClick={handleNext}
              className="w-full"
              disabled={!canProceed()}
            >
              Next
              <ChevronRight className="w-5 h-5 ml-1" />
            </Button>
          </>
        );

      // ── DAILY TIME ───────────────────────────────────────────────────────
      case 'daily-time':
        return (
          <>
            <IconBadge icon={Clock} bg="bg-green-50" color="text-green-500" />
            <StepHeading title="How much time can you practice daily?" />
            <div className="space-y-2 mb-6">
              {DAILY_TIMES.map((t) => (
                <OptionCard
                  key={t.id}
                  selected={dailyTime === t.id}
                  onClick={() => setDailyTime(t.id)}
                  label={t.label}
                  desc={t.desc}
                />
              ))}
            </div>
            <p className="text-center text-xs text-gray-400 mb-4">
              Even 5 minutes daily is more effective than 1 hour once a week.
            </p>
            <Button
              variant="primary"
              size="lg"
              onClick={handleNext}
              className="w-full"
              disabled={!canProceed()}
            >
              Next
              <ChevronRight className="w-5 h-5 ml-1" />
            </Button>
          </>
        );

      // ── LEARNING STYLE ───────────────────────────────────────────────────
      case 'learning-style':
        return (
          <>
            <IconBadge icon={Brain} bg="bg-purple-50" color="text-purple-500" />
            <StepHeading title="How do you learn best?" subtitle="Select all that apply" />
            <div className="space-y-2 mb-6">
              {LEARNING_STYLES.map((s) => (
                <MultiSelectCard
                  key={s.id}
                  selected={learningStyle.includes(s.id)}
                  onClick={() => toggleMultiSelect(learningStyle, setLearningStyle, s.id)}
                  icon={s.icon}
                  label={s.label}
                  desc={s.desc}
                />
              ))}
            </div>
            <Button
              variant="primary"
              size="lg"
              onClick={handleNext}
              className="w-full"
              disabled={!canProceed()}
            >
              Next
              <ChevronRight className="w-5 h-5 ml-1" />
            </Button>
          </>
        );

      // ── DIAGNOSIS (personalized score) ───────────────────────────────────
      case 'diagnosis':
        return (
          <>
            <div className="text-center mb-4">
              <h2 className="text-2xl font-bold text-gray-900 mb-1">
                {displayName}'s Learning Profile
              </h2>
              <p className="text-gray-500 text-sm">Based on your answers</p>
            </div>
            <div className="flex justify-center mb-6">
              <ScoreRing score={diagnosis.score} risk={diagnosis.risk} label={diagnosis.label} />
            </div>
            <div className="space-y-2 mb-6">
              {struggles.map((s) => {
                const struggle = STRUGGLES.find((x) => x.id === s);
                return struggle ? (
                  <div key={s} className="flex items-center gap-3 bg-red-50 rounded-lg px-4 py-2.5">
                    <struggle.icon className="w-4 h-4 text-red-500 flex-shrink-0" />
                    <span className="text-sm text-red-700">{struggle.label}</span>
                    <span className="ml-auto text-xs text-red-400">needs work</span>
                  </div>
                ) : null;
              })}
            </div>
            <p className="text-center text-xs text-gray-400 mb-4">
              But don't worry — we have a plan for you.
            </p>
            <Button variant="primary" size="lg" onClick={handleNext} className="w-full">
              Show me what to do
              <ChevronRight className="w-5 h-5 ml-1" />
            </Button>
          </>
        );

      // ── PAIN POINT (storytelling fade-in) ────────────────────────────────
      case 'pain-point': {
        const pain = getPainMessage(struggles);
        return (
          <>
            <IconBadge icon={AlertTriangle} bg="bg-red-50" color="text-red-500" />
            <StepHeading title={pain.title} />
            <div className="bg-red-50 rounded-xl p-5 mb-6">
              <FadeInLines
                lines={pain.message.split('. ').map((s) => s.trim() + (s.endsWith('.') ? '' : '.'))}
                delayMs={800}
              />
            </div>
            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <p className="text-xs text-gray-500 text-center italic">
                "I studied Japanese for 2 years with textbooks but couldn't hold a basic conversation. I was about to give up."
              </p>
              <p className="text-xs text-gray-400 text-center mt-2">— Sarah, learner from the US</p>
            </div>
            <Button variant="primary" size="lg" onClick={handleNext} className="w-full">
              How can I fix this?
              <ChevronRight className="w-5 h-5 ml-1" />
            </Button>
          </>
        );
      }

      // ── STATS / FEAR ─────────────────────────────────────────────────────
      case 'stats-fear':
        return (
          <>
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                The hard truth about<br />language learning
              </h2>
            </div>
            <div className="space-y-4 mb-6">
              {[
                { stat: '73%', color: 'red', text: 'of learners quit within 6 months because they don\'t see progress' },
                { stat: '92%', color: 'amber', text: 'never practice speaking — the most critical skill for real fluency' },
                { stat: '3x', color: 'gray', text: 'harder to fix grammar mistakes after they become habits' },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.4, duration: 0.5 }}
                  className={`bg-white border border-${item.color}-200 rounded-xl p-4 flex items-start gap-3`}
                >
                  <div className={`text-2xl font-black text-${item.color}-500 leading-none mt-0.5`}>
                    {item.stat}
                  </div>
                  <p className="text-sm text-gray-700">{item.text}</p>
                </motion.div>
              ))}
            </div>
            <p className="text-center text-sm text-gray-500 mb-6">
              But it doesn't have to be this way, {displayName}.
            </p>
            <Button variant="primary" size="lg" onClick={handleNext} className="w-full">
              Show me the solution
              <ChevronRight className="w-5 h-5 ml-1" />
            </Button>
          </>
        );

      // ── SOLUTION ─────────────────────────────────────────────────────────
      // ── TARGET LEVEL ─────────────────────────────────────────────────────
      case 'target-level':
        return (
          <>
            <IconBadge icon={Target} bg="bg-indigo-50" color="text-indigo-500" />
            <StepHeading
              title={`${displayName}, what level do you want to reach?`}
              subtitle="Set your target JLPT level"
            />
            <div className="space-y-2 mb-6">
              {JLPT_LEVELS.filter((l) => {
                const order = ['N5', 'N4', 'N3', 'N2', 'N1'];
                const currentIdx = order.indexOf(jlptLevel || 'N5');
                // Show levels strictly above current, but always show at least N1
                return order.indexOf(l.id) > currentIdx || (l.id === 'N1' && currentIdx <= order.indexOf('N1'));
              }).map((level) => (
                <OptionCard
                  key={level.id}
                  selected={targetLevel === level.id}
                  onClick={() => setTargetLevel(level.id)}
                  label={level.id === jlptLevel ? `${level.label} (Master it!)` : level.label}
                  desc={level.id === jlptLevel ? 'Perfect your current level' : level.desc}
                />
              ))}
            </div>
            <Button
              variant="primary"
              size="lg"
              onClick={handleNext}
              className="w-full"
              disabled={!canProceed()}
            >
              Next <ChevronRight className="w-5 h-5 ml-1" />
            </Button>
          </>
        );

      // ── TIMELINE ─────────────────────────────────────────────────────────
      case 'timeline':
        return (
          <>
            <IconBadge icon={Clock} bg="bg-teal-50" color="text-teal-500" />
            <StepHeading title="When do you want to reach your goal?" />
            <div className="space-y-2 mb-6">
              {TIMELINES.map((t) => (
                <OptionCard
                  key={t.id}
                  selected={timeline === t.id}
                  onClick={() => setTimeline(t.id)}
                  label={t.label}
                  desc={t.desc}
                />
              ))}
            </div>
            <Button
              variant="primary"
              size="lg"
              onClick={handleNext}
              className="w-full"
              disabled={!canProceed()}
            >
              Next <ChevronRight className="w-5 h-5 ml-1" />
            </Button>
          </>
        );

      // ── COMMITMENT ───────────────────────────────────────────────────────
      case 'commitment':
        return (
          <>
            <IconBadge icon={Award} bg="bg-yellow-50" color="text-yellow-500" />
            <StepHeading title={`${displayName}, make a commitment`} />
            <div className="bg-gradient-to-br from-brand-50 to-blue-50 rounded-2xl p-6 mb-6 text-center border border-brand-100">
              <p className="text-lg font-bold text-gray-900 mb-4">
                "I, {displayName}, will practice Japanese<br />
                for <span className="text-brand-600">{dailyTime || '10'} minutes</span> every day"
              </p>
              <div className="flex items-center justify-center gap-4 text-sm text-gray-600">
                <div className="text-center">
                  <div className="text-lg font-bold text-brand-600">{jlptLevel || 'N4'}</div>
                  <div className="text-xs text-gray-400">Current</div>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-300" />
                <div className="text-center">
                  <div className="text-lg font-bold text-green-600">{targetLevel || 'N3'}</div>
                  <div className="text-xs text-gray-400">Goal</div>
                </div>
              </div>
            </div>
            <p className="text-center text-xs text-gray-400 mb-6">
              Learners who set a daily commitment are{' '}
              <span className="font-semibold text-brand-600">4.2x more likely</span> to reach their goals.
            </p>
            <Button variant="primary" size="lg" onClick={handleNext} className="w-full">
              I'm committed
              <Sparkles className="w-5 h-5 ml-1" />
            </Button>
          </>
        );

      // ── BUILDING PLAN ────────────────────────────────────────────────────
      case 'building-plan':
        return (
          <div className="text-center py-8">
            <div className="w-20 h-20 mx-auto mb-6 relative">
              <div className="absolute inset-0 rounded-full border-4 border-gray-200" />
              <div className="absolute inset-0 rounded-full border-4 border-brand-500 border-t-transparent animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Brain className="w-8 h-8 text-brand-600" />
              </div>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Creating {displayName}'s plan...
            </h2>
            <p className="text-sm text-gray-400 mb-6">Analyzing your profile</p>
            <div className="space-y-3 max-w-xs mx-auto">
              {[
                { label: 'Analyzing your pitch patterns', delay: 0 },
                { label: 'Mapping your weak spots', delay: 800 },
                { label: 'Building your drill queue', delay: 1600 },
                { label: 'Personalizing your Pitch Karte', delay: 2400 },
              ].map((item, i) => (
                <LoadingItem key={i} label={item.label} delay={item.delay} />
              ))}
            </div>
          </div>
        );

      // ── YOUR PLAN ────────────────────────────────────────────────────────
      case 'your-plan': {
        const focusLabel = struggles
          .map((s) => STRUGGLES.find((x) => x.id === s)?.label)
          .filter(Boolean)
          .slice(0, 2)
          .join(' & ') || 'pitch accent';

        return (
          <>
            <div className="text-center mb-4">
              <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-semibold mb-4">
                <CheckCircle className="w-4 h-4" />
                Your Pitch Karte plan is ready!
              </div>
              <h2 className="text-2xl font-bold text-gray-900">
                {displayName}'s plan to sound native
              </h2>
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-6 space-y-4">
              {[
                { label: 'Goal', value: 'Sound native', color: 'text-green-600' },
                { label: 'Focus', value: focusLabel, color: 'text-brand-600' },
                { label: 'Daily practice', value: `${dailyTime || '10'} min/day`, color: 'text-gray-900' },
                { label: 'Method', value: 'Pitch Karte + drills', color: 'text-gray-900' },
              ].map((row, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">{row.label}</span>
                  <span className={`font-bold ${row.color}`}>{row.value}</span>
                </div>
              ))}
              <div className="border-t border-gray-100 pt-4">
                <p className="text-xs text-gray-500 text-center">
                  Honest pitch scoring on your own voice, a diagnosis of exactly which
                  patterns you get wrong, and drills built from your errors.
                </p>
              </div>
            </div>
            <Button variant="primary" size="lg" onClick={handleNext} className="w-full">
              Continue
              <ChevronRight className="w-5 h-5 ml-1" />
            </Button>
          </>
        );
      }

      // ── PAYWALL ──────────────────────────────────────────────────────────
      case 'paywall': {
        const premiumPlan = pricingPlans.find((p) => p.id === 'premium');
        const hasStripe = !!premiumPlan?.stripePriceId && !!user?.id;
        const discountPct = premiumPlan?.originalPrice
          ? Math.round((1 - premiumPlan.price / premiumPlan.originalPrice) * 100)
          : 50;

        return (
          // Negative margin to break out of the px-6 container padding and go edge-to-edge
          <div className="-mx-6">

            {/* ── 1. HERO ──────────────────────────────────────────────── */}
            <div className="bg-gradient-to-br from-purple-600 via-purple-700 to-pink-600 px-6 pt-10 pb-12 text-center">
              <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm text-white px-4 py-1.5 rounded-full text-xs font-semibold mb-5">
                <Sparkles className="w-3.5 h-3.5" />
                Special Onboarding Offer — Limited Time
              </div>
              <h1 className="text-3xl font-black text-white mb-3 leading-tight">
                Stop Sounding<br />Foreign.
              </h1>
              <p className="text-purple-100 text-sm leading-relaxed max-w-xs mx-auto">
                Fix the #1 thing that gives you away — your pitch accent — with honest scoring on your own voice.
              </p>
            </div>

            {/* ── 2. PERSONALIZED OFFER CARD ───────────────────────────── */}
            <div className="px-4 -mt-6 mb-4">
              <div className="bg-white rounded-2xl shadow-lg p-5 border border-gray-100">
                <div className="flex items-start gap-3">
                  <span className="text-3xl">📋</span>
                  <div>
                    <h3 className="font-bold text-gray-900 text-base leading-snug">
                      Your Pitch Karte plan is ready, {displayName}!
                    </h3>
                    <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                      Premium unlocks your full <span className="font-semibold text-purple-600">per-pattern diagnosis</span>,
                      a <span className="font-semibold text-purple-600">drill queue built from your own errors</span>, and
                      <span className="font-semibold text-green-600"> before/after progress</span> — so you fix what makes you sound foreign, fast.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* ── 3. COUNTDOWN TIMER ───────────────────────────────────── */}
            <div className="mx-4 mb-4 rounded-2xl bg-gradient-to-r from-orange-500 to-red-500 px-5 py-4 text-center shadow-md">
              <p className="text-white/80 text-xs font-semibold uppercase tracking-widest mb-2">
                Special Price Offer Expires in:
              </p>
              <div className="flex items-center justify-center gap-2">
                <Timer className="w-5 h-5 text-white" />
                <span className="text-white font-mono font-black text-2xl tabular-nums">
                  <CountdownTimer minutes={5} />
                </span>
              </div>
            </div>

            {/* ── 4. COUPON CODE ───────────────────────────────────────── */}
            <div className="mx-4 mb-6 rounded-2xl bg-gradient-to-r from-yellow-400 to-orange-400 px-5 py-4 text-center shadow-md">
              <p className="text-yellow-900 text-xs font-bold uppercase tracking-wider mb-2">
                Your Personal Coupon Code Applied!
              </p>
              <div className="inline-block bg-white/90 rounded-xl px-6 py-2 border-2 border-dashed border-yellow-600">
                <span className="font-mono font-black text-orange-700 text-lg tracking-widest">
                  NIHONGO50OFF
                </span>
              </div>
              <p className="text-yellow-900/70 text-xs mt-2 font-medium">
                50% discount automatically applied at checkout
              </p>
            </div>

            {/* ── 5. TESTIMONIALS ──────────────────────────────────────── */}
            <div className="px-4 mb-6">
              <h2 className="text-center text-lg font-bold text-gray-900 mb-4">
                What Our Community Says
              </h2>
              <div className="space-y-3">
                {[
                  {
                    name: 'Sarah M.',
                    quote: 'NihonGo transformed my Japanese practice! The AI feedback on my diary entries is incredibly detailed and helpful.',
                    initials: 'SM',
                    color: 'bg-purple-500',
                  },
                  {
                    name: 'Marcus T.',
                    quote: 'I went from barely reading hiragana to confidently speaking at N4 level. The voice diary feature is genius.',
                    initials: 'MT',
                    color: 'bg-pink-500',
                  },
                  {
                    name: 'Yuki K.',
                    quote: 'As a teacher, I love how I can track my student\'s progress. The AI corrections save me so much time.',
                    initials: 'YK',
                    color: 'bg-indigo-500',
                  },
                ].map((review) => (
                  <div key={review.name} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                    <div className="flex items-center gap-0.5 mb-2">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                      ))}
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed mb-3">
                      "{review.quote}"
                    </p>
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-full ${review.color} flex items-center justify-center flex-shrink-0`}>
                        <span className="text-white text-xs font-bold">{review.initials}</span>
                      </div>
                      <span className="text-sm font-semibold text-gray-800">{review.name}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── 6. FEATURES SECTION ──────────────────────────────────── */}
            <div className="bg-gradient-to-br from-pink-50 to-purple-50 border-y border-purple-100 px-6 py-6 mb-6">
              <h2 className="text-center text-lg font-bold text-gray-900 mb-5">
                Everything You Need to Succeed
              </h2>
              <div className="space-y-4">
                {[
                  { icon: Brain, label: 'AI-Powered', desc: 'Personalized feedback on every entry', color: 'text-purple-600', bg: 'bg-purple-100' },
                  { icon: Mic, label: 'Voice Diary', desc: 'Speak & improve daily with AI coaching', color: 'text-pink-600', bg: 'bg-pink-100' },
                  { icon: Target, label: 'JLPT Practice', desc: 'Exam-ready training at your level', color: 'text-blue-600', bg: 'bg-blue-100' },
                  { icon: Users, label: 'Teacher Connect', desc: 'Learn together with real teachers', color: 'text-green-600', bg: 'bg-green-100' },
                ].map((feature) => (
                  <div key={feature.label} className="flex items-center gap-4 bg-white rounded-xl p-4 shadow-sm border border-white">
                    <div className={`w-12 h-12 ${feature.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                      <feature.icon className={`w-6 h-6 ${feature.color}`} />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-sm">{feature.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{feature.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── 7. CTA SECTION ───────────────────────────────────────── */}
            <div className="bg-gradient-to-r from-purple-700 to-pink-600 px-6 py-8 mb-6 text-center">
              <h2 className="text-xl font-black text-white mb-2 leading-tight">
                Start Your Japanese Learning<br />Journey Today
              </h2>
              <p className="text-purple-100 text-sm">
                No commitment. Cancel anytime. Full access to all features.
              </p>
            </div>

            {/* ── 8. PREMIUM PLAN CARD ─────────────────────────────────── */}
            <div className="px-4 mb-4">
              <div className="relative bg-white rounded-2xl border-2 border-purple-500 shadow-xl overflow-hidden">
                {/* RECOMMENDED badge */}
                <div className="absolute top-0 left-0 right-0 flex justify-center">
                  <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-black px-6 py-1.5 rounded-b-xl tracking-wider">
                    RECOMMENDED
                  </div>
                </div>

                <div className="pt-10 pb-6 px-6">
                  {/* Pricing row */}
                  <div className="text-center mb-5">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      {premiumPlan?.originalPrice && (
                        <span className="text-xl text-gray-400 line-through font-semibold">
                          ${premiumPlan.originalPrice}
                        </span>
                      )}
                      <span className="inline-flex items-center bg-red-500 text-white text-xs font-black px-2.5 py-1 rounded-full">
                        {discountPct}% OFF
                      </span>
                    </div>
                    <div className="flex items-end justify-center gap-1">
                      <span className="text-5xl font-black text-purple-600">
                        ${premiumPlan?.price || '4.99'}
                      </span>
                      <span className="text-gray-500 text-sm pb-2">/month</span>
                    </div>
                    <p className="text-xs text-green-600 font-semibold mt-1">
                      Limited-time onboarding offer
                    </p>
                  </div>

                  {/* Feature list */}
                  <ul className="space-y-2.5 mb-6">
                    {[
                      'Unlimited diary recordings',
                      'Detailed AI feedback on every entry',
                      'Unlimited JLPT speaking practice',
                      'Grammar & vocabulary corrections',
                      'Share diary with your teacher',
                      'Unlimited storage & history',
                      `Reach ${targetLevel || 'N3'} faster with your custom plan`,
                    ].map((f, i) => (
                      <li key={i} className="flex items-center gap-3 text-sm text-gray-700">
                        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>

                  {/* CTA Button */}
                  {hasStripe ? (
                    <button
                      onClick={handleCheckout}
                      disabled={checkoutLoading}
                      className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-black text-base shadow-lg disabled:opacity-60 flex items-center justify-center gap-2 transition-opacity"
                    >
                      {checkoutLoading ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Crown className="w-5 h-5" />
                          Start Premium — {discountPct}% OFF
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={handleFinish}
                      className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-black text-base shadow-lg flex items-center justify-center gap-2"
                    >
                      <Crown className="w-5 h-5" />
                      Start Premium — {discountPct}% OFF
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* ── 9. FREE PLAN ─────────────────────────────────────────── */}
            <div className="px-4 mb-6 text-center">
              <button
                onClick={handleFinish}
                className="text-sm text-gray-400 hover:text-gray-600 underline underline-offset-2 transition-colors py-2"
              >
                Continue with limited free plan
              </button>
              <p className="text-xs text-gray-300 mt-1">3 recordings/month · Basic AI analysis · 1 practice/day</p>
            </div>

            {/* ── 10. TRUST SIGNALS ────────────────────────────────────── */}
            <div className="px-4 pb-10 flex items-center justify-center gap-6 text-xs text-gray-400">
              <div className="flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-gray-300" />
                <span>Cancel anytime</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-gray-300" />
                <span>Secure payment</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-gray-300" />
                <span>Powered by Stripe</span>
              </div>
            </div>

          </div>
        );
      }

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      <ProgressBar current={stepIndex} total={STEPS.length} />

      {/* Skip (hidden on paywall, building plan, diagnosis) */}
      {!['paywall', 'building-plan', 'diagnosis', 'before-after'].includes(currentStep) && (
        <div className="flex justify-end px-6 pt-2">
          <button
            onClick={handleFinish}
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            Skip
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-6 pb-24">
        <div className="max-w-md mx-auto pt-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3 }}
            >
              {renderStep()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Sticky pricing bar - always visible except on paywall */}
      {!['paywall', 'building-plan'].includes(currentStep) && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-4px_12px_rgba(0,0,0,0.08)] z-50">
          <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Crown className="w-4 h-4 text-brand-600" />
              <div>
                <span className="text-sm font-bold text-gray-900">Premium</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-gray-400 line-through">$9.99</span>
                  <span className="text-sm font-bold text-brand-600">$4.99</span>
                  <span className="text-xs text-gray-500">/mo</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                const paywallIdx = STEPS.indexOf('paywall');
                if (paywallIdx !== -1) setStepIndex(paywallIdx);
              }}
              className="bg-brand-500 hover:bg-brand-600 text-white text-sm font-bold px-5 py-2 rounded-full transition-colors"
            >
              50% OFF - Upgrade
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Loading Item with staggered animation ───────────────────────────────────

const LoadingItem: React.FC<{ label: string; delay: number }> = ({ label, delay }) => {
  const [visible, setVisible] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const showTimer = setTimeout(() => setVisible(true), delay);
    const doneTimer = setTimeout(() => setDone(true), delay + 600);
    return () => {
      clearTimeout(showTimer);
      clearTimeout(doneTimer);
    };
  }, [delay]);

  if (!visible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3"
    >
      {done ? (
        <CheckCircle className="w-5 h-5 text-green-500" />
      ) : (
        <div className="w-5 h-5 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
      )}
      <span className={`text-sm ${done ? 'text-gray-900' : 'text-gray-500'}`}>{label}</span>
    </motion.div>
  );
};

export default OnboardingFlow;
