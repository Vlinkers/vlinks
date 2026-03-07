
CREATE TABLE public.observed_signals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vin_id UUID NOT NULL REFERENCES public.vins(id) ON DELETE CASCADE,
  contribution_id UUID NOT NULL REFERENCES public.public_contributions(id) ON DELETE CASCADE,
  signal_text TEXT NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.observed_signals ENABLE ROW LEVEL SECURITY;

-- Anyone can view signals (public data for VIN pages)
CREATE POLICY "Anyone can view observed signals"
  ON public.observed_signals FOR SELECT
  USING (true);

-- Only admins can insert
CREATE POLICY "Admins can insert observed signals"
  ON public.observed_signals FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can update
CREATE POLICY "Admins can update observed signals"
  ON public.observed_signals FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can delete
CREATE POLICY "Admins can delete observed signals"
  ON public.observed_signals FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));
