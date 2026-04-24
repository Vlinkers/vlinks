-- Allow admins/moderators to view and update all owner_claims for moderation
CREATE POLICY "Admins can view all owner claims"
ON public.owner_claims
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'moderator'::app_role)
);

CREATE POLICY "Admins can update any owner claim"
ON public.owner_claims
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'moderator'::app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'moderator'::app_role)
);

-- Same for owner_verifications: ensure moderators (in addition to admins) can act,
-- and add an explicit WITH CHECK so status transitions don't fail.
DROP POLICY IF EXISTS "Admins can update verifications" ON public.owner_verifications;
CREATE POLICY "Admins can update verifications"
ON public.owner_verifications
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'moderator'::app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'moderator'::app_role)
);

DROP POLICY IF EXISTS "Admins can view all verifications" ON public.owner_verifications;
CREATE POLICY "Admins can view all verifications"
ON public.owner_verifications
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'moderator'::app_role)
);

-- Allow admins to read owner-verification-docs files (for document preview in admin panel).
-- Storage bucket is private; we add an explicit admin/moderator SELECT policy.
CREATE POLICY "Admins can read owner verification docs"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'owner-verification-docs'
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'moderator'::app_role)
  )
);