
-- 1. Restructure observed_signals: remove contribution_id (will use junction), add first/last dates
-- Drop the old contribution_id FK and column, add date tracking columns
ALTER TABLE public.observed_signals 
  DROP CONSTRAINT IF EXISTS observed_signals_contribution_id_fkey,
  DROP COLUMN IF EXISTS contribution_id,
  ADD COLUMN IF NOT EXISTS first_observed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  ADD COLUMN IF NOT EXISTS last_observed_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Add unique constraint on vin_id + signal_text to enforce deduplication
ALTER TABLE public.observed_signals
  ADD CONSTRAINT observed_signals_vin_signal_unique UNIQUE (vin_id, signal_text);

-- 2. Create junction table signal_contributions
CREATE TABLE IF NOT EXISTS public.signal_contributions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  signal_id UUID NOT NULL REFERENCES public.observed_signals(id) ON DELETE CASCADE,
  contribution_id UUID NOT NULL REFERENCES public.public_contributions(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (signal_id, contribution_id)
);

ALTER TABLE public.signal_contributions ENABLE ROW LEVEL SECURITY;

-- RLS: public read, admin write
CREATE POLICY "Anyone can view signal contributions"
  ON public.signal_contributions FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert signal contributions"
  ON public.signal_contributions FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete signal contributions"
  ON public.signal_contributions FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));
