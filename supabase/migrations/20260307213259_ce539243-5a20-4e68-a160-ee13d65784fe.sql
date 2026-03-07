
-- Add new columns to public_contributions
ALTER TABLE public.public_contributions
  ADD COLUMN IF NOT EXISTS province text,
  ADD COLUMN IF NOT EXISTS holder_type text,
  ADD COLUMN IF NOT EXISTS dealer_name text;

-- Add new columns to raw_contributions
ALTER TABLE public.raw_contributions
  ADD COLUMN IF NOT EXISTS province text,
  ADD COLUMN IF NOT EXISTS holder_type text,
  ADD COLUMN IF NOT EXISTS dealer_name text;
