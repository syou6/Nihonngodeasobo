-- Fix: One-directional diary viewing (teacher -> student only)
-- Run this in Supabase Dashboard SQL Editor

-- 1. Drop and recreate diary viewing policy (teacher can see student diaries, not vice versa)
DROP POLICY IF EXISTS "Users can view family diaries" ON public.diaries;
CREATE POLICY "Users can view family diaries" ON public.diaries
  FOR SELECT USING (
    deleted_at IS NULL AND visibility = 'family' AND
    EXISTS (
      SELECT 1 FROM public.family_relationships
      WHERE status = 'accepted' AND
        parent_id = auth.uid() AND child_id = user_id
    )
  );

-- 2. Drop and recreate comments viewing policy (same one-directional rule)
DROP POLICY IF EXISTS "Users can view comments" ON public.comments;
CREATE POLICY "Users can view comments" ON public.comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.diaries d
      WHERE d.id = diary_id AND (
        d.user_id = auth.uid() OR
        (d.visibility = 'family' AND EXISTS (
          SELECT 1 FROM public.family_relationships
          WHERE status = 'accepted' AND
            parent_id = auth.uid() AND child_id = d.user_id
        ))
      )
    )
  );

-- 3. Add last_viewed_at column for unread tracking
ALTER TABLE public.family_relationships
  ADD COLUMN IF NOT EXISTS last_viewed_at TIMESTAMP WITH TIME ZONE;

-- 4. Add RPC function to update last_viewed_at (only parent can call)
CREATE OR REPLACE FUNCTION public.update_last_viewed(relationship_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.family_relationships
  SET last_viewed_at = NOW()
  WHERE id = relationship_id AND parent_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
