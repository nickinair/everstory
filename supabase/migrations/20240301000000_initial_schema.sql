-- Initial Schema for Everstory

-- 1. Create Enums
CREATE TYPE project_role AS ENUM ('owner', 'collaborator', 'storyteller');
CREATE TYPE story_type AS ENUM ('video', 'audio');
CREATE TYPE prompt_status AS ENUM ('sent', 'draft');
CREATE TYPE order_status AS ENUM ('processing', 'shipped', 'delivered');

-- 2. Create Profiles Table (links to auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  avatar_url TEXT,
  initials TEXT,
  email TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 3. Create Projects Table
CREATE TABLE projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- 4. Create Project Members Table
CREATE TABLE project_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  role project_role DEFAULT 'collaborator' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(project_id, user_id)
);

ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;

-- 5. Create Stories Table
CREATE TABLE stories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  image_url TEXT,
  type story_type DEFAULT 'audio' NOT NULL,
  pages INTEGER DEFAULT 1,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE stories ENABLE ROW LEVEL SECURITY;

-- 6. Create Prompts Table
CREATE TABLE prompts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  question TEXT NOT NULL,
  image_url TEXT,
  status prompt_status DEFAULT 'sent' NOT NULL,
  sent_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE prompts ENABLE ROW LEVEL SECURITY;

-- 7. Create Question Templates
CREATE TABLE question_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE question_templates ENABLE ROW LEVEL SECURITY;

-- 8. Create Orders Table
CREATE TABLE orders (
  id TEXT PRIMARY KEY, -- Format like 'ORD-2024-001'
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  book_title TEXT NOT NULL,
  book_subtitle TEXT,
  cover_color TEXT,
  image_url TEXT,
  status order_status DEFAULT 'processing' NOT NULL,
  price TEXT NOT NULL,
  tracking_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- 9. Create Logistics Table
CREATE TABLE order_logistics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id TEXT REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  time TIMESTAMP WITH TIME ZONE NOT NULL,
  description TEXT NOT NULL
);

ALTER TABLE order_logistics ENABLE ROW LEVEL SECURITY;

---
--- HELPER FUNCTIONS
---

-- Function to check project membership without recursion
CREATE OR REPLACE FUNCTION public.check_is_project_member(p_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_id = p_id AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

---
--- RLS POLICIES
---

-- Profiles: Users can view any profile (for member search) but only edit their own
CREATE POLICY "Public profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Projects: Users can view projects they are members of
CREATE POLICY "Users can view projects they are members of" ON projects 
  FOR SELECT USING (check_is_project_member(id) OR auth.uid() = owner_id);

CREATE POLICY "Owners can manage their projects" ON projects
  FOR ALL USING (auth.uid() = owner_id);

-- Project Members: Members can view other members of the same project
CREATE POLICY "View project members" ON project_members
  FOR SELECT USING (check_is_project_member(project_id));

-- Stories/Prompts/Orders: Linked to project membership
CREATE POLICY "Manage project stories" ON stories 
  FOR ALL USING (check_is_project_member(project_id));

CREATE POLICY "Manage project prompts" ON prompts 
  FOR ALL USING (check_is_project_member(project_id));

CREATE POLICY "Manage project orders" ON orders 
  FOR ALL USING (check_is_project_member(project_id));

CREATE POLICY "Manage order logistics" ON order_logistics
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.id = order_logistics.order_id 
      AND check_is_project_member(orders.project_id)
    )
  );

---
--- TRIGGERS
---

-- Automatically create a profile when a user signs up
CREATE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, initials)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'full_name', new.email), 
    new.email,
    SUBSTRING(COALESCE(new.raw_user_meta_data->>'full_name', new.email) FROM 1 FOR 1)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
