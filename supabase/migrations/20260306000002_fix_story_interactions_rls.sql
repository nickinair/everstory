-- Fix story_interactions RLS policies
DROP POLICY IF EXISTS "Allow members to view story interactions" ON public.story_interactions;
DROP POLICY IF EXISTS "Allow members to insert story interactions" ON public.story_interactions;

-- 1. Explicit Select Policy
CREATE POLICY "Allow members to view story interactions" ON public.story_interactions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.stories
            WHERE public.stories.id = public.story_interactions.story_id
            AND EXISTS (
                SELECT 1 FROM public.project_members
                WHERE public.project_members.project_id = public.stories.project_id
                AND public.project_members.user_id = auth.uid()
            )
        )
    );

-- 2. Explicit Insert Policy
CREATE POLICY "Allow members to insert story interactions" ON public.story_interactions
    FOR INSERT
    WITH CHECK (
        auth.uid() = user_id AND
        EXISTS (
            SELECT 1 FROM public.stories
            WHERE public.stories.id = public.story_interactions.story_id
            AND EXISTS (
                SELECT 1 FROM public.project_members
                WHERE public.project_members.project_id = public.stories.project_id
                AND public.project_members.user_id = auth.uid()
            )
        )
    );
