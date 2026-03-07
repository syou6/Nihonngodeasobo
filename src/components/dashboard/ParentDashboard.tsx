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
  GraduationCap,
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
import { format, formatDistanceToNow } from 'date-fns';
import { enUS } from 'date-fns/locale';

interface ParentDashboardProps {
  onViewChange: (view: string) => void;
}

export const ParentDashboard: React.FC<ParentDashboardProps> = ({ onViewChange }) => {
  const [recentComments, setRecentComments] = useState<any[]>([]);
  const [commentCount, setCommentCount] = useState(0);
  const [todayHealthScore, setTodayHealthScore] = useState<number | null>(null);
  const [todayEmotion, setTodayEmotion] = useState<string | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const { entries, fetchEntries } = useDiaryStore();
  const { user } = useAuthStore();
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
      setTodayHealthScore(todayDiary.health_score || null);
      setTodayEmotion(todayDiary.emotion || null);
    } else {
      setTodayHealthScore(null);
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

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Welcome Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl p-4 sm:p-6 md:p-8 text-white"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 break-keep">
              {greeting()}!
            </h1>
            <p className="text-lg sm:text-xl md:text-2xl opacity-90 whitespace-nowrap">
              {EN.parentDashboard.todayDate} {format(today, 'MMMM d', { locale: enUS })}
            </p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            {(() => {
              const iconName = weather ? getWeatherIconName(weather.icon) : 'Sun';
              const iconClass = "w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 opacity-80";
              const iconMap: Record<string, React.ReactNode> = {
                Sun: <Sun className={iconClass} />,
                CloudSun: <CloudSun className={iconClass} />,
                Cloud: <Cloud className={iconClass} />,
                CloudRain: <CloudRain className={iconClass} />,
                CloudLightning: <CloudLightning className={iconClass} />,
                Snowflake: <Snowflake className={iconClass} />,
                CloudFog: <CloudFog className={iconClass} />,
              };
              return iconMap[iconName] || <Sun className={iconClass} />;
            })()}
            <div className="text-right">
              <div className="text-base sm:text-lg md:text-xl font-bold capitalize">
                {weather ? weather.description : '...'}
              </div>
              <div className="text-sm sm:text-base md:text-lg opacity-80">
                {weather ? `${weather.temp}°C` : '...'}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {/* Record Voice Diary */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.02 }}
          className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 text-center"
        >
          <div className="bg-red-100 w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
            <Mic className="w-10 h-10 sm:w-12 sm:h-12 text-red-600" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 sm:mb-4">
            {EN.parentDashboard.recordPrompt}
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-gray-600 mb-2">
            {EN.parentDashboard.recordSubPrompt}
          </p>
          <div className="text-left bg-red-50 rounded-lg p-3 mb-4">
            <p className="text-sm text-gray-700">
              {EN.parentDashboard.topicIdeas}
            </p>
            <ul className="text-sm text-gray-600 mt-1">
              <li>• {EN.parentDashboard.topics.food}</li>
              <li>• {EN.parentDashboard.topics.feeling}</li>
              <li>• {EN.parentDashboard.topics.activities}</li>
            </ul>
          </div>
          <Button
            onClick={() => onViewChange('record')}
            variant="primary"
            size="xl"
            className="w-full text-base sm:text-lg"
          >
            <Mic className="w-6 h-6 sm:w-8 sm:h-8" />
            {EN.parentDashboard.startRecording}
          </Button>
        </motion.div>

        {/* View Diaries */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          delay={0.1}
          whileHover={{ scale: 1.02 }}
          className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 text-center"
        >
          <div className="bg-blue-100 w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
            <Calendar className="w-10 h-10 sm:w-12 sm:h-12 text-blue-600" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 sm:mb-4">
            {EN.parentDashboard.viewDiaries}
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-gray-600 mb-4 sm:mb-6">
            {EN.parentDashboard.viewDiariesDesc}
          </p>
          <Button
            onClick={() => onViewChange('diary')}
            variant="outline"
            size="xl"
            className="w-full text-base sm:text-lg"
          >
            <Calendar className="w-6 h-6 sm:w-8 sm:h-8" />
            {EN.parentDashboard.viewDiaryButton}
          </Button>
        </motion.div>
      </div>

      {/* Today's Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        delay={0.2}
        className="bg-white rounded-2xl shadow-lg p-8"
      >
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          {EN.parentDashboard.todaySummary}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-6 bg-green-50 rounded-xl">
            <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <TrendingUp className="w-8 h-8 text-green-600" />
            </div>
            <div className="text-3xl font-bold text-green-600 mb-2">
              {todayHealthScore !== null ? todayHealthScore : '-'}
            </div>
            <div className="text-lg text-gray-700">{EN.parentDashboard.speakingScore}</div>
          </div>

          <div className="text-center p-6 bg-blue-50 rounded-xl">
            <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Heart className="w-8 h-8 text-blue-600" />
            </div>
            <div className="text-3xl font-bold text-blue-600 mb-2">
              {todayEmotion || '-'}
            </div>
            <div className="text-lg text-gray-700">{EN.parentDashboard.todayMood}</div>
          </div>

          <div className="text-center p-6 bg-purple-50 rounded-xl">
            <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageCircle className="w-8 h-8 text-purple-600" />
            </div>
            <div className="text-3xl font-bold text-purple-600 mb-2">{commentCount}</div>
            <div className="text-lg text-gray-700">{EN.parentDashboard.familyComments}</div>
          </div>
        </div>
      </motion.div>

      {/* Teacher Messages */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        delay={0.3}
        className="bg-white rounded-2xl shadow-lg p-8"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {EN.parentDashboard.familyMessages}
          </h2>
          <GraduationCap className="w-6 h-6 text-blue-600" />
        </div>

        <div className="space-y-4">
          {recentComments.length > 0 ? (
            recentComments.map((comment, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              delay={0.4 + index * 0.1}
              className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl"
            >
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-xl font-semibold">{comment.user?.name?.[0] || '👤'}</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-bold text-gray-900 text-lg">
                    {comment.user?.name || 'User'}
                  </span>
                  <span className="text-gray-500">
                    {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: enUS })}
                  </span>
                </div>
                <p className="text-gray-700 text-lg leading-relaxed">
                  {comment.content}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Diary: {comment.diaryTitle}
                </p>
              </div>
            </motion.div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg">{EN.parentDashboard.noMessages}</p>
              <p className="text-sm mt-2">{EN.parentDashboard.sharePrompt}</p>
            </div>
          )}
        </div>

        {recentComments.length > 0 && (
          <div className="mt-6 text-center">
            <Button
              variant="outline"
              size="lg"
              onClick={() => onViewChange('diary')}
            >
              <MessageCircle className="w-5 h-5" />
              {EN.parentDashboard.viewAllComments}
            </Button>
          </div>
        )}
      </motion.div>
    </div>
  );
};
