-- Migration to add phone to profiles and update trigger

ALTER TABLE profiles add column IF NOT EXISTS phone TEXT UNIQUE;

-- Update the new user trigger to prefer phone as the primary identifier
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, phone, initials)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'full_name', new.phone, new.email), 
    new.email,
    new.phone,
    SUBSTRING(COALESCE(new.raw_user_meta_data->>'full_name', new.phone, new.email) FROM 1 FOR 1)
  )
  ON CONFLICT (id) DO UPDATE SET
    phone = EXCLUDED.phone;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
