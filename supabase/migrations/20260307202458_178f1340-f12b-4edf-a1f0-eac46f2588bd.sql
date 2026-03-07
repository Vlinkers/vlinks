
-- Allow public read access to contribution_documents for approved contributions
CREATE POLICY "Public can view documents of approved contributions"
ON public.contribution_documents FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.public_contributions pc
    JOIN public.vin_contributions vc ON vc.vin_id = pc.vin_id 
      AND vc.user_id = pc.user_id 
      AND vc.contribution_type = pc.contribution_type
    WHERE vc.id = contribution_documents.contribution_id
      AND pc.status = 'approved'
  )
);
