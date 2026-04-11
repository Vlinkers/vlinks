
CREATE OR REPLACE FUNCTION public.update_event_facts_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.events SET
      facts_count = facts_count + 1,
      face_a_count = CASE WHEN NEW.face = 'face_a' THEN face_a_count + 1 ELSE face_a_count END,
      face_b_count = CASE WHEN NEW.face = 'face_b' THEN face_b_count + 1 ELSE face_b_count END,
      updated_at = now()
    WHERE id = NEW.event_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.events SET
      facts_count = GREATEST(facts_count - 1, 0),
      face_a_count = CASE WHEN OLD.face = 'face_a' THEN GREATEST(face_a_count - 1, 0) ELSE face_a_count END,
      face_b_count = CASE WHEN OLD.face = 'face_b' THEN GREATEST(face_b_count - 1, 0) ELSE face_b_count END,
      updated_at = now()
    WHERE id = OLD.event_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_update_event_facts_count
  AFTER INSERT OR DELETE ON public.facts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_event_facts_count();

CREATE OR REPLACE FUNCTION public.update_vin_events_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.vins SET events_count = events_count + 1, updated_at = now()
    WHERE id = NEW.vin_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.vins SET events_count = GREATEST(events_count - 1, 0), updated_at = now()
    WHERE id = OLD.vin_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_update_vin_events_count
  AFTER INSERT OR DELETE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_vin_events_count();

CREATE OR REPLACE FUNCTION public.update_vin_red_flags_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.is_active THEN
    UPDATE public.vins SET red_flags_count = red_flags_count + 1, updated_at = now()
    WHERE id = NEW.vin_id;
  ELSIF TG_OP = 'DELETE' AND OLD.is_active THEN
    UPDATE public.vins SET red_flags_count = GREATEST(red_flags_count - 1, 0), updated_at = now()
    WHERE id = OLD.vin_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.is_active != NEW.is_active THEN
    UPDATE public.vins SET
      red_flags_count = CASE
        WHEN NEW.is_active THEN red_flags_count + 1
        ELSE GREATEST(red_flags_count - 1, 0)
      END,
      updated_at = now()
    WHERE id = NEW.vin_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_update_vin_red_flags_count
  AFTER INSERT OR DELETE OR UPDATE OF is_active ON public.red_flags
  FOR EACH ROW
  EXECUTE FUNCTION public.update_vin_red_flags_count();

CREATE OR REPLACE FUNCTION public.update_contributor_facts_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.contributors SET facts_count = facts_count + 1, updated_at = now()
    WHERE id = NEW.contributor_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.contributors SET facts_count = GREATEST(facts_count - 1, 0), updated_at = now()
    WHERE id = OLD.contributor_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_update_contributor_facts_count
  AFTER INSERT OR DELETE ON public.facts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_contributor_facts_count();

CREATE OR REPLACE FUNCTION public.update_event_verified_status()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.events SET
    is_verified = EXISTS (
      SELECT 1 FROM public.facts
      WHERE event_id = COALESCE(NEW.event_id, OLD.event_id)
      AND proof_tier = 'verified'
      AND moderation_status = 'approved'
    ),
    updated_at = now()
  WHERE id = COALESCE(NEW.event_id, OLD.event_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_update_event_verified
  AFTER INSERT OR UPDATE OF proof_tier, moderation_status OR DELETE ON public.facts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_event_verified_status();
