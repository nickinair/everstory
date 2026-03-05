-- Drop existing policy if it exists to replace it
DROP POLICY IF EXISTS "Users can view projects they are members of" ON projects;

-- Improved policy that also allows users with active invitations to view basic project details
CREATE POLICY "Users can view projects they are members of or invited to" ON projects 
  FOR SELECT USING (
    auth.uid() = owner_id 
    OR 
    check_is_project_member(id)
    OR
    EXISTS (
      SELECT 1 FROM project_invitations
      WHERE project_invitations.project_id = projects.id
      AND (
        -- Match by normalized phone
        regexp_replace(project_invitations.phone, '[^0-9]', '', 'g') = regexp_replace((SELECT phone FROM profiles WHERE id = auth.uid()), '[^0-9]', '', 'g')
        OR
        -- Match by email
        LOWER(project_invitations.email) = LOWER((SELECT email FROM profiles WHERE id = auth.uid()))
      )
    )
  );
