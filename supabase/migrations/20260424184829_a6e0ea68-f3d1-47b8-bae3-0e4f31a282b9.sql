DROP POLICY IF EXISTS "Approved facts are viewable by everyone" ON public.facts;
DROP POLICY IF EXISTS "Authenticated users can create facts" ON public.facts;
DROP POLICY IF EXISTS "Anonymous users can create facts" ON public.facts;
DROP POLICY IF EXISTS "Users can update own pending facts" ON public.facts;
DROP POLICY IF EXISTS "Admins can update any fact" ON public.facts;

CREATE POLICY "Approved facts are viewable by everyone"
ON public.facts
FOR SELECT
TO public
USING (moderation_status = 'approved'::moderation_status);

CREATE POLICY "Authors can view own facts"
ON public.facts
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.contributors c
    WHERE c.id = facts.contributor_id
      AND c.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all facts"
ON public.facts
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'moderator'::app_role)
);

CREATE POLICY "Authenticated users can create facts"
ON public.facts
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.contributors c
    WHERE c.id = facts.contributor_id
      AND c.user_id = auth.uid()
  )
);

CREATE POLICY "Anonymous users can create facts"
ON public.facts
FOR INSERT
TO anon
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.contributors c
    WHERE c.id = facts.contributor_id
      AND c.user_id IS NULL
      AND COALESCE(c.is_anonymous, false) = true
  )
);

CREATE POLICY "Users can update own pending facts"
ON public.facts
FOR UPDATE
TO authenticated
USING (
  moderation_status = 'pending'::moderation_status
  AND EXISTS (
    SELECT 1
    FROM public.contributors c
    WHERE c.id = facts.contributor_id
      AND c.user_id = auth.uid()
  )
)
WITH CHECK (
  moderation_status = 'pending'::moderation_status
  AND EXISTS (
    SELECT 1
    FROM public.contributors c
    WHERE c.id = facts.contributor_id
      AND c.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can update any fact"
ON public.facts
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

CREATE POLICY "Admins can delete any fact"
ON public.facts
FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'moderator'::app_role)
);

DROP POLICY IF EXISTS "Events are viewable by everyone" ON public.events;
DROP POLICY IF EXISTS "Authenticated users can create events" ON public.events;
DROP POLICY IF EXISTS "Anonymous users can create events" ON public.events;
DROP POLICY IF EXISTS "Admins can update events" ON public.events;

CREATE POLICY "Events are viewable by everyone"
ON public.events
FOR SELECT
TO public
USING (true);

CREATE POLICY "Authenticated users can create events"
ON public.events
FOR INSERT
TO authenticated
WITH CHECK (
  vin_id IS NOT NULL
  AND title IS NOT NULL
  AND event_type IS NOT NULL
);

CREATE POLICY "Anonymous users can create events"
ON public.events
FOR INSERT
TO anon
WITH CHECK (
  vin_id IS NOT NULL
  AND title IS NOT NULL
  AND event_type IS NOT NULL
);

CREATE POLICY "Admins can update events"
ON public.events
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

CREATE POLICY "Admins can delete events"
ON public.events
FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'moderator'::app_role)
);

DROP POLICY IF EXISTS "Evidence viewable by everyone" ON public.evidence;
DROP POLICY IF EXISTS "Authenticated users can upload evidence" ON public.evidence;
DROP POLICY IF EXISTS "Anonymous users can upload evidence" ON public.evidence;

CREATE POLICY "Approved evidence is viewable by everyone"
ON public.evidence
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1
    FROM public.facts f
    WHERE f.id = evidence.fact_id
      AND f.moderation_status = 'approved'::moderation_status
  )
);

CREATE POLICY "Authors can view own evidence"
ON public.evidence
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.facts f
    JOIN public.contributors c ON c.id = f.contributor_id
    WHERE f.id = evidence.fact_id
      AND c.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all evidence"
ON public.evidence
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'moderator'::app_role)
);

CREATE POLICY "Authenticated users can upload evidence"
ON public.evidence
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.facts f
    JOIN public.contributors c ON c.id = f.contributor_id
    WHERE f.id = evidence.fact_id
      AND c.user_id = auth.uid()
  )
);

CREATE POLICY "Anonymous users can upload evidence"
ON public.evidence
FOR INSERT
TO anon
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.facts f
    JOIN public.contributors c ON c.id = f.contributor_id
    WHERE f.id = evidence.fact_id
      AND c.user_id IS NULL
      AND COALESCE(c.is_anonymous, false) = true
  )
);

CREATE POLICY "Admins can delete evidence"
ON public.evidence
FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'moderator'::app_role)
);

DROP POLICY IF EXISTS "Admins can view all owner claims" ON public.owner_claims;
DROP POLICY IF EXISTS "Admins can update any owner claim" ON public.owner_claims;
DROP POLICY IF EXISTS "Users can create claims" ON public.owner_claims;
DROP POLICY IF EXISTS "Users can update their own claims" ON public.owner_claims;
DROP POLICY IF EXISTS "Users can view their own claims" ON public.owner_claims;

CREATE POLICY "Users can view their own claims"
ON public.owner_claims
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all owner claims"
ON public.owner_claims
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'moderator'::app_role)
);

CREATE POLICY "Users can create claims"
ON public.owner_claims
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own claims"
ON public.owner_claims
FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id
  AND status = 'active'
)
WITH CHECK (
  auth.uid() = user_id
  AND status IN ('active', 'revoked')
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

CREATE POLICY "Admins can delete owner claims"
ON public.owner_claims
FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'moderator'::app_role)
);

DROP POLICY IF EXISTS "Admins can update verifications" ON public.owner_verifications;
DROP POLICY IF EXISTS "Admins can view all verifications" ON public.owner_verifications;
DROP POLICY IF EXISTS "Users can create verification requests" ON public.owner_verifications;
DROP POLICY IF EXISTS "Users can update their own verifications" ON public.owner_verifications;
DROP POLICY IF EXISTS "Users can view their own verifications" ON public.owner_verifications;

CREATE POLICY "Users can view their own verifications"
ON public.owner_verifications
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all verifications"
ON public.owner_verifications
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'moderator'::app_role)
);

CREATE POLICY "Users can create verification requests"
ON public.owner_verifications
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own verifications"
ON public.owner_verifications
FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id
  AND verification_status = 'pending'
)
WITH CHECK (
  auth.uid() = user_id
  AND verification_status = 'pending'
);

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

CREATE POLICY "Admins can delete verifications"
ON public.owner_verifications
FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'moderator'::app_role)
);

DROP POLICY IF EXISTS "Admins can delete contributions" ON public.public_contributions;
DROP POLICY IF EXISTS "Admins can update contributions" ON public.public_contributions;
DROP POLICY IF EXISTS "Admins can view all contributions" ON public.public_contributions;
DROP POLICY IF EXISTS "Authenticated users can insert contributions" ON public.public_contributions;
DROP POLICY IF EXISTS "Public can view approved contributions" ON public.public_contributions;
DROP POLICY IF EXISTS "Users can delete own public contributions" ON public.public_contributions;
DROP POLICY IF EXISTS "Users can view own contributions" ON public.public_contributions;

CREATE POLICY "Public can view approved contributions"
ON public.public_contributions
FOR SELECT
TO public
USING (status = 'approved');

CREATE POLICY "Users can view own contributions"
ON public.public_contributions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all contributions"
ON public.public_contributions
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'moderator'::app_role)
);

CREATE POLICY "Authenticated users can insert contributions"
ON public.public_contributions
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND vin_id IS NOT NULL
  AND contribution_type IS NOT NULL
);

CREATE POLICY "Users can update own pending contributions"
ON public.public_contributions
FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id
  AND status = 'pending'
)
WITH CHECK (
  auth.uid() = user_id
  AND status = 'pending'
);

CREATE POLICY "Admins can update contributions"
ON public.public_contributions
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

CREATE POLICY "Users can delete own public contributions"
ON public.public_contributions
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can delete contributions"
ON public.public_contributions
FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'moderator'::app_role)
);

DROP POLICY IF EXISTS "Admins can delete raw contributions" ON public.raw_contributions;
DROP POLICY IF EXISTS "Admins can update raw contributions" ON public.raw_contributions;
DROP POLICY IF EXISTS "Admins can view all raw contributions" ON public.raw_contributions;
DROP POLICY IF EXISTS "Users can create raw contributions" ON public.raw_contributions;
DROP POLICY IF EXISTS "Users can delete their own raw contributions" ON public.raw_contributions;
DROP POLICY IF EXISTS "Users can update their own raw contributions" ON public.raw_contributions;
DROP POLICY IF EXISTS "Users can view their own raw contributions status" ON public.raw_contributions;

CREATE POLICY "Users can view their own raw contributions status"
ON public.raw_contributions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all raw contributions"
ON public.raw_contributions
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'moderator'::app_role)
);

CREATE POLICY "Users can create raw contributions"
ON public.raw_contributions
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND vin_id IS NOT NULL
  AND contribution_type IS NOT NULL
  AND title IS NOT NULL
);

CREATE POLICY "Users can update their own pending raw contributions"
ON public.raw_contributions
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update raw contributions"
ON public.raw_contributions
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

CREATE POLICY "Users can delete their own raw contributions"
ON public.raw_contributions
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can delete raw contributions"
ON public.raw_contributions
FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'moderator'::app_role)
);

DROP POLICY IF EXISTS "Anyone can create reports" ON public.content_reports;
DROP POLICY IF EXISTS "Users see own reports" ON public.content_reports;
DROP POLICY IF EXISTS "Admins manage all reports" ON public.content_reports;

CREATE POLICY "Anyone can create reports"
ON public.content_reports
FOR INSERT
TO public
WITH CHECK (
  target_id IS NOT NULL
  AND report_type IS NOT NULL
  AND description IS NOT NULL
  AND (reporter_user_id IS NULL OR reporter_user_id = auth.uid())
);

CREATE POLICY "Users see own reports"
ON public.content_reports
FOR SELECT
TO authenticated
USING (reporter_user_id = auth.uid());

CREATE POLICY "Admins manage all reports"
ON public.content_reports
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'moderator'::app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'moderator'::app_role)
);

DROP POLICY IF EXISTS "Service role can insert audit logs" ON public.admin_audit_log;
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.admin_audit_log;

CREATE POLICY "Staff can view audit logs"
ON public.admin_audit_log
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'moderator'::app_role)
);

CREATE POLICY "Staff can insert audit logs"
ON public.admin_audit_log
FOR INSERT
TO authenticated
WITH CHECK (
  admin_user_id = auth.uid()
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'moderator'::app_role)
  )
);

DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;

CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'moderator'::app_role)
);

DROP POLICY IF EXISTS "Admins can insert observed signals" ON public.observed_signals;
DROP POLICY IF EXISTS "Admins can update observed signals" ON public.observed_signals;
DROP POLICY IF EXISTS "Admins can delete observed signals" ON public.observed_signals;

CREATE POLICY "Admins can insert observed signals"
ON public.observed_signals
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update observed signals"
ON public.observed_signals
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete observed signals"
ON public.observed_signals
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can insert signal contributions" ON public.signal_contributions;
DROP POLICY IF EXISTS "Admins can delete signal contributions" ON public.signal_contributions;

CREATE POLICY "Admins can insert signal contributions"
ON public.signal_contributions
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete signal contributions"
ON public.signal_contributions
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Authenticated users can create VINs" ON public.vins;
DROP POLICY IF EXISTS "Admins can update VINs" ON public.vins;
DROP POLICY IF EXISTS "Admins can delete VINs" ON public.vins;

CREATE POLICY "Authenticated users can create VINs"
ON public.vins
FOR INSERT
TO authenticated
WITH CHECK (vin IS NOT NULL);

CREATE POLICY "Admins can update VINs"
ON public.vins
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete VINs"
ON public.vins
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Service role can insert vin decodes" ON public.vin_decodes;
DROP POLICY IF EXISTS "Service role can update vin decodes" ON public.vin_decodes;

DROP POLICY IF EXISTS "Users can upload verification documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their verification documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can read owner verification docs" ON storage.objects;

CREATE POLICY "Users can upload verification documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'owner-verification-docs'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their verification documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'owner-verification-docs'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their verification documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'owner-verification-docs'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

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

DROP POLICY IF EXISTS "Users can upload verification docs" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own verification docs" ON storage.objects;

CREATE POLICY "Users can upload verification docs"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'verifications'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view own verification docs"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'verifications'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "No direct access to password reset requests select" ON public.password_reset_requests;
DROP POLICY IF EXISTS "No direct access to password reset requests insert" ON public.password_reset_requests;
DROP POLICY IF EXISTS "No direct access to password reset requests update" ON public.password_reset_requests;
DROP POLICY IF EXISTS "No direct access to password reset requests delete" ON public.password_reset_requests;

CREATE POLICY "No direct access to password reset requests select"
ON public.password_reset_requests
FOR SELECT
TO public
USING (false);

CREATE POLICY "No direct access to password reset requests insert"
ON public.password_reset_requests
FOR INSERT
TO public
WITH CHECK (false);

CREATE POLICY "No direct access to password reset requests update"
ON public.password_reset_requests
FOR UPDATE
TO public
USING (false)
WITH CHECK (false);

CREATE POLICY "No direct access to password reset requests delete"
ON public.password_reset_requests
FOR DELETE
TO public
USING (false);