-- Create sms_otps table for storing verification codes
CREATE TABLE IF NOT EXISTS public.sms_otps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone TEXT NOT NULL,
    code TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN DEFAULT false
);

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_sms_otps_phone ON public.sms_otps(phone);

-- Function to clean up expired OTPs (optional, but good practice)
CREATE OR REPLACE FUNCTION delete_expired_otps() RETURNS trigger AS $$
BEGIN
    DELETE FROM public.sms_otps WHERE expires_at < now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Enable RLS (though only the service role/server should access this)
ALTER TABLE public.sms_otps ENABLE ROW LEVEL SECURITY;

-- Only service_role can do anything with this table
CREATE POLICY "Only service_role can manage OTPs"
ON public.sms_otps
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
