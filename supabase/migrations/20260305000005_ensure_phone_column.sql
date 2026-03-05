-- Ensure phone column exists in profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT UNIQUE;

-- Backfill phone numbers for existing users who used the shadow email strategy
-- e.g., user_13800138000@users.everstory.ai -> +8613800138000
UPDATE profiles
SET phone = '+86' || regexp_replace(split_part(email, '@', 1), '^user_', '')
WHERE email LIKE 'user_%@users.everstory.ai'
  AND (phone IS NULL OR phone = '');

-- Update the handle_new_user trigger to be more robust with phone numbers
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
DECLARE
  extracted_phone TEXT;
BEGIN
  -- If it's a shadow email, extract phone
  IF NEW.email LIKE 'user_%@users.everstory.ai' THEN
    extracted_phone := '+86' || regexp_replace(split_part(NEW.email, '@', 1), '^user_', '');
  ELSE
    extracted_phone := NEW.raw_user_meta_data->>'phone';
  END IF;

  INSERT INTO public.profiles (id, full_name, email, phone, initials)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', extracted_phone, NEW.email), 
    NEW.email,
    extracted_phone,
    SUBSTRING(COALESCE(NEW.raw_user_meta_data->>'full_name', extracted_phone, NEW.email) FROM 1 FOR 1)
  )
  ON CONFLICT (id) DO UPDATE SET
    phone = EXCLUDED.phone,
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name;
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
