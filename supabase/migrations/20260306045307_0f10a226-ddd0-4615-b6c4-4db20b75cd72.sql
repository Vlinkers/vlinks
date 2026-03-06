
-- Add content columns to public_contributions
ALTER TABLE public.public_contributions ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE public.public_contributions ADD COLUMN IF NOT EXISTS summary text;
ALTER TABLE public.public_contributions ADD COLUMN IF NOT EXISTS details text;

-- Backfill existing records from raw_contributions
UPDATE public.public_contributions pc
SET 
  title = rc.title,
  summary = rc.summary,
  details = rc.details
FROM public.raw_contributions rc
WHERE pc.vin_id = rc.vin_id 
  AND pc.user_id = rc.user_id 
  AND pc.contribution_type = rc.contribution_type;
