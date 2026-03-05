-- Add points column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 0;

-- Create point_transactions table
CREATE TABLE IF NOT EXISTS public.point_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT KEY,
    amount INTEGER NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('earn', 'spend')),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.point_transactions ENABLE ROW LEVEL SECURITY;

-- Policies for point_transactions
CREATE POLICY "Users can view their own transactions"
    ON public.point_transactions FOR SELECT
    USING (auth.uid() = user_id);

-- Only service role or authorized logic should insert/update (keeping it simple for now)
CREATE POLICY "Users can insert their own transactions"
    ON public.point_transactions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Update profiles policy to allow users to update their own points (though ideally this would be via RPC)
-- For now, we trust the frontend logic since this is a private internal project, 
-- but in production we'd use a secure RPC/Trigger.
CREATE POLICY "Users can update their own profiles points"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);
