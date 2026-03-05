-- Add is_premium column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT FALSE;

-- Update RLS if necessary (though existing profile policies should cover it)
-- Users can already view and update their own profiles.
