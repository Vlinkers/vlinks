
-- Add for_sale to contribution_type enum
ALTER TYPE public.contribution_type ADD VALUE IF NOT EXISTS 'for_sale';

-- Add asking_price and listing_url columns
ALTER TABLE public.public_contributions
  ADD COLUMN IF NOT EXISTS asking_price integer,
  ADD COLUMN IF NOT EXISTS listing_url text;

ALTER TABLE public.raw_contributions
  ADD COLUMN IF NOT EXISTS asking_price integer,
  ADD COLUMN IF NOT EXISTS listing_url text;
