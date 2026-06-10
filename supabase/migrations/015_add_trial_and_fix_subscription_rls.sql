-- Migration: add reverse-trial support + fix a subscriptions RLS leak.
--
-- SECURITY FIX: 010 created `FOR ALL USING (true) WITH CHECK (true)` so the
-- service role could manage rows. With RLS, a permissive policy with no role
-- restriction also applies to anon/authenticated — meaning ANY caller could
-- SELECT every subscription row (Stripe customer/subscription ids included).
-- Restrict that policy to the service_role; owner SELECT stays via the other
-- policy. (service_role bypasses RLS anyway, so this only removes the leak.)

DROP POLICY IF EXISTS "Service role can manage subscriptions" ON public.subscriptions;
CREATE POLICY "Service role can manage subscriptions" ON public.subscriptions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Reverse trial: 14 days of full Premium starting when the user first opens
-- their Karte (set from the client / signup path). NULL = never trialed.
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;

-- Premium = active paid subscription OR an unexpired trial.
CREATE OR REPLACE FUNCTION public.is_premium(check_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions s
    WHERE s.user_id = check_user_id
      AND (
        (s.plan_id = 'premium' AND s.status = 'active'
          AND (s.current_period_end IS NULL OR s.current_period_end > now()))
        OR (s.trial_ends_at IS NOT NULL AND s.trial_ends_at > now())
      )
  );
$$;
