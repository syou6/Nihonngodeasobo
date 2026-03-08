import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useGuestStore } from '../../stores/guestStore';
import { Play, Pause, Trash2, AlertCircle, LogIn, Crown, Zap, Mic, Calendar, MessageCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { format } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { EN } from '../../i18n/en';
import toast from 'react-hot-toast';

export const GuestDiaryList: React.FC = () => {
  const { diaries, deleteGuestDiary, getRemainingTries, canCreateMore, setGuestMode } = useGuestStore();
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [audioElements, setAudioElements] = useState<{ [key: string]: HTMLAudioElement }>({});
  const remaining = getRemainingTries();

  const handlePlayPause = (diaryId: string, voiceData?: string) => {
    if (!voiceData) return;

    if (playingId === diaryId) {
      if (audioElements[diaryId]) {
        audioElements[diaryId].pause();
      }
      setPlayingId(null);
    } else {
      if (!audioElements[diaryId]) {
        const audio = new Audio(voiceData);
        audio.onended = () => setPlayingId(null);
        setAudioElements(prev => ({ ...prev, [diaryId]: audio }));
        audio.play();
      } else {
        audioElements[diaryId].play();
      }
      setPlayingId(diaryId);
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm(EN.guestMode.deleteConfirm)) {
      deleteGuestDiary(id);
      toast.success(EN.guestMode.deleted);
    }
  };

  const getLanguageScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (diaries.length === 0 && !canCreateMore()) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl shadow-lg p-8"
        >
          <div className="text-center mb-6">
            <AlertCircle className="w-16 h-16 text-orange-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              {EN.guestMode.limitReached}
            </h2>
            <p className="text-gray-600 mb-2">
              {EN.guestMode.limitMessage}
            </p>
            <p className="text-sm font-semibold text-brand-600">
              Sign up free — then get 50% OFF your first month of Premium!
            </p>
          </div>

          {/* Premium benefits */}
          <div className="mb-6 bg-gradient-to-br from-purple-50 to-brand-50 rounded-xl p-4 border border-purple-200">
            <div className="flex items-center gap-2 mb-3">
              <Crown className="w-5 h-5 text-amber-500" />
              <span className="font-bold text-gray-900">What you unlock with Premium:</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                { icon: Mic, label: 'Unlimited diary recordings' },
                { icon: Zap, label: 'Detailed AI grammar corrections' },
                { icon: Calendar, label: 'Diary entries kept forever' },
                { icon: MessageCircle, label: 'Teacher sharing & feedback' },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-2 text-sm text-gray-700">
                  <Icon className="w-4 h-4 text-brand-500 flex-shrink-0" />
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <Button
              onClick={() => {
                setGuestMode(false);
                window.location.reload();
              }}
              size="lg"
              className="w-full bg-gradient-to-r from-brand-500 to-purple-500 hover:from-brand-600 hover:to-purple-600"
            >
              <LogIn className="w-5 h-5" />
              {EN.guestMode.createAccount}
            </Button>
            <p className="text-center text-xs text-gray-500">Free to sign up · No credit card required</p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {diaries.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <p className="text-xl text-gray-600 mb-2">{EN.guestMode.noDiaries}</p>
          <p className="text-lg text-gray-500">
            {EN.guestMode.startRecording}
          </p>
          {remaining > 0 && (
            <p className="text-sm text-orange-600 mt-4">
              {EN.guestMode.banner}: {remaining} {EN.guestMode.remaining}
            </p>
          )}
        </motion.div>
      ) : (
        <>
          {remaining === 0 && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-r from-brand-50 to-purple-50 border border-brand-200 rounded-xl p-5 mb-6"
            >
              <div className="flex items-start gap-3 mb-4">
                <Crown className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-gray-900 font-bold">
                    {EN.guestMode.limitReached}
                  </p>
                  <p className="text-gray-600 text-sm mt-1">
                    {EN.guestMode.limitMessage}
                  </p>
                  <p className="text-brand-600 text-sm font-semibold mt-1">
                    Sign up free — then 50% OFF your first Premium month!
                  </p>
                </div>
              </div>
              <Button
                onClick={() => {
                  setGuestMode(false);
                  window.location.reload();
                }}
                size="sm"
                variant="primary"
                className="w-full bg-gradient-to-r from-brand-500 to-purple-500 hover:from-brand-600 hover:to-purple-600"
              >
                <LogIn className="w-4 h-4" />
                {EN.guestMode.createAccount}
              </Button>
            </motion.div>
          )}

          <div className="space-y-4">
            {diaries.map((diary, index) => (
              <motion.div
                key={diary.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`text-sm font-medium ${getLanguageScoreColor(diary.language_score)}`}>
                          {EN.guestMode.healthScore}: {diary.language_score}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">
                        {format(new Date(diary.created_at), 'MMM d, yyyy HH:mm', { locale: enUS })}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDelete(diary.id)}
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
                      onClick={() => handlePlayPause(diary.id, diary.voice_data)}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      {playingId === diary.id ? (
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
                </div>
              </motion.div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
