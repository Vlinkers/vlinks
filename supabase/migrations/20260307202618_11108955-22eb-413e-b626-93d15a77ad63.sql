
-- Allow public read access to vin_contributions for matching approved public_contributions
-- This is needed so the frontend can join to find photo/document attachment IDs
CREATE POLICY "Public can view vin_contributions for approved contributions"
ON public.vin_contributions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.public_contributions pc
    WHERE pc.vin_id = vin_contributions.vin_id
      AND pc.user_id = vin_contributions.user_id
      AND pc.contribution_type = vin_contributions.contribution_type
      AND pc.status = 'approved'
  )
);
