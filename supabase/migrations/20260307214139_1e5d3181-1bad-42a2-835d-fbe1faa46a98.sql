
ALTER TYPE public.contribution_type ADD VALUE IF NOT EXISTS 'price_change';

ALTER TABLE public.public_contributions
  ADD COLUMN IF NOT EXISTS old_price integer;

ALTER TABLE public.raw_contributions
  ADD COLUMN IF NOT EXISTS old_price integer;
