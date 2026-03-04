-- Create project_invitations table for email/phone invitation tracking
CREATE TABLE IF NOT EXISTS project_invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  phone TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(project_id, phone),
  UNIQUE(project_id, email)
);

ALTER TABLE project_invitations ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to manage invitations for projects they are members of
CREATE POLICY "Manage project invitations" ON project_invitations
  FOR ALL USING (check_is_project_member(project_id));

-- Allow anyone to view invitations (needed for join-on-login flow)
CREATE POLICY "View invitations by identifier" ON project_invitations
  FOR SELECT USING (true);

-- Allow inserting invitations for project members
CREATE POLICY "Insert invitations" ON project_invitations
  FOR INSERT WITH CHECK (check_is_project_member(project_id));
