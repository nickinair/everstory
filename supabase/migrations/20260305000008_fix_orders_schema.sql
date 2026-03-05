-- Add missing columns to orders table to support checkout and membership upgrades
ALTER TABLE orders ADD COLUMN IF NOT EXISTS book_author TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS recipient_name TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS contact_phone TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_address TEXT;

-- Verify if is_premium column is missing from profiles (just in case)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT FALSE;
