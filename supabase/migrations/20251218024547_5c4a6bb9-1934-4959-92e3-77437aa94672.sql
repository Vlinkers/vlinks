-- Allow users to SELECT their own raw_contributions (for status tracking only)
-- This exposes minimal fields needed for the profile page

CREATE POLICY "Users can view their own raw contributions status"
ON public.raw_contributions
FOR SELECT
USING (auth.uid() = user_id);
