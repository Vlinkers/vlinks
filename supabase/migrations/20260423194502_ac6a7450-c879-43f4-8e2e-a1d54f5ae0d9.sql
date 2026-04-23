-- Fix admin UPDATE policies on moderation tables by adding explicit WITH CHECK clauses.
-- Without WITH CHECK, PostgreSQL falls back to USING for the new row, which combined
-- with restrictive sibling policies can cause "new row violates row-level security policy"
-- errors when admins change moderation_status to a value the user policy no longer matches.

-- ============ FACTS ============
DROP POLICY IF EXISTS "Admins can update any fact" ON public.facts;
CREATE POLICY "Admins can update any fact"
ON public.facts
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'moderator'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'moderator'::app_role));

DROP POLICY IF EXISTS "Users can update own pending facts" ON public.facts;
CREATE POLICY "Users can update own pending facts"
ON public.facts
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.contributors c
    WHERE c.id = facts.contributor_id AND c.user_id = auth.uid()
  )
  AND moderation_status = 'pending'::moderation_status
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.contributors c
    WHERE c.id = facts.contributor_id AND c.user_id = auth.uid()
  )
);

-- ============ EVENTS ============
DROP POLICY IF EXISTS "Admins can update events" ON public.events;
CREATE POLICY "Admins can update events"
ON public.events
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'moderator'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'moderator'::app_role));

-- ============ RED_FLAGS ============
-- The existing "Admins can manage red flags" policy uses FOR ALL without explicit WITH CHECK.
DROP POLICY IF EXISTS "Admins can manage red flags" ON public.red_flags;
CREATE POLICY "Admins can manage red flags"
ON public.red_flags
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'moderator'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'moderator'::app_role));

-- ============ CONTENT_REPORTS ============
DROP POLICY IF EXISTS "Admins manage all reports" ON public.content_reports;
CREATE POLICY "Admins manage all reports"
ON public.content_reports
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'moderator'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'moderator'::app_role));