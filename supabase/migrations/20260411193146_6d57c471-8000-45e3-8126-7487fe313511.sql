
CREATE TABLE public.vehicle_phases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vin_id UUID NOT NULL REFERENCES public.vins(id) ON DELETE CASCADE,
  phase_type TEXT NOT NULL CHECK (phase_type IN (
    'ownership', 'dealer_stock', 'listing', 'unknown'
  )),
  owner_contributor_id UUID REFERENCES public.contributors(id),
  start_date DATE,
  end_date DATE,
  start_mileage INTEGER,
  end_mileage INTEGER,
  location TEXT,
  events_count INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_vehicle_phases_vin_id ON public.vehicle_phases(vin_id);
CREATE INDEX idx_vehicle_phases_dates ON public.vehicle_phases(start_date, end_date);

ALTER TABLE public.vehicle_phases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Phases viewable by everyone"
  ON public.vehicle_phases FOR SELECT
  USING (true);

CREATE POLICY "Admins and moderators can manage phases"
  ON public.vehicle_phases FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE TRIGGER update_vehicle_phases_updated_at
  BEFORE UPDATE ON public.vehicle_phases
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.events
  ADD COLUMN phase_id UUID REFERENCES public.vehicle_phases(id);

CREATE INDEX idx_events_phase_id ON public.events(phase_id);
