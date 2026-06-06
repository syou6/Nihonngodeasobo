import { supabase } from './supabase';

export interface FeedbackInput {
  rating?: number;       // 1-5
  comment?: string;
  context?: string;      // e.g. 'post-ai-feedback'
}

/**
 * Submit user feedback via the submit-feedback Edge Function (saves to DB and
 * fires a Telegram notification server-side). Works for guests and logged-in users.
 */
export async function submitFeedback(input: FeedbackInput): Promise<void> {
  if (!input.rating && !input.comment?.trim()) {
    throw new Error('Please add a rating or a comment.');
  }

  const { error } = await supabase.functions.invoke('submit-feedback', {
    body: {
      rating: input.rating,
      comment: input.comment?.trim() || undefined,
      context: input.context,
      appVersion: import.meta.env.VITE_APP_VERSION ?? undefined,
    },
  });

  if (error) {
    throw new Error(error.message || 'Failed to send feedback.');
  }
}
