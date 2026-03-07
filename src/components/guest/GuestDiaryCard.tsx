import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, Trash2, Clock, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { useGuestStore } from '../../stores/guestStore';
import { EN } from '../../i18n/en';
import toast from 'react-hot-toast';

interface GuestDiaryCardProps {
  diary: any;
}

export const GuestDiaryCard: React.FC<GuestDiaryCardProps> = ({ diary }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const { deleteGuestDiary } = useGuestStore();

  const handlePlayPause = () => {
    if (!diary.voice_data) return;

    if (!audioElement) {
      const audio = new Audio(diary.voice_data);
      audio.onended = () => setIsPlaying(false);
      setAudioElement(audio);
      audio.play();
      setIsPlaying(true);
    } else {
      if (isPlaying) {
        audioElement.pause();
        setIsPlaying(false);
      } else {
        audioElement.play();
        setIsPlaying(true);
      }
    }
  };

  const handleDelete = () => {
    if (window.confirm(EN.guestMode.deleteConfirm)) {
      deleteGuestDiary(diary.id);
      toast.success(EN.guestMode.deleted);
    }
  };

  const getLanguageScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Calculate remaining time
  const expiresAt = new Date(diary.expires_at);
  const now = new Date();
  const remainingMinutes = Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 60000));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow"
    >
      {/* Expiration warning */}
      {remainingMinutes <= 5 && remainingMinutes > 0 && (
        <div className="bg-orange-50 border-b border-orange-200 px-4 py-2 rounded-t-xl">
          <div className="flex items-center gap-2 text-orange-700">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm font-medium">
              {EN.guestMode.expiresIn} {remainingMinutes} {EN.guestMode.minutes}
            </span>
          </div>
        </div>
      )}

      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className={`text-sm font-medium ${getLanguageScoreColor(diary.language_score)}`}>
                {EN.guestMode.healthScore}: {diary.language_score}
              </span>
              <div className="flex items-center gap-1 text-gray-500">
                <Clock className="w-4 h-4" />
                <span className="text-xs">
                  {remainingMinutes > 0 ? `${remainingMinutes} ${EN.guestMode.minutes}` : EN.guestMode.expired}
                </span>
              </div>
            </div>
            <p className="text-sm text-gray-500">
              {format(new Date(diary.created_at), 'MMM d, yyyy HH:mm', { locale: enUS })}
            </p>
          </div>
          <button
            onClick={handleDelete}
            className="p-2 text-gray-400 hover:text-red-600 transition-colors"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>

        <h3 className="text-lg font-semibold text-gray-800 mb-3">
          {diary.title}
        </h3>

        <p className="text-gray-700 whitespace-pre-wrap mb-4">
          {diary.content}
        </p>

        {diary.ai_summary && (
          <div className="bg-blue-50 rounded-lg p-4 mb-4">
            <p className="text-sm font-medium text-blue-900 mb-1">{EN.guestMode.aiSummary}</p>
            <p className="text-sm text-blue-800">{diary.ai_summary}</p>
          </div>
        )}

        {diary.voice_data && (
          <button
            onClick={handlePlayPause}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            {isPlaying ? (
              <>
                <Pause className="w-5 h-5 text-gray-700" />
                <span className="text-gray-700">{EN.guestMode.stop}</span>
              </>
            ) : (
              <>
                <Play className="w-5 h-5 text-gray-700" />
                <span className="text-gray-700">{EN.guestMode.playAudio}</span>
              </>
            )}
          </button>
        )}

        {/* Guest mode notice */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-500 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {EN.guestMode.banner} - {EN.guestMode.autoDelete}
          </p>
        </div>
      </div>
    </motion.div>
  );
};
