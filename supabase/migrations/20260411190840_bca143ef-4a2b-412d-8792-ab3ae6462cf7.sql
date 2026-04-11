
CREATE TABLE public.events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vin_id UUID NOT NULL REFERENCES public.vins(id) ON DELETE CASCADE,
  event_type public.event_type NOT NULL,
  event_date DATE,
  event_date_precision TEXT DEFAULT 'exact' CHECK (event_date_precision IN ('exact', 'month', 'year', 'approximate')),
  title TEXT NOT NULL,
  description TEXT,
  mileage_at_event INTEGER,
  location TEXT,
  is_verified BOOLEAN DEFAULT false,
  facts_count INTEGER DEFAULT 0,
  face_a_count INTEGER DEFAULT 0,
  face_b_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_events_vin_id ON public.events(vin_id);
CREATE INDEX idx_events_event_date ON public.events(event_date);
CREATE INDEX idx_events_event_type ON public.events(event_type);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Events are viewable by everyone"
  ON public.events FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create events"
  ON public.events FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can update events"
  ON public.events FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
