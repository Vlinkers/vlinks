
ALTER TABLE public.raw_contributions ADD COLUMN IF NOT EXISTS migrated_at TIMESTAMPTZ;
ALTER TABLE public.public_contributions ADD COLUMN IF NOT EXISTS migrated_at TIMESTAMPTZ;
