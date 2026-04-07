
-- Add direct FK column
ALTER TABLE public.public_contributions
ADD COLUMN vin_contribution_id uuid REFERENCES public.vin_contributions(id);

-- Backfill existing rows by matching vin_id + user_id + contribution_type with closest timestamp
UPDATE public.public_contributions pc
SET vin_contribution_id = (
  SELECT vc.id
  FROM public.vin_contributions vc
  WHERE vc.vin_id = pc.vin_id
    AND vc.user_id = pc.user_id
    AND vc.contribution_type = pc.contribution_type
  ORDER BY ABS(EXTRACT(EPOCH FROM (vc.created_at - pc.created_at)))
  LIMIT 1
)
WHERE pc.vin_contribution_id IS NULL;

-- Create index for faster joins
CREATE INDEX idx_public_contributions_vin_contribution_id ON public.public_contributions(vin_contribution_id);
