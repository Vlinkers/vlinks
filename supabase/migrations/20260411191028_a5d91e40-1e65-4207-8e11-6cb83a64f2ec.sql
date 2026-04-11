
CREATE TABLE public.facts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  contributor_id UUID NOT NULL,
  content TEXT NOT NULL,
  proof_tier public.proof_tier DEFAULT 'declaration',
  face public.contribution_face NOT NULL,
  moderation_status public.moderation_status DEFAULT 'pending',
  is_anonymous BOOLEAN DEFAULT false,
  source_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_facts_event_id ON public.facts(event_id);
CREATE INDEX idx_facts_contributor_id ON public.facts(contributor_id);
CREATE INDEX idx_facts_face ON public.facts(face);
CREATE INDEX idx_facts_proof_tier ON public.facts(proof_tier);

ALTER TABLE public.facts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Approved facts are viewable by everyone"
  ON public.facts FOR SELECT
  USING (moderation_status = 'approved' OR moderation_status = 'pending');

CREATE POLICY "Authenticated users can create facts"
  ON public.facts FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update own pending facts"
  ON public.facts FOR UPDATE
  TO authenticated
  USING (
    contributor_id = auth.uid()
    AND moderation_status = 'pending'
  );

CREATE POLICY "Admins can update any fact"
  ON public.facts FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE TRIGGER update_facts_updated_at
  BEFORE UPDATE ON public.facts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
