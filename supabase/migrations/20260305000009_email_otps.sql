-- Create email_otps table for storing email verification codes
CREATE TABLE IF NOT EXISTS public.email_otps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    code TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN DEFAULT false
);

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_email_otps_email ON public.email_otps(email);

-- Function to clean up expired email OTPs (optional, but good practice)
CREATE OR REPLACE FUNCTION delete_expired_email_otps() RETURNS trigger AS $$
BEGIN
    DELETE FROM public.email_otps WHERE expires_at < now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Enable RLS (though only the service role/server should access this)
ALTER TABLE public.email_otps ENABLE ROW LEVEL SECURITY;

-- Only service_role can do anything with this table
CREATE POLICY "Only service_role can manage email OTPs"
ON public.email_otps
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
