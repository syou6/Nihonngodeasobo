-- Per-user pitch-accent practice progress, so mastery follows the learner
-- across devices. One row per (user, word); `best` is the highest accuracy seen.
CREATE TABLE IF NOT EXISTS public.pitch_progress (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  word TEXT NOT NULL,
  best INTEGER NOT NULL DEFAULT 0 CHECK (best >= 0 AND best <= 100),
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, word)
);

CREATE INDEX IF NOT EXISTS idx_pitch_progress_user_id ON public.pitch_progress(user_id);

ALTER TABLE public.pitch_progress ENABLE ROW LEVEL SECURITY;

-- A user may read and write only their own progress.
DROP POLICY IF EXISTS "Users can view own pitch progress" ON public.pitch_progress;
CREATE POLICY "Users can view own pitch progress" ON public.pitch_progress
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own pitch progress" ON public.pitch_progress;
CREATE POLICY "Users can insert own pitch progress" ON public.pitch_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own pitch progress" ON public.pitch_progress;
CREATE POLICY "Users can update own pitch progress" ON public.pitch_progress
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
