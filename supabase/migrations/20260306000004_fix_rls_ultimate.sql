-- 1. Make the helper function more robust by including project owners
CREATE OR REPLACE FUNCTION public.check_is_project_member(p_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_id = p_id AND user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = p_id AND owner_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Ensure stories table RLS is also robust (in case owners were missing here)
DROP POLICY IF EXISTS "Manage project stories" ON public.stories;
CREATE POLICY "Manage project stories" ON public.stories
    FOR ALL USING (public.check_is_project_member(project_id));

-- 3. Final robust fix for story_interactions RLS
DROP POLICY IF EXISTS "Allow members to view story interactions" ON public.story_interactions;
DROP POLICY IF EXISTS "Allow members to insert story interactions" ON public.story_interactions;
DROP POLICY IF EXISTS "Allow users to delete their own interactions" ON public.story_interactions;

-- View Policy: Must be a project member/owner
CREATE POLICY "Allow members to view story interactions" ON public.story_interactions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.stories s
            WHERE s.id = public.story_interactions.story_id
            AND public.check_is_project_member(s.project_id)
        )
    );

-- Insert Policy: Must be a project member/owner AND inserting for self
CREATE POLICY "Allow members to insert story interactions" ON public.story_interactions
    FOR INSERT
    WITH CHECK (
        auth.uid() = user_id AND 
        EXISTS (
            SELECT 1 FROM public.stories s
            WHERE s.id = story_id
            AND public.check_is_project_member(s.project_id)
        )
    );

-- Delete Policy: Only own interactions
CREATE POLICY "Allow users to delete their own interactions" ON public.story_interactions
    FOR DELETE
    USING (user_id = auth.uid());
