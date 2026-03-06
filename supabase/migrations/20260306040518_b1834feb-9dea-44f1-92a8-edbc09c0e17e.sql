
-- 1. Add status column to public_contributions
ALTER TABLE public.public_contributions 
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'approved';

-- 2. Create admin_audit_log table
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL,
  action_type text NOT NULL,
  target_type text NOT NULL,
  target_id text NOT NULL,
  details jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can read audit logs
CREATE POLICY "Admins can view audit logs"
ON public.admin_audit_log FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Service role inserts audit logs (from edge functions)
CREATE POLICY "Service role can insert audit logs"
ON public.admin_audit_log FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3. Admin RLS policies for profiles (admins can view all)
CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 4. Admin RLS policies for public_contributions
CREATE POLICY "Admins can update contributions"
ON public.public_contributions FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete contributions"
ON public.public_contributions FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 5. Admin RLS policies for user_roles
CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update roles"
ON public.user_roles FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert roles"
ON public.user_roles FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles"
ON public.user_roles FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 6. Admin RLS for raw_contributions (view all)
CREATE POLICY "Admins can view all raw contributions"
ON public.raw_contributions FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update raw contributions"
ON public.raw_contributions FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete raw contributions"
ON public.raw_contributions FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 7. Admin RLS for contribution_documents
CREATE POLICY "Admins can view all documents"
ON public.contribution_documents FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete documents"
ON public.contribution_documents FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 8. Admin RLS for contribution_photos
CREATE POLICY "Admins can delete photos"
ON public.contribution_photos FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 9. Admin RLS for owner_verifications
CREATE POLICY "Admins can view all verifications"
ON public.owner_verifications FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update verifications"
ON public.owner_verifications FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 10. Admin RLS for vins (already has admin update policy, add delete)
CREATE POLICY "Admins can delete VINs"
ON public.vins FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
