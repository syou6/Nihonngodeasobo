-- Migration: start_trial RPC
-- Lets a signed-in user start their own 14-day reverse trial WITHOUT a client
-- write to subscriptions (which RLS now restricts to service_role). The function
-- runs as definer but only ever acts on auth.uid(), and only grants a trial once
-- (never if a trial was already given or the user is already paid). It cannot be
-- used to set plan_id/status, so a user can't self-upgrade to premium.

CREATE OR REPLACE FUNCTION public.start_trial()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  existing public.subscriptions%ROWTYPE;
BEGIN
  IF uid IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT * INTO existing FROM public.subscriptions WHERE user_id = uid LIMIT 1;

  -- Already trialed (even if expired) or already paying → no new trial.
  IF existing.trial_ends_at IS NOT NULL THEN
    RETURN FALSE;
  END IF;
  IF existing.plan_id = 'premium' AND existing.status = 'active' THEN
    RETURN FALSE;
  END IF;

  IF existing.id IS NOT NULL THEN
    UPDATE public.subscriptions
      SET trial_ends_at = now() + interval '14 days', updated_at = now()
      WHERE id = existing.id;
  ELSE
    INSERT INTO public.subscriptions (user_id, plan_id, status, trial_ends_at)
      VALUES (uid, 'free', 'inactive', now() + interval '14 days');
  END IF;

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.start_trial() TO authenticated;
