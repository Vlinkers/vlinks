
CREATE TABLE public.evidence (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  fact_id UUID NOT NULL REFERENCES public.facts(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER,
  evidence_type TEXT NOT NULL CHECK (evidence_type IN (
    'photo', 'document', 'invoice', 'inspection_report',
    'insurance_doc', 'registration', 'listing_screenshot', 'video', 'other'
  )),
  description TEXT,
  is_redacted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_evidence_fact_id ON public.evidence(fact_id);

ALTER TABLE public.evidence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Evidence viewable by everyone"
  ON public.evidence FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can upload evidence"
  ON public.evidence FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.recalculate_proof_tier()
RETURNS TRIGGER AS $$
DECLARE
  max_tier public.proof_tier;
  tier3_types TEXT[] := ARRAY['invoice', 'inspection_report', 'insurance_doc', 'registration'];
  tier2_types TEXT[] := ARRAY['photo', 'document', 'listing_screenshot', 'video', 'other'];
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.evidence
    WHERE fact_id = COALESCE(NEW.fact_id, OLD.fact_id)
    AND evidence_type = ANY(tier3_types)
  ) THEN
    max_tier := 'verified';
  ELSIF EXISTS (
    SELECT 1 FROM public.evidence
    WHERE fact_id = COALESCE(NEW.fact_id, OLD.fact_id)
    AND evidence_type = ANY(tier2_types)
  ) THEN
    max_tier := 'documented';
  ELSE
    max_tier := 'declaration';
  END IF;

  UPDATE public.facts
  SET proof_tier = max_tier, updated_at = now()
  WHERE id = COALESCE(NEW.fact_id, OLD.fact_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_recalculate_proof_tier
  AFTER INSERT OR DELETE ON public.evidence
  FOR EACH ROW
  EXECUTE FUNCTION public.recalculate_proof_tier();
