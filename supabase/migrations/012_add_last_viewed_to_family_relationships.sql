-- Migration: add_last_viewed_to_family_relationships
-- The teacher dashboard (DiaryList.tsx) selects family_relationships.last_viewed_at
-- and calls the update_last_viewed() RPC to drive per-student unread badges, but
-- neither the column nor the function existed — so the SELECT returned HTTP 400 and
-- the teacher's student list failed to load. This adds both.

-- 1. Column: when the teacher last opened this student's diaries.
ALTER TABLE public.family_relationships
  ADD COLUMN IF NOT EXISTS last_viewed_at TIMESTAMPTZ;

-- 2. RPC: mark a relationship as viewed now. Guarded so only the owning teacher
--    can update their own relationship, regardless of SECURITY DEFINER.
CREATE OR REPLACE FUNCTION public.update_last_viewed(relationship_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.family_relationships
  SET last_viewed_at = now(),
      updated_at = now()
  WHERE id = relationship_id
    AND teacher_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
