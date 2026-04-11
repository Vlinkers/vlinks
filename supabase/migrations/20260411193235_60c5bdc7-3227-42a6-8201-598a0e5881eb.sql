
CREATE TABLE public.red_flags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vin_id UUID NOT NULL REFERENCES public.vins(id) ON DELETE CASCADE,
  flag_type public.red_flag_type NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  title TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  supporting_facts UUID[] DEFAULT '{}',
  detected_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_red_flags_vin_id ON public.red_flags(vin_id);
CREATE INDEX idx_red_flags_active ON public.red_flags(is_active) WHERE is_active = true;
CREATE INDEX idx_red_flags_severity ON public.red_flags(severity);

ALTER TABLE public.red_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active red flags viewable by everyone"
  ON public.red_flags FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage red flags"
  ON public.red_flags FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE TRIGGER update_red_flags_updated_at
  BEFORE UPDATE ON public.red_flags
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.vins
  ADD COLUMN IF NOT EXISTS red_flags_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS events_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS community_score INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS owner_transparency_score INTEGER DEFAULT 0;
