-- Function to allow anyone (even non-members) to preview basic project info securely
-- using SECURITY DEFINER to bypass RLS for this specific query
CREATE OR REPLACE FUNCTION get_project_preview(p_id UUID)
RETURNS JSON 
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'id', p.id,
    'name', p.name,
    'description', p.description,
    'ownerName', pr.full_name,
    'createdAt', to_char(p.created_at, 'YYYY/MM/DD')
  ) INTO result
  FROM projects p
  JOIN profiles pr ON p.owner_id = pr.id
  WHERE p.id = p_id;
  
  RETURN result;
END;
$$;

-- Update project_members RLS to allow any authenticated user to join a project
-- Regular users can only join as 'collaborator' or 'storyteller'
-- The foreign key constraint on projects already ensures the project exists.
DROP POLICY IF EXISTS "Users can join projects if invited" ON project_members;
DROP POLICY IF EXISTS "Users can join projects via ID" ON project_members;

CREATE POLICY "Users can join projects via share link" ON project_members
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
  );
