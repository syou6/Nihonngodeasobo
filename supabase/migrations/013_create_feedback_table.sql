-- Migration: create_feedback_table
-- Stores in-app user feedback (post-experience prompt). Writes go through the
-- submit-feedback Edge Function (service role) so guests can submit too and the
-- Telegram notification token stays server-side.

CREATE TABLE IF NOT EXISTS public.feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  rating SMALLINT CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  context TEXT,                 -- where it was triggered, e.g. 'post-ai-feedback'
  app_version TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON public.feedback(created_at DESC);

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- Users may read their own feedback; no client-side insert (the Edge Function
-- uses the service role, which bypasses RLS).
CREATE POLICY "Users can view own feedback" ON public.feedback
  FOR SELECT USING (auth.uid() = user_id);
