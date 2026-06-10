-- Migration: create_pitch_attempts
-- Immutable per-user log of pitch-accent scoring attempts. This is the data
-- foundation of the Pitch Karte (per-pattern diagnosis, personal drill queue,
-- progress history). Scoring runs fully client-side, so authenticated clients
-- insert their own rows directly (same model as usage_tracking in 010).

CREATE TABLE IF NOT EXISTS public.pitch_attempts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  word TEXT NOT NULL,
  reading TEXT NOT NULL,
  pattern_name TEXT,                       -- 平板 / 頭高 / 中高 / 尾高
  target_nucleus SMALLINT NOT NULL,        -- expected drop position (0 = heiban)
  detected_nucleus SMALLINT NOT NULL,      -- what the user actually produced
  accuracy SMALLINT NOT NULL CHECK (accuracy BETWEEN 0 AND 100),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pitch_attempts_user_id
  ON public.pitch_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_pitch_attempts_user_created
  ON public.pitch_attempts(user_id, created_at DESC);

ALTER TABLE public.pitch_attempts ENABLE ROW LEVEL SECURITY;

-- Owners read and append their own attempts; the log is immutable (no UPDATE
-- or DELETE policies).
CREATE POLICY "Users can view own pitch attempts" ON public.pitch_attempts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own pitch attempts" ON public.pitch_attempts
  FOR INSERT WITH CHECK (auth.uid() = user_id);
