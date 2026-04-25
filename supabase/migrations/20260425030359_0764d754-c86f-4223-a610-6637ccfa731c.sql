-- ============================================
-- AUDIT GLOBAL RLS - Harmonisation des policies
-- ============================================

-- ---------- NOTIFICATIONS ----------
-- Permettre aux admins/modérateurs et au système (via triggers SECURITY DEFINER) d'insérer
DROP POLICY IF EXISTS "Staff can insert notifications" ON public.notifications;
CREATE POLICY "Staff can insert notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'moderator'::app_role)
  OR user_id = auth.uid()
);

DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notifications;
CREATE POLICY "Users can delete own notifications"
ON public.notifications
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- ---------- OWNER_VERIFICATIONS : permettre aux admins de voir tout (déjà OK), 
-- mais ajouter visibilité publique limitée pour afficher le statut "pending" sur dossier VIN
DROP POLICY IF EXISTS "Public can view pending verifications status" ON public.owner_verifications;
CREATE POLICY "Public can view pending verifications status"
ON public.owner_verifications
FOR SELECT
TO public
USING (verification_status IN ('pending', 'verified'));

-- ---------- STORAGE : owner-verification-docs ----------
-- Verrouiller : seul l'utilisateur (premier dossier = user_id) ou staff peut accéder
DROP POLICY IF EXISTS "Users can upload own verification docs" ON storage.objects;
CREATE POLICY "Users can upload own verification docs"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'owner-verification-docs' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can view own verification docs" ON storage.objects;
CREATE POLICY "Users can view own verification docs"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'owner-verification-docs' 
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'moderator'::app_role)
  )
);

DROP POLICY IF EXISTS "Staff can delete verification docs" ON storage.objects;
CREATE POLICY "Staff can delete verification docs"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'owner-verification-docs' 
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);

-- ---------- STORAGE : verifications bucket ----------
DROP POLICY IF EXISTS "Users upload own verifications" ON storage.objects;
CREATE POLICY "Users upload own verifications"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'verifications' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users view own verifications or staff" ON storage.objects;
CREATE POLICY "Users view own verifications or staff"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'verifications' 
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'moderator'::app_role)
  )
);

-- ---------- VEHICLE_PHASES : ajouter WITH CHECK manquant ----------
DROP POLICY IF EXISTS "Admins and moderators can manage phases" ON public.vehicle_phases;
CREATE POLICY "Admins and moderators can manage phases"
ON public.vehicle_phases
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

-- ---------- CONTRIBUTORS : permettre aux admins de supprimer (modération) ----------
DROP POLICY IF EXISTS "Admins can delete contributors" ON public.contributors;
CREATE POLICY "Admins can delete contributors"
ON public.contributors
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

-- ---------- EVIDENCE : permettre aux admins de mettre à jour (redaction) ----------
DROP POLICY IF EXISTS "Admins can update evidence" ON public.evidence;
CREATE POLICY "Admins can update evidence"
ON public.evidence
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

-- ---------- CONTRIBUTION_DOCUMENTS : ajouter UPDATE pour staff ----------
DROP POLICY IF EXISTS "Admins can update contribution documents" ON public.contribution_documents;
CREATE POLICY "Admins can update contribution documents"
ON public.contribution_documents
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

-- ---------- VINS : permettre aux modérateurs de mettre à jour ----------
DROP POLICY IF EXISTS "Moderators can update VINs" ON public.vins;
CREATE POLICY "Moderators can update VINs"
ON public.vins
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'moderator'::app_role))
WITH CHECK (has_role(auth.uid(), 'moderator'::app_role));

-- ---------- PROFILES : admins peuvent mettre à jour (modération badges/verif) ----------
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Admins can update any profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));