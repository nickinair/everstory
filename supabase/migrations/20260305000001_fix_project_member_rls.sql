-- Allow users to join projects if they have an invitation
CREATE POLICY "Users can join projects if invited" ON project_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_invitations
      WHERE project_invitations.project_id = project_members.project_id
      AND (
        project_invitations.email = (SELECT email FROM profiles WHERE id = auth.uid())
        OR 
        project_invitations.phone = (SELECT phone FROM profiles WHERE id = auth.uid())
      )
    )
    OR
    -- Also allow owners to add themselves or others (required for project creation)
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_members.project_id
      AND projects.owner_id = auth.uid()
    )
  );

-- Allow project members to manage their roles (needed for owners to update roles)
CREATE POLICY "Members can update roles if owner" ON project_members
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_members.project_id
      AND projects.owner_id = auth.uid()
    )
  );

-- Allow members to delete participants (if owner)
CREATE POLICY "Owners can remove members" ON project_members
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_members.project_id
      AND projects.owner_id = auth.uid()
    )
  );
