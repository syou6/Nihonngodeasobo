import React, { useState, useEffect, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../ui/Button';
import { StandardDialog } from '../ui/StandardDialog';
import { UpgradePrompt } from '../subscription/UpgradePrompt';

// FeedbackCard pulls in react-markdown + remark-gfm (heavy). Load it only when a
// learner actually opens their AI feedback, keeping the diary list bundle small.
const FeedbackCard = lazy(() =>
  import('../feedback/FeedbackCard').then((m) => ({ default: m.FeedbackCard }))
);
import { useAuthStore } from '../../stores/authStore';
import { useDiaryStore } from '../../stores/diaryStore';
import { useFeedbackPromptStore } from '../../stores/feedbackPromptStore';
import { trackEvent } from '../../lib/analytics';
import { useSubscription } from '../../hooks/useSubscription';
import { supabase } from '../../lib/supabase';
import { commentLimiter } from '../../lib/rate-limiter';
import type { DiaryEntry } from '../../types';
import {
  Play,
  Pause,
  MessageCircle,
  Calendar,
  Volume2,
  Trash2,
  Brain,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { format } from 'date-fns';
import { enUS } from 'date-fns/locale';
import toast from 'react-hot-toast';

interface DiaryCardProps {
  entry: DiaryEntry;
}

export const DiaryCard: React.FC<DiaryCardProps> = ({ entry }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showFullContent, setShowFullContent] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const requestFeedbackPrompt = useFeedbackPromptStore((s) => s.request);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [newComment, setNewComment] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);

  // Post-experience: a few seconds after the learner opens their AI feedback,
  // ask how it was (gated to once per 7 days by the store).
  useEffect(() => {
    if (!showFeedback) return;
    trackEvent('ai_feedback_viewed');
    const t = setTimeout(() => requestFeedbackPrompt('post-ai-feedback'), 6000);
    return () => clearTimeout(t);
  }, [showFeedback, requestFeedbackPrompt]);

  const { user } = useAuthStore();
  const { deleteEntry, fetchEntries } = useDiaryStore();
  const { isPremium } = useSubscription();
  const isOwner = user?.id === entry.user_id;

  const handleUpgrade = () => {
    window.location.href = '/subscription';
  };

  useEffect(() => {
    return () => {
      if (audioElement) {
        audioElement.pause();
        audioElement.src = '';
        setAudioElement(null);
      }
    };
  }, [audioElement]);

  const handlePlayPause = async () => {
    if (!entry.voice_url) return;

    if (isPlaying && audioElement) {
      audioElement.pause();
      setIsPlaying(false);
      return;
    }

    if (!audioElement) {
      setIsLoadingAudio(true);
      try {
        const audio = new Audio();
        audio.preload = 'none';
        audio.src = entry.voice_url;

        await new Promise((resolve, reject) => {
          audio.oncanplaythrough = resolve;
          audio.onerror = reject;
          audio.onended = () => {
            setIsPlaying(false);
          };
          audio.load();
        });

        setAudioElement(audio);
        await audio.play();
        setIsPlaying(true);
      } catch (error) {
        toast.error('Failed to play audio');
      } finally {
        setIsLoadingAudio(false);
      }
    } else {
      audioElement.play();
      setIsPlaying(true);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteEntry(entry.id);
      toast.success('Diary moved to trash (kept for 30 days)');
      setShowDeleteConfirm(false);
    } catch (error) {
      toast.error('Failed to delete');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim()) return;

    if (!commentLimiter.canProceed()) {
      const cooldown = Math.ceil(commentLimiter.getRemainingCooldown() / 1000);
      toast.error(`Too many comments. Please try again in ${cooldown}s.`);
      return;
    }

    setIsSubmittingComment(true);
    try {
      const { error } = await supabase
        .from('comments')
        .insert({
          diary_id: entry.id,
          user_id: user?.id,
          content: newComment.trim()
        });

      if (error) throw error;

      commentLimiter.recordAction();

      // Send notification to diary owner (if not self)
      if (!isOwner) {
        try {
          const { data: userData } = await supabase
            .from('users')
            .select('name')
            .eq('id', user?.id)
            .single();

          if (userData?.name) {
            await supabase.functions.invoke('send-push-notification', {
              body: {
                userId: entry.user_id,
                title: 'New comment on your diary',
                body: `${userData.name} commented on your diary`,
                type: 'new_comment',
                data: {
                  url: `https://journal-ai.cloud/diary#${entry.id}`
                }
              }
            });
          }
        } catch { /* ignored */ }
      }

      toast.success('Comment posted');
      setNewComment('');
      await fetchEntries();
    } catch (error) {
      toast.error('Failed to post comment');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const getEmotionEmoji = (emotion: string) => {
    const emotionMap: { [key: string]: string } = {
      'happy': '😊',
      'excited': '😄',
      'sad': '😢',
      'anxious': '😰',
      'calm': '😌',
      'angry': '😤',
      'satisfied': '😇',
      'grateful': '🙏',
      'love': '❤️',
      // Japanese emotion mappings (for backward compatibility)
      '喜び': '😊',
      '楽しい': '😄',
      '悲しみ': '😢',
      '不安': '😰',
      '平穏': '😌',
      '怒り': '😤',
      '満足': '😇',
      '感謝': '🙏',
      '愛情': '❤️'
    };
    return emotionMap[emotion] || '😌';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border-3 border-navy-900 overflow-hidden"
    >
      {/* Header */}
      <div className="p-4 sm:p-6 border-b border-gray-100">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-full flex items-center justify-center text-sm sm:text-base">
              {entry.user?.name?.[0] || '👤'}
            </div>
            <div className="flex-1">
              <h3 className="text-lg sm:text-xl font-bold text-gray-900">
                {entry.user?.name || 'User'}
              </h3>
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-gray-500">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="text-sm sm:text-lg">
                    {format(new Date(entry.created_at), 'MMM d, HH:mm', { locale: enUS })}
                  </span>
                </div>
                {entry.emotion && (
                  <div className="flex items-center gap-1">
                    <span className="text-lg sm:text-xl">{getEmotionEmoji(entry.emotion)}</span>
                    <span className="text-sm sm:text-lg hidden sm:inline">{entry.emotion}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {isOwner && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isDeleting}
            >
              <Trash2 className="w-5 h-5 text-red-500" />
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 sm:p-6">
        {/* AI Summary */}
        {entry.ai_summary && (
          <div className="mb-4 p-3 sm:p-4 bg-blue-50 rounded-xl">
            <div className="text-base sm:text-lg font-medium text-blue-900 mb-1 sm:mb-2">
              📋 AI Summary
            </div>
            <p className="text-sm sm:text-lg text-blue-800">
              {entry.ai_summary}
            </p>
          </div>
        )}

        {/* Voice Player */}
        {entry.voice_url && (
          <div className="mb-6 p-4 bg-gray-50 rounded-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button
                  onClick={handlePlayPause}
                  variant="outline"
                  size="sm"
                  disabled={isLoadingAudio}
                >
                  {isLoadingAudio ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-5 h-5 border-2 border-gray-600 border-t-transparent rounded-full"
                      />
                      Loading
                    </>
                  ) : isPlaying ? (
                    <>
                      <Pause className="w-5 h-5" />
                      Pause
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5" />
                      Play
                    </>
                  )}
                </Button>
                <div className="flex items-center gap-2 text-gray-600">
                  <Volume2 className="w-4 h-4" />
                  <span className="text-lg">Voice Diary</span>
                </div>
              </div>
              {entry.duration && (
                <div className="text-lg text-gray-500">
                  {Math.floor(entry.duration / 60)}:{(entry.duration % 60).toString().padStart(2, '0')}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Text Content */}
        <div className="prose prose-sm sm:prose-lg max-w-none">
          <p className="text-sm sm:text-base text-gray-800 leading-relaxed whitespace-pre-wrap">
            {showFullContent || entry.content.length <= 150
              ? entry.content
              : `${entry.content.substring(0, 150)}...`}
          </p>
          {entry.content.length > 150 && (
            <button
              onClick={() => setShowFullContent(!showFullContent)}
              className="mt-2 text-blue-600 hover:text-blue-700 font-medium text-sm sm:text-base transition-colors"
            >
              {showFullContent ? '▲ Show less' : '▼ Show more'}
            </button>
          )}
        </div>

        {/* Tags */}
        {entry.tags && entry.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {entry.tags.map(tag => (
              <span
                key={tag}
                className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* AI Feedback Toggle */}
        {entry.ai_feedback && (
          <div className="mt-4">
            <button
              onClick={() => setShowFeedback(!showFeedback)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-xl transition-colors w-full sm:w-auto"
            >
              <Brain className="w-5 h-5" />
              <span className="font-medium">AI Feedback</span>
              <span className="ml-2 px-2 py-0.5 bg-indigo-200 rounded-full text-sm">
                {entry.ai_feedback.jlptLevel} → {entry.ai_feedback.targetLevel}
              </span>
              {showFeedback ? (
                <ChevronUp className="w-4 h-4 ml-auto" />
              ) : (
                <ChevronDown className="w-4 h-4 ml-auto" />
              )}
            </button>

            <AnimatePresence>
              {showFeedback && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4"
                >
                  <Suspense fallback={<div className="h-24 animate-pulse bg-indigo-50 rounded-xl" />}>
                    <FeedbackCard feedback={entry.ai_feedback} />
                  </Suspense>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Upgrade prompt for free users who own this entry and have no AI feedback */}
        {isOwner && !entry.ai_feedback && !isPremium && (
          <div className="mt-4">
            <UpgradePrompt
              feature="AI feedback analyzes your Japanese diary and provides personalized corrections, vocabulary tips, and grammar suggestions."
              onUpgrade={handleUpgrade}
            />
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-100">
        <div className="flex items-center justify-around sm:justify-between">
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Comment button */}
            <button
              onClick={() => setShowComments(!showComments)}
              className="flex items-center gap-2 p-2 sm:px-4 sm:py-2 hover:bg-gray-50 rounded-lg transition-colors relative"
            >
              <MessageCircle className="w-6 h-6 sm:w-5 sm:h-5 text-gray-500" />
              {entry.comments && entry.comments.length > 0 && (
                <span className="absolute -top-1 -right-1 sm:static sm:absolute-none bg-blue-500 text-white text-xs sm:text-lg sm:bg-transparent sm:text-gray-700 rounded-full w-5 h-5 sm:w-auto sm:h-auto flex items-center justify-center sm:inline">
                  {entry.comments.length}
                </span>
              )}
              <span className="hidden sm:inline text-lg">
                Comments{entry.comments && entry.comments.length > 0 && ` ${entry.comments.length}`}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Comments Section */}
      <AnimatePresence>
        {showComments && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-gray-100 p-6 bg-gray-50"
          >
            <h4 className="text-xl font-bold text-gray-900 mb-4">
              Comments
            </h4>

            {/* Comment Form */}
            <div className="mb-6">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Leave a supportive comment..."
                className="w-full px-4 py-3 text-lg border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={3}
              />
              <div className="mt-3 flex justify-end">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSubmitComment}
                  disabled={isSubmittingComment || !newComment.trim()}
                >
                  {isSubmittingComment ? 'Posting...' : 'Post Comment'}
                </Button>
              </div>
            </div>

            {/* Comments List */}
            <div className="space-y-4">
              {entry.comments && entry.comments.length > 0 ? (
                entry.comments.map(comment => (
                  <div key={comment.id} className="bg-white rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        {comment.user?.name?.[0] || '👤'}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-medium text-gray-900">
                            {comment.user?.name || 'User'}
                          </span>
                          <span className="text-gray-500 text-sm">
                            {format(new Date(comment.created_at), 'MMM d, HH:mm', { locale: enUS })}
                          </span>
                        </div>
                        <p className="text-gray-800">
                          {comment.content}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No comments yet
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Dialog */}
      <StandardDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete this diary?"
        confirmLabel="Move to Trash"
        cancelLabel="Cancel"
        confirmVariant="danger"
        isLoading={isDeleting}
      >
        <p className="text-lg text-black">
          This diary will be moved to trash and can be restored for 30 days. Other diaries won't be affected.
        </p>
      </StandardDialog>
    </motion.div>
  );
};
