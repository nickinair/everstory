-- Drop existing policy if it exists to replace it
DROP POLICY IF EXISTS "Users can join projects if invited" ON project_members;

-- Improved policy that handles phone normalization (stripping +86 and non-digits)
CREATE POLICY "Users can join projects if invited" ON project_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_invitations
      WHERE project_invitations.project_id = project_members.project_id
      AND (
        -- Simple email match
        LOWER(project_invitations.email) = LOWER((SELECT email FROM profiles WHERE id = auth.uid()))
        OR 
        -- Normalized phone match
        regexp_replace(project_invitations.phone, '[^0-9]', '', 'g') = regexp_replace((SELECT phone FROM profiles WHERE id = auth.uid()), '[^0-9]', '', 'g')
        OR
        -- Handle case where one has +86 and other doesn't
        regexp_replace(project_invitations.phone, '^86', '') = regexp_replace(regexp_replace((SELECT phone FROM profiles WHERE id = auth.uid()), '[^0-9]', '', 'g'), '^86', '')
      )
    )
    OR
    -- Owners can always add themselves
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_members.project_id
      AND projects.owner_id = auth.uid()
    )
  );
