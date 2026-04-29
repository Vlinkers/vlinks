ALTER TABLE public.evidence
ADD COLUMN IF NOT EXISTS media_type text;

COMMENT ON COLUMN public.evidence.media_type IS 'Classification métier du média: vehicle_photo, document, diagnostic, maintenance_evidence.';

CREATE OR REPLACE FUNCTION public.classify_evidence_media_type()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_has_maintenance boolean := false;
  v_event_title text := null;
  v_event_type text := null;
BEGIN
  IF NEW.media_type IS NOT NULL THEN
    IF NEW.media_type NOT IN ('vehicle_photo', 'document', 'diagnostic', 'maintenance_evidence') THEN
      RAISE EXCEPTION 'Invalid evidence media_type: %', NEW.media_type;
    END IF;
    RETURN NEW;
  END IF;

  SELECT
    COALESCE(f.metadata ? 'maintenance', false),
    e.title,
    e.event_type::text
  INTO v_has_maintenance, v_event_title, v_event_type
  FROM public.facts f
  LEFT JOIN public.events e ON e.id = f.event_id
  WHERE f.id = NEW.fact_id;

  IF v_has_maintenance THEN
    NEW.media_type := 'maintenance_evidence';
  ELSIF COALESCE(v_event_title, '') ILIKE 'Signalement :%' THEN
    NEW.media_type := 'diagnostic';
  ELSIF lower(COALESCE(NEW.evidence_type, '')) IN (
    'document', 'invoice', 'inspection_report', 'insurance_doc', 'registration',
    'listing_screenshot', 'vehicle_history', 'other_document', 'other'
  ) OR COALESCE(NEW.file_path, '') LIKE 'vin-documents/%'
    OR lower(COALESCE(NEW.file_type, '')) = 'application/pdf' THEN
    NEW.media_type := 'document';
  ELSIF lower(COALESCE(NEW.evidence_type, '')) IN ('photo', 'image', 'vehicle_photo')
    AND (lower(COALESCE(NEW.file_type, '')) LIKE 'image/%' OR COALESCE(NEW.file_path, '') LIKE 'vin-photos/%') THEN
    NEW.media_type := 'vehicle_photo';
  ELSE
    NEW.media_type := 'document';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_classify_evidence_media_type ON public.evidence;
CREATE TRIGGER trg_classify_evidence_media_type
BEFORE INSERT OR UPDATE OF evidence_type, file_type, file_path, fact_id, media_type
ON public.evidence
FOR EACH ROW
EXECUTE FUNCTION public.classify_evidence_media_type();

UPDATE public.evidence ev
SET media_type = CASE
  WHEN COALESCE(f.metadata ? 'maintenance', false) THEN 'maintenance_evidence'
  WHEN EXISTS (
    SELECT 1
    FROM public.red_flags rf
    WHERE ev.fact_id = ANY(COALESCE(rf.supporting_facts, ARRAY[]::uuid[]))
  ) OR COALESCE(evt.title, '') ILIKE 'Signalement :%' THEN 'diagnostic'
  WHEN lower(COALESCE(ev.evidence_type, '')) IN (
    'document', 'invoice', 'inspection_report', 'insurance_doc', 'registration',
    'listing_screenshot', 'vehicle_history', 'other_document', 'other'
  ) OR COALESCE(ev.file_path, '') LIKE 'vin-documents/%'
    OR lower(COALESCE(ev.file_type, '')) = 'application/pdf' THEN 'document'
  WHEN lower(COALESCE(ev.evidence_type, '')) IN ('photo', 'image', 'vehicle_photo')
    AND (lower(COALESCE(ev.file_type, '')) LIKE 'image/%' OR COALESCE(ev.file_path, '') LIKE 'vin-photos/%') THEN 'vehicle_photo'
  ELSE 'document'
END
FROM public.facts f
LEFT JOIN public.events evt ON evt.id = f.event_id
WHERE ev.fact_id = f.id;

CREATE INDEX IF NOT EXISTS idx_evidence_media_type ON public.evidence(media_type);
CREATE INDEX IF NOT EXISTS idx_evidence_fact_media_type ON public.evidence(fact_id, media_type);