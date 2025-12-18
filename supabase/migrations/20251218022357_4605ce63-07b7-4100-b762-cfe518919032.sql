-- CRITICAL SECURITY: Block client-side access to raw user contributions
-- Only service role (edge functions) should be able to read raw_contributions

-- First, drop all existing SELECT policies on raw_contributions
DROP POLICY IF EXISTS "Users can view their own raw contributions" ON public.raw_contributions;

-- Create a new policy that DENIES all client SELECT access
-- Raw contributions should NEVER be readable by clients
-- They can only be written by users and read by service role (edge functions)

-- Note: RLS blocks anon/authenticated users from SELECT
-- Service role bypasses RLS, so edge functions can still read

-- Keep INSERT/UPDATE/DELETE policies for authenticated users on their own rows
-- but completely block SELECT for everyone except service role

-- Verify existing policies
-- Users can create raw contributions - KEEP
-- Users can delete their own raw contributions - KEEP  
-- Users can update their own raw contributions - KEEP
-- Users can view their own raw contributions - REMOVE (this was exposing raw text!)

-- The existing "Users can view their own raw contributions" policy is already dropped above
-- No new SELECT policy = no client can SELECT from raw_contributions

-- Add processing_error column if it doesn't exist (for better error tracking)
ALTER TABLE public.raw_contributions 
ADD COLUMN IF NOT EXISTS processing_error text DEFAULT NULL;