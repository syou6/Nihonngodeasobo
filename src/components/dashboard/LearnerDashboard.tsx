import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '../ui/Button';
import { useDiaryStore } from '../../stores/diaryStore';
import { useAuthStore } from '../../stores/authStore';
import { EN } from '../../i18n/en';
import {
  Mic,
  Calendar,
  TrendingUp,
  MessageCircle,
  Crown,
  Lock,
  Zap,
  AlertTriangle,
} from 'lucide-react';
import { useSubscription } from '../../hooks/useSubscription';
import { format, formatDistanceToNow } from 'date-fns';
import { enUS } from 'date-fns/locale';

interface LearnerDashboardProps {
  onViewChange: (view: string) => void;
}

export const LearnerDashboard: React.FC<LearnerDashboardProps> = ({ onViewChange }) => {
  const [recentComments, setRecentComments] = useState<any[]>([]);
  const { entries, fetchEntries } = useDiaryStore();
  const { user } = useAuthStore();
  const { isPremium, usage, limits } = useSubscription();
  const today = new Date();

  const greeting = () => {
    const hour = today.getHours();
    if (hour < 12) return EN.dashboard.greeting.morning;
    if (hour < 18) return EN.dashboard.greeting.afternoon;
    return EN.dashboard.greeting.evening;
  };

  useEffect(() => {
    if (user) {
      fetchEntries();
    }
  }, [user, fetchEntries]);

  useEffect(() => {
    const userDiaries = entries.filter(entry => entry.user_id === user?.id);
    const allComments: any[] = [];

    userDiaries.forEach(diary => {
      if (diary.comments && diary.comments.length > 0) {
        diary.comments.forEach(comment => {
          allComments.push({
            ...comment,
            diaryTitle: diary.ai_summary || diary.content.substring(0, 30) + '...'
          });
        });
      }
    });

    const sortedComments = allComments
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 3);

    setRecentComments(sortedComments);
  }, [entries, user]);

  const userDiaryCount = entries.filter(entry => entry.user_id === user?.id).length;
  const isFirstTime = userDiaryCount === 0;

  const num = (k: string) => Number(localStorage.getItem(k)) || 0;
  const pitchStats = {
    streak: num('pitchStreak'),
    best: num('pitchBest'),
    mastered: (() => {
      try { return JSON.parse(localStorage.getItem('pitchMastered') || '[]').length; } catch { return 0; }
    })(),
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* First-time user guide */}
      {isFirstTime && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-brand-50 to-purple-50 rounded-xl p-6 border border-brand-200"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-brand-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Mic className="w-6 h-6 text-brand-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-gray-900 mb-1">
                Record your first diary!
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                Tap the button below and speak about your day in Japanese. Even one sentence is fine — AI will give you feedback.
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => onViewChange('record')}
                  className="flex items-center gap-2"
                >
                  <Mic className="w-4 h-4" />
                  Record Now
                </Button>
                <Button
                  variant="outline"
                  size="md"
                  onClick={() => onViewChange('practice')}
                  className="flex items-center gap-2"
                >
                  <TrendingUp className="w-4 h-4" />
                  Try JLPT Practice
                </Button>
              </div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-brand-200/50">
            <p className="text-xs text-gray-500">
              Not sure what to say? Try: "きょう は いい てんき です" (Today is nice weather)
            </p>
          </div>
        </motion.div>
      )}

      {/* Welcome */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl p-5 sm:p-6 shadow-sm border border-gray-100"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
              {greeting()}{user?.name ? `, ${user.name}` : ''}!
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {format(today, 'EEEE, MMMM d', { locale: enUS })}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Pitch trainer — the primary daily action */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ scale: 1.01 }}
        onClick={() => onViewChange('pitch')}
        className="relative overflow-hidden rounded-2xl p-6 cursor-pointer text-white shadow-lg"
        style={{ background: 'linear-gradient(135deg, #4F46E5, #6366F1)' }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-extrabold mb-1">🎯 Train Your Pitch</h2>
            <p className="text-sm text-white/80">Record a word, see your pitch vs a native, fix what sounds foreign.</p>
          </div>
          {(() => {
            const s = Number(localStorage.getItem('pitchStreak'));
            return Number.isFinite(s) && s > 0 ? (
              <div className="flex-shrink-0 ml-4 text-center bg-white/15 rounded-2xl px-4 py-2">
                <div className="text-2xl font-black">🔥 {s}</div>
                <div className="text-[10px] uppercase tracking-wider text-white/70">streak</div>
              </div>
            ) : (
              <span className="flex-shrink-0 ml-4 bg-white text-primary font-bold text-sm px-5 py-2.5 rounded-full">Start →</span>
            );
          })()}
        </div>
      </motion.div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          whileHover={{ scale: 1.01 }}
          onClick={() => onViewChange('record')}
          className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 cursor-pointer hover:border-brand-200 transition-colors"
        >
          <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center mb-3">
            <Mic className="w-5 h-5 text-red-500" />
          </div>
          <h2 className="font-semibold text-gray-900 mb-1">
            {EN.parentDashboard.recordPrompt}
          </h2>
          <p className="text-sm text-gray-500">
            {EN.parentDashboard.recordSubPrompt}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          whileHover={{ scale: 1.01 }}
          onClick={() => onViewChange('diary')}
          className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 cursor-pointer hover:border-brand-200 transition-colors"
        >
          <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center mb-3">
            <Calendar className="w-5 h-5 text-blue-500" />
          </div>
          <h2 className="font-semibold text-gray-900 mb-1">
            {EN.parentDashboard.viewDiaries}
          </h2>
          <p className="text-sm text-gray-500">
            {EN.parentDashboard.viewDiariesDesc}
          </p>
        </motion.div>
      </div>

      {/* Usage & Upgrade Banner (free users only) */}
      {!isPremium && (() => {
        const diaryPct = limits.diaryLimit === Infinity ? 0 : usage.diaryCount / (limits.diaryLimit as number);
        const isAtLimit = usage.diaryCount >= (limits.diaryLimit as number);
        const isNearLimit = !isAtLimit && diaryPct >= 0.6;

        const bannerBg = isAtLimit
          ? 'bg-gradient-to-r from-red-50 to-orange-50 border-red-300'
          : isNearLimit
            ? 'bg-gradient-to-r from-orange-50 to-yellow-50 border-orange-300'
            : 'bg-gradient-to-r from-brand-50 to-purple-50 border-brand-200';

        const labelColor = isAtLimit ? 'text-red-700' : isNearLimit ? 'text-orange-700' : 'text-gray-700';

        return (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className={`rounded-xl border p-4 ${bannerBg}`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                {isAtLimit && <AlertTriangle className="w-4 h-4 text-red-600" />}
                {isNearLimit && <AlertTriangle className="w-4 h-4 text-orange-500" />}
                <span className={`text-sm font-semibold ${labelColor}`}>
                  {isAtLimit
                    ? "You've hit your limit!"
                    : isNearLimit
                      ? 'Running low on free recordings'
                      : 'Monthly Usage'}
                </span>
              </div>
              <button
                onClick={() => onViewChange('pricing')}
                className="text-xs font-bold text-brand-600 hover:text-brand-700 underline underline-offset-2"
              >
                Upgrade →
              </button>
            </div>

            {isAtLimit && (
              <p className="text-xs text-red-600 mb-3 font-medium">
                You cannot record any more diaries this month. Upgrade to Premium for unlimited recordings.
              </p>
            )}

            <div className="flex gap-3">
              <div className={`flex-1 rounded-lg px-3 py-2 ${isAtLimit ? 'bg-red-100/80' : 'bg-white/80'}`}>
                <div className="text-xs text-gray-500">Diaries</div>
                <div className={`text-sm font-bold ${isAtLimit ? 'text-red-700' : isNearLimit ? 'text-orange-700' : 'text-gray-900'}`}>
                  {usage.diaryCount}/{limits.diaryLimit === Infinity ? '∞' : limits.diaryLimit}
                </div>
              </div>
              <div className="flex-1 bg-white/80 rounded-lg px-3 py-2">
                <div className="text-xs text-gray-500">AI Feedback</div>
                <div className="text-sm font-bold text-gray-900">
                  {usage.aiFeedbackCount}/{limits.aiAnalysisLimit === Infinity ? '∞' : limits.aiAnalysisLimit}
                </div>
              </div>
              <div className="flex-1 bg-white/80 rounded-lg px-3 py-2">
                <div className="text-xs text-gray-500">Practice</div>
                <div className="text-sm font-bold text-gray-900">
                  {usage.speakingPracticeCount}/{limits.speakingPracticeLimit === Infinity ? '∞' : limits.speakingPracticeLimit}
                </div>
              </div>
            </div>

            {(isAtLimit || isNearLimit) && (
              <button
                onClick={() => onViewChange('pricing')}
                className="mt-3 w-full py-2 rounded-lg bg-gradient-to-r from-brand-500 to-purple-500 text-white text-sm font-bold hover:from-brand-600 hover:to-purple-600 transition-all flex items-center justify-center gap-2"
              >
                <Crown className="w-4 h-4" />
                Upgrade to Premium — ¥980/month
              </button>
            )}
          </motion.div>
        );
      })()}

      {/* Premium features you're missing (free users only) */}
      {!isPremium && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
          className="bg-white rounded-xl border border-gray-100 shadow-sm p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-amber-500" />
              <h3 className="font-semibold text-gray-900">Premium features you're missing</h3>
            </div>
            <button
              onClick={() => onViewChange('pricing')}
              className="text-xs font-bold text-brand-600 hover:text-brand-700"
            >
              See plans →
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              { icon: Mic, label: 'Unlimited diary recordings' },
              { icon: Zap, label: 'Detailed AI grammar corrections' },
              { icon: TrendingUp, label: 'JLPT speaking practice (unlimited)' },
              { icon: MessageCircle, label: 'Teacher sharing & feedback' },
              { icon: Calendar, label: 'Unlimited diary storage' },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2.5 text-sm text-gray-500">
                <div className="relative flex-shrink-0">
                  <Icon className="w-4 h-4 text-gray-300" />
                  <Lock className="w-2.5 h-2.5 text-gray-400 absolute -bottom-0.5 -right-0.5" />
                </div>
                <span>{label}</span>
              </div>
            ))}
          </div>
          <button
            onClick={() => onViewChange('pricing')}
            className="mt-4 w-full py-2.5 rounded-xl bg-gradient-to-r from-brand-500 to-purple-500 text-white text-sm font-bold hover:from-brand-600 hover:to-purple-600 transition-all flex items-center justify-center gap-2 shadow-md"
          >
            <Crown className="w-4 h-4" />
            Unlock Premium — ¥980/month
          </button>
        </motion.div>
      )}

      {/* Today's Stats */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-white rounded-xl shadow-sm border border-gray-100 p-5"
      >
        <h2 className="font-semibold text-gray-900 mb-4">Your Pitch Progress</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl mb-1">🔥</div>
            <div className="text-lg font-bold text-gray-900">{pitchStats.streak}</div>
            <div className="text-xs text-gray-500">Current streak</div>
          </div>
          <div className="text-center">
            <div className="text-2xl mb-1">⭐</div>
            <div className="text-lg font-bold text-gray-900">{pitchStats.best}</div>
            <div className="text-xs text-gray-500">Best streak</div>
          </div>
          <div className="text-center">
            <div className="text-2xl mb-1">✅</div>
            <div className="text-lg font-bold text-gray-900">{pitchStats.mastered}</div>
            <div className="text-xs text-gray-500">Words nailed</div>
          </div>
        </div>
      </motion.div>

      {/* Teacher messages — only render when a teacher has actually commented;
          an empty "no messages" block on the pitch home reads as dead. */}
      {recentComments.length > 0 && (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-xl shadow-sm border border-gray-100 p-5"
      >
        <h2 className="font-semibold text-gray-900 mb-4">
          {EN.parentDashboard.familyMessages}
        </h2>

        <div className="space-y-3">
          {
            recentComments.map((comment, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
              >
                <div className="w-8 h-8 bg-brand-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-semibold text-brand-700">{comment.user?.name?.[0] || '?'}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm text-gray-900">
                      {comment.user?.name || 'User'}
                    </span>
                    <span className="text-xs text-gray-400">
                      {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: enUS })}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">{comment.content}</p>
                </div>
              </div>
            ))
          }
        </div>

        <div className="mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onViewChange('diary')}
            className="w-full"
          >
            {EN.parentDashboard.viewAllComments}
          </Button>
        </div>
      </motion.div>
      )}
    </div>
  );
};
