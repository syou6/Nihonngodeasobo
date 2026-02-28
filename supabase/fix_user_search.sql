-- =====================================================
-- Fix: Allow searching users by email for family invite
-- =====================================================
-- Run this in Supabase SQL Editor

-- 1. Function to search user by email (bypasses RLS safely)
-- Only returns id, name, email - no sensitive data
CREATE OR REPLACE FUNCTION public.search_user_by_email(search_email TEXT)
RETURNS TABLE(id UUID, name TEXT, email TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT u.id, u.name, u.email
  FROM public.users u
  WHERE u.email = search_email
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Allow users to view family members' profiles
-- (needed for family_relationships joins to show names/emails)
CREATE POLICY "Users can view family members" ON public.users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.family_relationships
      WHERE status = 'accepted' AND (
        (parent_id = auth.uid() AND child_id = id) OR
        (child_id = auth.uid() AND parent_id = id)
      )
    )
  );
