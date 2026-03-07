import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Play, Pause, Calendar, Award, MessageSquare, Mic } from 'lucide-react';
import { Button } from '../ui/Button';
import { useVersantStore, type VersantAnswer } from '../../stores/versantStore';
import { getQuestionById } from '../../lib/versant-questions';
import { format } from 'date-fns';
import { enUS } from 'date-fns/locale';

interface TestHistoryProps {
  onBack: () => void;
}

export const TestHistory: React.FC<TestHistoryProps> = ({ onBack }) => {
  const { answers, fetchHistory, loading } = useVersantStore();
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  const handlePlayPause = (answer: VersantAnswer) => {
    if (!answer.audioUrl) return;

    if (playingId === answer.id && audioElement) {
      audioElement.pause();
      setPlayingId(null);
    } else {
      if (audioElement) {
        audioElement.pause();
      }
      const audio = new Audio(answer.audioUrl);
      audio.onended = () => setPlayingId(null);
      setAudioElement(audio);
      audio.play();
      setPlayingId(answer.id);
    }
  };

  const getJlptColor = (level?: string) => {
    if (!level) return 'bg-gray-100 text-gray-700';
    const colors: Record<string, string> = {
      'N5': 'bg-gray-100 text-gray-700',
      'N4': 'bg-blue-100 text-blue-700',
      'N3': 'bg-green-100 text-green-700',
      'N2': 'bg-yellow-100 text-yellow-700',
      'N1': 'bg-purple-100 text-purple-700',
    };
    return colors[level] || 'bg-gray-100 text-gray-700';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Practice History</h1>
          <p className="text-gray-600">Review your past practice sessions</p>
        </div>
      </div>

      {answers.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-16 bg-gray-50 rounded-2xl"
        >
          <Award className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">No practice history yet</h3>
          <p className="text-gray-600 mb-6">Start practicing to see your progress here!</p>
          <Button onClick={onBack} variant="primary">
            Start Practicing
          </Button>
        </motion.div>
      ) : (
        <div className="space-y-4">
          {answers.map((answer, index) => {
            const question = getQuestionById(answer.questionId);

            return (
              <motion.div
                key={answer.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      answer.part === 'E'
                        ? 'bg-blue-100'
                        : 'bg-purple-100'
                    }`}>
                      {answer.part === 'E' ? (
                        <MessageSquare className={`w-5 h-5 ${answer.part === 'E' ? 'text-blue-600' : 'text-purple-600'}`} />
                      ) : (
                        <Mic className="w-5 h-5 text-purple-600" />
                      )}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">
                        Part {answer.part}: {answer.part === 'E' ? 'Summary' : 'Opinion'}
                      </div>
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(answer.createdAt), 'MMM d, yyyy HH:mm', { locale: enUS })}
                      </div>
                    </div>
                  </div>

                  {/* Score badge */}
                  {answer.feedback && (
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-full text-sm font-bold ${getJlptColor(answer.feedback.jlptLevel)}`}>
                        {answer.feedback.jlptLevel}
                      </span>
                      <span className="px-2 py-1 bg-gray-100 rounded-full text-sm font-bold text-gray-700">
                        {answer.feedback.score}
                      </span>
                    </div>
                  )}
                </div>

                {/* Question */}
                {question && (
                  <div className="bg-gray-50 rounded-lg p-3 mb-4">
                    <p className="text-sm text-gray-500 mb-1">Question:</p>
                    <p className="text-gray-700 text-sm line-clamp-2">{question.text}</p>
                  </div>
                )}

                {/* Response */}
                <div className="mb-4">
                  <p className="text-sm text-gray-500 mb-1">Your response:</p>
                  <p className="text-gray-800 line-clamp-3">
                    {answer.transcribedText || '(No speech detected)'}
                  </p>
                </div>

                {/* Play button */}
                {answer.audioUrl && (
                  <Button
                    onClick={() => handlePlayPause(answer)}
                    variant="outline"
                    size="sm"
                  >
                    {playingId === answer.id ? (
                      <>
                        <Pause className="w-4 h-4 mr-1" />
                        Pause
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-1" />
                        Play
                      </>
                    )}
                  </Button>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};
