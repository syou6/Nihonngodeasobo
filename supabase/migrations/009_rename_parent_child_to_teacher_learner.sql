-- Rename parent/child columns to teacher/learner in family_relationships table
-- This migration must be applied BEFORE deploying the updated TypeScript code

-- Step 1: Rename columns
ALTER TABLE public.family_relationships RENAME COLUMN parent_id TO teacher_id;
ALTER TABLE public.family_relationships RENAME COLUMN child_id TO learner_id;

-- Step 2: Update default relationship type
ALTER TABLE public.family_relationships
  ALTER COLUMN relationship_type SET DEFAULT 'teacher-learner';

UPDATE public.family_relationships
  SET relationship_type = 'teacher-learner'
  WHERE relationship_type = 'parent-child';

-- Step 3: Update constraint
ALTER TABLE public.family_relationships DROP CONSTRAINT IF EXISTS different_users;
ALTER TABLE public.family_relationships
  ADD CONSTRAINT different_users CHECK (teacher_id != learner_id);

-- Step 4: Update unique constraint
ALTER TABLE public.family_relationships DROP CONSTRAINT IF EXISTS unique_family_relationship;
ALTER TABLE public.family_relationships
  ADD CONSTRAINT unique_family_relationship UNIQUE (teacher_id, learner_id);

-- Step 5: Recreate indexes
DROP INDEX IF EXISTS idx_family_relationships_parent_id;
DROP INDEX IF EXISTS idx_family_relationships_child_id;
CREATE INDEX IF NOT EXISTS idx_family_relationships_teacher_id ON public.family_relationships(teacher_id);
CREATE INDEX IF NOT EXISTS idx_family_relationships_learner_id ON public.family_relationships(learner_id);

-- Step 6: Update RLS policies
DROP POLICY IF EXISTS "Users can view their family relationships" ON public.family_relationships;
CREATE POLICY "Users can view their family relationships" ON public.family_relationships
  FOR SELECT USING (auth.uid() = teacher_id OR auth.uid() = learner_id);

DROP POLICY IF EXISTS "Users can create family relationships" ON public.family_relationships;
CREATE POLICY "Users can create family relationships" ON public.family_relationships
  FOR INSERT WITH CHECK (auth.uid() = teacher_id);

DROP POLICY IF EXISTS "Users can update family relationships" ON public.family_relationships;
CREATE POLICY "Users can update family relationships" ON public.family_relationships
  FOR UPDATE
  USING (auth.uid() = teacher_id OR auth.uid() = learner_id)
  WITH CHECK (auth.uid() = teacher_id OR auth.uid() = learner_id);

DROP POLICY IF EXISTS "Users can delete family relationships" ON public.family_relationships;
CREATE POLICY "Users can delete family relationships" ON public.family_relationships
  FOR DELETE USING (auth.uid() = teacher_id OR auth.uid() = learner_id);

-- Step 7: Update diary viewing policies that reference parent_id/child_id
DROP POLICY IF EXISTS "Users can view connected diaries" ON public.diaries;
CREATE POLICY "Users can view connected diaries" ON public.diaries
  FOR SELECT USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.family_relationships
      WHERE status = 'accepted'
      AND teacher_id = auth.uid()
      AND learner_id = diaries.user_id
    )
  );

-- Step 8: Update the delete_family_relationship function
CREATE OR REPLACE FUNCTION delete_family_relationship(relationship_id UUID)
RETURNS void AS $$
DECLARE
  v_user_id UUID;
  v_teacher_id UUID;
  v_learner_id UUID;
BEGIN
  v_user_id := auth.uid();

  SELECT teacher_id, learner_id INTO v_teacher_id, v_learner_id
  FROM public.family_relationships
  WHERE id = relationship_id;

  IF v_user_id = v_teacher_id OR v_user_id = v_learner_id THEN
    DELETE FROM public.family_relationships WHERE id = relationship_id;
  ELSE
    RAISE EXCEPTION 'Not authorized to delete this relationship';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 9: Update default role in users table
UPDATE public.users SET role = 'learner' WHERE role = 'parent';
