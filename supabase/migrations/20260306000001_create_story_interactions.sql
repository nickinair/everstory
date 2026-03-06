-- Create story_interactions table
CREATE TABLE IF NOT EXISTS public.story_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('like', 'reaction')),
    content TEXT, -- Store the label/emoji text
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.story_interactions ENABLE ROW LEVEL SECURITY;

-- Policies
-- 1. Allow project members to view interactions
CREATE POLICY "Allow members to view story interactions" ON public.story_interactions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.stories s
            JOIN public.project_members pm ON s.project_id = pm.project_id
            WHERE s.id = story_interactions.story_id AND pm.user_id = auth.uid()
        )
    );

-- 2. Allow project members to insert interactions
CREATE POLICY "Allow members to insert story interactions" ON public.story_interactions
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.stories s
            JOIN public.project_members pm ON s.project_id = pm.project_id
            WHERE s.id = story_id AND pm.user_id = auth.uid()
        )
    );

-- 3. Allow users to delete their own interactions
CREATE POLICY "Allow users to delete their own interactions" ON public.story_interactions
    FOR DELETE
    USING (user_id = auth.uid());

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_story_interactions_story_id ON public.story_interactions(story_id);
