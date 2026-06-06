import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useFeedbackPromptStore } from '../../stores/feedbackPromptStore';
import { submitFeedback } from '../../lib/feedback-api';
import { trackEvent } from '../../lib/analytics';

const FACES: { value: number; emoji: string; label: string }[] = [
  { value: 1, emoji: '😞', label: 'Bad' },
  { value: 2, emoji: '😕', label: 'Meh' },
  { value: 3, emoji: '😐', label: 'Okay' },
  { value: 4, emoji: '🙂', label: 'Good' },
  { value: 5, emoji: '😍', label: 'Love it' },
];

export const FeedbackPrompt: React.FC = () => {
  const { isOpen, context, close, markSubmitted } = useFeedbackPromptStore();
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!rating && !comment.trim()) {
      toast.error('Pick a rating or leave a comment 🙏');
      return;
    }
    setSubmitting(true);
    try {
      await submitFeedback({ rating: rating ?? undefined, comment, context });
      trackEvent('feedback_submitted', { rating: rating ?? undefined });
      markSubmitted();
      toast.success('Thanks for the feedback! 🍣');
    } catch {
      toast.error('Could not send feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/40 p-4"
          onClick={close}
        >
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl relative"
          >
            <button
              onClick={close}
              aria-label="Close"
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-bold text-gray-900 mb-1">How was that?</h3>
            <p className="text-sm text-gray-500 mb-5">
              Your feedback helps us make NihonGo better.
            </p>

            <div className="flex justify-between mb-5">
              {FACES.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setRating(f.value)}
                  aria-label={f.label}
                  className={`flex flex-col items-center gap-1 px-2 py-1 rounded-xl transition-all ${
                    rating === f.value ? 'bg-brand-50 scale-110' : 'hover:bg-gray-50'
                  }`}
                >
                  <span className="text-3xl">{f.emoji}</span>
                  <span className={`text-xs ${rating === f.value ? 'text-brand-600 font-semibold' : 'text-gray-400'}`}>
                    {f.label}
                  </span>
                </button>
              ))}
            </div>

            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Anything we should know? (optional)"
              rows={3}
              maxLength={2000}
              className="w-full rounded-xl border border-gray-200 p-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none mb-4"
            />

            <div className="flex gap-3">
              <button
                onClick={close}
                className="flex-1 py-3 rounded-xl text-gray-600 font-medium hover:bg-gray-50 transition-colors"
              >
                Not now
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 py-3 rounded-xl bg-brand-600 text-white font-bold hover:bg-brand-700 transition-colors disabled:opacity-60"
              >
                {submitting ? 'Sending…' : 'Send'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
