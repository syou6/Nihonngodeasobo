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
  Crown,
  Lock,
  Zap,
  ClipboardList,
} from 'lucide-react';
import { useSubscription } from '../../hooks/useSubscription';
import { PitchSheep } from '../mascot/PitchSheep';
import { format, formatDistanceToNow } from 'date-fns';
import { enUS } from 'date-fns/locale';

interface LearnerDashboardProps {
  onViewChange: (view: string) => void;
}

export const LearnerDashboard: React.FC<LearnerDashboardProps> = ({ onViewChange }) => {
  const [recentComments, setRecentComments] = useState<any[]>([]);
  const { entries, fetchEntries } = useDiaryStore();
  const { user } = useAuthStore();
  const { isPremium } = useSubscription();
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

      {/* Ear Sprint — the frictionless daily habit (no mic) */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ scale: 1.01 }}
        onClick={() => onViewChange('ear')}
        className="relative overflow-hidden rounded-3xl p-6 cursor-pointer text-white shadow-soft bg-brand-gradient"
      >
        <div className="pointer-events-none absolute -top-10 -right-6 w-40 h-40 bg-white/10 blur-2xl rounded-full" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            <PitchSheep mood="idle" size={60} className="shrink-0 drop-shadow" />
            <div>
              <h2 className="font-display text-2xl font-extrabold mb-1">Ear Sprint</h2>
              <p className="text-sm text-white/80">60-second ear game. 箸 or 橋? Build your combo — no mic.</p>
            </div>
          </div>
          {(() => {
            const s = Number(localStorage.getItem('pitchDailyStreak'));
            return Number.isFinite(s) && s > 0 ? (
              <div className="flex-shrink-0 ml-4 text-center bg-white/15 rounded-2xl px-4 py-2">
                <div className="text-2xl font-black">🔥 {s}</div>
                <div className="text-[10px] uppercase tracking-wider text-white/70">day streak</div>
              </div>
            ) : (
              <span className="flex-shrink-0 ml-4 bg-white text-brand-600 font-bold text-sm px-5 py-2.5 rounded-full">Play →</span>
            );
          })()}
        </div>
      </motion.div>

      {/* Quick Actions — the two games + the karte */}
      <div className="grid grid-cols-2 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          whileHover={{ scale: 1.01 }}
          onClick={() => onViewChange('pitch')}
          className="bg-white rounded-2xl shadow-card ring-1 ring-gray-100 p-5 cursor-pointer hover:ring-brand-200 transition-all"
        >
          <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center mb-3">
            <Mic className="w-5 h-5 text-brand-600" />
          </div>
          <h2 className="font-display font-bold text-ink mb-1">🎤 Pitch Karaoke</h2>
          <p className="text-sm text-gray-500">Steer your voice through the drop</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          whileHover={{ scale: 1.01 }}
          onClick={() => onViewChange('karte')}
          className="bg-white rounded-2xl shadow-card ring-1 ring-gray-100 p-5 cursor-pointer hover:ring-brand-200 transition-all"
        >
          <div className="w-10 h-10 bg-accent-300/20 rounded-xl flex items-center justify-center mb-3">
            <ClipboardList className="w-5 h-5 text-accent-500" />
          </div>
          <h2 className="font-display font-bold text-ink mb-1">My Pitch Karte</h2>
          <p className="text-sm text-gray-500">Your per-pattern diagnosis</p>
        </motion.div>
      </div>


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
              { icon: TrendingUp, label: 'Ear-vs-mouth gap — what you hear vs say' },
              { icon: Zap, label: 'Personal drill queue from your errors' },
              { icon: Calendar, label: 'Full Karte — per-pattern diagnosis + history' },
              { icon: Mic, label: 'Every minimal pair + hard mode unlocked' },
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
            Unlock Premium — $8.99/month
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
