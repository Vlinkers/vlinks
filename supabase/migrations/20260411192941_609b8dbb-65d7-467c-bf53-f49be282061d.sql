
CREATE TABLE public.contributors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  vin_id UUID NOT NULL REFERENCES public.vins(id) ON DELETE CASCADE,
  role public.contributor_role NOT NULL,
  face public.contribution_face NOT NULL,
  display_name TEXT,
  is_anonymous BOOLEAN DEFAULT false,
  credibility_score INTEGER DEFAULT 0,
  facts_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, vin_id, role)
);

CREATE INDEX idx_contributors_user_id ON public.contributors(user_id);
CREATE INDEX idx_contributors_vin_id ON public.contributors(vin_id);
CREATE INDEX idx_contributors_role ON public.contributors(role);

ALTER TABLE public.contributors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Contributors viewable by everyone"
  ON public.contributors FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can register as contributor"
  ON public.contributors FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own contributor profile"
  ON public.contributors FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.derive_face_from_role()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role IN ('owner_verified', 'owner_unverified', 'former_owner', 'dealer') THEN
    NEW.face := 'face_b';
  ELSE
    NEW.face := 'face_a';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trigger_derive_face
  BEFORE INSERT OR UPDATE OF role ON public.contributors
  FOR EACH ROW
  EXECUTE FUNCTION public.derive_face_from_role();

CREATE TRIGGER update_contributors_updated_at
  BEFORE UPDATE ON public.contributors
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.facts
  ADD CONSTRAINT fk_facts_contributor
  FOREIGN KEY (contributor_id) REFERENCES public.contributors(id);
