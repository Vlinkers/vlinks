
-- Drop the two restrictive SELECT policies
DROP POLICY IF EXISTS "Public can view contributions" ON public.public_contributions;
DROP POLICY IF EXISTS "Users can view own contributions" ON public.public_contributions;

-- Recreate as PERMISSIVE so either condition grants access
CREATE POLICY "Public can view approved contributions"
  ON public.public_contributions FOR SELECT
  USING (status = 'approved');

CREATE POLICY "Users can view own contributions"
  ON public.public_contributions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all contributions"
  ON public.public_contributions FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));
