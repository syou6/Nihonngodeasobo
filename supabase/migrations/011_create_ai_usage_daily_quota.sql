-- Migration: create_ai_usage_daily_quota
-- Adds a per-user daily AI quota to protect the Gemini API from abuse/cost overrun.
-- The gemini-ai Edge Function calls check_and_increment_ai_usage() (service role)
-- before every Gemini call so an authenticated user cannot exceed their daily cap.

-- 1. Per-user / per-day AI call counter
CREATE TABLE IF NOT EXISTS public.ai_usage_daily (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
  count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, usage_date)
);

ALTER TABLE public.ai_usage_daily ENABLE ROW LEVEL SECURITY;

-- Users may read their own usage; writes only happen via the SECURITY DEFINER
-- function below (invoked by the Edge Function with the service role key).
CREATE POLICY "Users can view own ai usage" ON public.ai_usage_daily
  FOR SELECT USING (auth.uid() = user_id);

-- 2. Atomic check-and-increment. Returns { allowed, count, limit }.
--    The conditional UPDATE ... WHERE count < limit makes the limit check and the
--    increment a single atomic statement, so concurrent requests cannot race past
--    the cap.
CREATE OR REPLACE FUNCTION public.check_and_increment_ai_usage(
  p_user_id UUID,
  p_limit INT
)
RETURNS JSONB AS $$
DECLARE
  v_count INT;
BEGIN
  INSERT INTO public.ai_usage_daily AS u (user_id, usage_date, count)
  VALUES (p_user_id, CURRENT_DATE, 1)
  ON CONFLICT (user_id, usage_date)
  DO UPDATE SET count = u.count + 1, updated_at = now()
  WHERE u.count < p_limit
  RETURNING u.count INTO v_count;

  IF v_count IS NULL THEN
    -- Limit reached: the conditional UPDATE matched no row. Read current value.
    SELECT count INTO v_count
    FROM public.ai_usage_daily
    WHERE user_id = p_user_id AND usage_date = CURRENT_DATE;

    RETURN jsonb_build_object('allowed', false, 'count', COALESCE(v_count, 0), 'limit', p_limit);
  END IF;

  RETURN jsonb_build_object('allowed', true, 'count', v_count, 'limit', p_limit);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Only the service role should execute this (the Edge Function). Revoke from clients.
REVOKE ALL ON FUNCTION public.check_and_increment_ai_usage(UUID, INT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.check_and_increment_ai_usage(UUID, INT) FROM anon;
REVOKE ALL ON FUNCTION public.check_and_increment_ai_usage(UUID, INT) FROM authenticated;
