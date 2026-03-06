-- Final Robust fix for story_interactions RLS
DROP POLICY IF EXISTS "Allow members to view story interactions" ON public.story_interactions;
DROP POLICY IF EXISTS "Allow members to insert story interactions" ON public.story_interactions;

-- 1. Simple View Policy
CREATE POLICY "Allow members to view story interactions" ON public.story_interactions
    FOR SELECT
    USING (
        story_id IN (
            SELECT s.id FROM public.stories s
            JOIN public.project_members pm ON s.project_id = pm.project_id
            WHERE pm.user_id = auth.uid()
        )
    );

-- 2. Simple Insert Policy
CREATE POLICY "Allow members to insert story interactions" ON public.story_interactions
    FOR INSERT
    WITH CHECK (
        auth.uid() = user_id AND 
        story_id IN (
            SELECT s.id FROM public.stories s
            JOIN public.project_members pm ON s.project_id = pm.project_id
            WHERE pm.user_id = auth.uid()
        )
    );
