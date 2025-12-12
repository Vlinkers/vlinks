-- Drop the existing public policy
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

-- Create new policy: only authenticated users can view profiles
CREATE POLICY "Authenticated users can view profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (true);

-- Add a comment to remind about city-level location
COMMENT ON COLUMN public.profiles.location IS 'Store city-level location only (e.g., "Montreal, QC") - do not store specific addresses for privacy';