
-- Function: Calculate community score (X axis of trust matrix)
CREATE OR REPLACE FUNCTION public.calculate_community_score(p_vin_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  total_face_a INTEGER;
  unique_contributors INTEGER;
  tier3_count INTEGER;
  tier2_count INTEGER;
  tier1_count INTEGER;
  score INTEGER := 0;
BEGIN
  SELECT COUNT(*) INTO total_face_a
  FROM public.facts f
  JOIN public.events e ON f.event_id = e.id
  WHERE e.vin_id = p_vin_id AND f.face = 'face_a' AND f.moderation_status = 'approved';

  SELECT COUNT(DISTINCT f.contributor_id) INTO unique_contributors
  FROM public.facts f
  JOIN public.events e ON f.event_id = e.id
  WHERE e.vin_id = p_vin_id AND f.face = 'face_a' AND f.moderation_status = 'approved';

  SELECT
    COUNT(*) FILTER (WHERE f.proof_tier = 'verified'),
    COUNT(*) FILTER (WHERE f.proof_tier = 'documented'),
    COUNT(*) FILTER (WHERE f.proof_tier = 'declaration')
  INTO tier3_count, tier2_count, tier1_count
  FROM public.facts f
  JOIN public.events e ON f.event_id = e.id
  WHERE e.vin_id = p_vin_id AND f.face = 'face_a' AND f.moderation_status = 'approved';

  score := score + LEAST(total_face_a * 3, 30);
  score := score + LEAST(unique_contributors * 5, 25);
  score := score + LEAST(tier3_count * 15, 30);
  score := score + LEAST(tier2_count * 5, 10);
  score := score + LEAST(tier1_count * 1, 5);

  RETURN LEAST(score, 100);
END;
$$;

-- Function: Calculate owner transparency score (Y axis of trust matrix)
CREATE OR REPLACE FUNCTION public.calculate_owner_transparency(p_vin_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  owner_exists BOOLEAN;
  verification_tier_val TEXT;
  face_b_facts INTEGER;
  face_b_tier3 INTEGER;
  face_a_events_count INTEGER;
  responded_events INTEGER;
  score INTEGER := 0;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM public.contributors
    WHERE vin_id = p_vin_id AND role IN ('owner_verified', 'owner_unverified')
  ) INTO owner_exists;

  IF NOT owner_exists THEN
    RETURN 0;
  END IF;

  SELECT ov.verification_tier::TEXT INTO verification_tier_val
  FROM public.owner_verifications ov
  WHERE ov.vin_id = p_vin_id AND ov.verification_status = 'verified'
  ORDER BY
    CASE ov.verification_tier
      WHEN 'chain_of_trust' THEN 3
      WHEN 'certificate_plus_vin' THEN 2
      WHEN 'certificate_only' THEN 1
    END DESC
  LIMIT 1;

  IF verification_tier_val = 'chain_of_trust' THEN score := score + 30;
  ELSIF verification_tier_val = 'certificate_plus_vin' THEN score := score + 20;
  ELSIF verification_tier_val = 'certificate_only' THEN score := score + 10;
  END IF;

  SELECT COUNT(*), COUNT(*) FILTER (WHERE f.proof_tier = 'verified')
  INTO face_b_facts, face_b_tier3
  FROM public.facts f
  JOIN public.events e ON f.event_id = e.id
  WHERE e.vin_id = p_vin_id AND f.face = 'face_b' AND f.moderation_status = 'approved';

  score := score + LEAST(face_b_facts * 5, 20);
  score := score + LEAST(face_b_tier3 * 10, 10);

  SELECT COUNT(DISTINCT e.id) INTO face_a_events_count
  FROM public.events e
  JOIN public.facts f ON f.event_id = e.id
  WHERE e.vin_id = p_vin_id AND f.face = 'face_a' AND f.moderation_status = 'approved';

  SELECT COUNT(DISTINCT e.id) INTO responded_events
  FROM public.events e
  WHERE e.vin_id = p_vin_id
  AND e.face_a_count > 0 AND e.face_b_count > 0;

  IF face_a_events_count > 0 THEN
    score := score + LEAST(
      (responded_events::FLOAT / face_a_events_count * 40)::INTEGER,
      40
    );
  END IF;

  RETURN LEAST(score, 100);
END;
$$;

-- Function: Refresh vins scores
CREATE OR REPLACE FUNCTION public.refresh_vin_scores(p_vin_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.vins SET
    community_score = public.calculate_community_score(p_vin_id),
    owner_transparency_score = public.calculate_owner_transparency(p_vin_id),
    updated_at = now()
  WHERE id = p_vin_id;
END;
$$;

-- Trigger function: refresh scores on fact changes
CREATE OR REPLACE FUNCTION public.trigger_refresh_scores_on_fact()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_vin_id UUID;
BEGIN
  SELECT e.vin_id INTO v_vin_id
  FROM public.events e
  WHERE e.id = COALESCE(NEW.event_id, OLD.event_id);

  IF v_vin_id IS NOT NULL THEN
    PERFORM public.refresh_vin_scores(v_vin_id);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger
CREATE TRIGGER trigger_refresh_scores_on_fact_change
  AFTER INSERT OR UPDATE OF moderation_status OR DELETE ON public.facts
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_refresh_scores_on_fact();
