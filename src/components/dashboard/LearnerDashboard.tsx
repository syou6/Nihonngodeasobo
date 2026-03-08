import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '../ui/Button';
import { useDiaryStore } from '../../stores/diaryStore';
import { useAuthStore } from '../../stores/authStore';
import { EN } from '../../i18n/en';
import {
  Mic,
  Calendar,
  Heart,
  TrendingUp,
  MessageCircle,
  Sun,
  CloudSun,
  Cloud,
  CloudRain,
  CloudLightning,
  Snowflake,
  CloudFog
} from 'lucide-react';
import { fetchWeather, getWeatherIconName } from '../../lib/weather';
import type { WeatherData } from '../../lib/weather';
import { useSubscription } from '../../hooks/useSubscription';
import { format, formatDistanceToNow } from 'date-fns';
import { enUS } from 'date-fns/locale';

interface LearnerDashboardProps {
  onViewChange: (view: string) => void;
}

export const LearnerDashboard: React.FC<LearnerDashboardProps> = ({ onViewChange }) => {
  const [recentComments, setRecentComments] = useState<any[]>([]);
  const [commentCount, setCommentCount] = useState(0);
  const [todayLanguageScore, setTodayLanguageScore] = useState<number | null>(null);
  const [todayEmotion, setTodayEmotion] = useState<string | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
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
    fetchWeather()
      .then(setWeather)
      .catch(() => setWeather({ temp: 25, description: 'Sunny', icon: '01d' }));
  }, []);

  useEffect(() => {
    const userDiaries = entries.filter(entry => entry.user_id === user?.id);
    const allComments: any[] = [];

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const todayDiary = userDiaries.find(diary => {
      const diaryDate = new Date(diary.created_at);
      return diaryDate >= todayStart && diaryDate <= todayEnd;
    });

    if (todayDiary) {
      // Extract score from AI feedback markdown (## Score: X/100)
      const scoreMatch = todayDiary.ai_feedback?.markdownContent?.match(/Score:\s*(\d+)\s*\/\s*100/);
      setTodayLanguageScore(scoreMatch ? parseInt(scoreMatch[1], 10) : null);
      setTodayEmotion(todayDiary.emotion || null);
    } else {
      setTodayLanguageScore(null);
      setTodayEmotion(null);
    }

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
    setCommentCount(allComments.length);
  }, [entries, user]);

  const WeatherIcon: React.FC<{ icon: string; className?: string }> = ({ icon, className }) => {
    const iconName = getWeatherIconName(icon);
    const iconMap: Record<string, React.ReactNode> = {
      Sun: <Sun className={className} />,
      CloudSun: <CloudSun className={className} />,
      Cloud: <Cloud className={className} />,
      CloudRain: <CloudRain className={className} />,
      CloudLightning: <CloudLightning className={className} />,
      Snowflake: <Snowflake className={className} />,
      CloudFog: <CloudFog className={className} />,
    };
    return <>{iconMap[iconName] || <Sun className={className} />}</>;
  };

  const userDiaryCount = entries.filter(entry => entry.user_id === user?.id).length;
  const isFirstTime = userDiaryCount === 0;

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
          {weather && (
            <div className="flex items-center gap-2 text-gray-500">
              <WeatherIcon icon={weather.icon} className="w-6 h-6" />
              <span className="text-sm">{weather.temp}°C</span>
            </div>
          )}
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
      {!isPremium && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="bg-gradient-to-r from-brand-50 to-purple-50 rounded-xl border border-brand-200 p-4"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Monthly Usage</span>
            <button
              onClick={() => onViewChange('pricing')}
              className="text-xs font-semibold text-brand-600 hover:text-brand-700"
            >
              Upgrade for unlimited →
            </button>
          </div>
          <div className="flex gap-3">
            <div className="flex-1 bg-white/80 rounded-lg px-3 py-2">
              <div className="text-xs text-gray-500">Diaries</div>
              <div className="text-sm font-bold text-gray-900">
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
        </motion.div>
      )}

      {/* Today's Stats */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-white rounded-xl shadow-sm border border-gray-100 p-5"
      >
        <h2 className="font-semibold text-gray-900 mb-4">
          {EN.parentDashboard.todaySummary}
        </h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center mx-auto mb-2">
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
            <div className="text-lg font-bold text-gray-900">
              {todayLanguageScore !== null ? todayLanguageScore : '-'}
            </div>
            <div className="text-xs text-gray-500">{EN.parentDashboard.speakingScore}</div>
          </div>

          <div className="text-center">
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center mx-auto mb-2">
              <Heart className="w-5 h-5 text-blue-500" />
            </div>
            <div className="text-lg font-bold text-gray-900">
              {todayEmotion || '-'}
            </div>
            <div className="text-xs text-gray-500">{EN.parentDashboard.todayMood}</div>
          </div>

          <div className="text-center">
            <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center mx-auto mb-2">
              <MessageCircle className="w-5 h-5 text-purple-500" />
            </div>
            <div className="text-lg font-bold text-gray-900">{commentCount}</div>
            <div className="text-xs text-gray-500">{EN.parentDashboard.familyComments}</div>
          </div>
        </div>
      </motion.div>

      {/* Teacher Messages */}
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
          {recentComments.length > 0 ? (
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
          ) : (
            <div className="text-center py-6 text-gray-400">
              <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">{EN.parentDashboard.noMessages}</p>
            </div>
          )}
        </div>

        {recentComments.length > 0 && (
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
        )}
      </motion.div>
    </div>
  );
};
