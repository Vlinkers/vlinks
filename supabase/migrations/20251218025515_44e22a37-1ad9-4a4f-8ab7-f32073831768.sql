-- Fix user_badges security: restrict SELECT to own badges only
-- Drop the overly permissive policy that exposes user_id to everyone
DROP POLICY IF EXISTS "Badges are viewable by everyone" ON public.user_badges;

-- Create policy allowing users to only view their own badges
CREATE POLICY "Users can view their own badges"
ON public.user_badges
FOR SELECT
USING (auth.uid() = user_id);