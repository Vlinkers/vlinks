
-- Improve on_verification_approved: ensure an owner_verified contributor exists
-- regardless of the previous role (or absence) for that user/vin.
CREATE OR REPLACE FUNCTION public.on_verification_approved()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_existing_id uuid;
  v_display_name text;
BEGIN
  IF NEW.verification_status = 'verified'
     AND (OLD.verification_status IS NULL OR OLD.verification_status != 'verified') THEN

    -- Get a display name from profile if available
    SELECT COALESCE(p.username, p.display_name)
      INTO v_display_name
    FROM public.profiles p
    WHERE p.user_id = NEW.user_id
    LIMIT 1;

    -- Find any existing contributor row for this user+vin
    SELECT id INTO v_existing_id
    FROM public.contributors
    WHERE user_id = NEW.user_id AND vin_id = NEW.vin_id
    LIMIT 1;

    IF v_existing_id IS NOT NULL THEN
      UPDATE public.contributors
      SET role = 'owner_verified',
          face = 'face_b',
          display_name = COALESCE(display_name, v_display_name),
          updated_at = now()
      WHERE id = v_existing_id;
    ELSE
      INSERT INTO public.contributors (user_id, vin_id, role, face, display_name, is_anonymous)
      VALUES (NEW.user_id, NEW.vin_id, 'owner_verified', 'face_b', v_display_name, false);
    END IF;

    UPDATE public.profiles
    SET verification_tier = NEW.verification_tier, updated_at = now()
    WHERE user_id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$function$;

-- Make sure the trigger is attached (it should already exist; CREATE OR REPLACE keeps it).
-- Backfill: for every active owner_claim with a verified verification, ensure the contributor is owner_verified.
DO $$
DECLARE
  rec RECORD;
  v_existing_id uuid;
  v_display_name text;
BEGIN
  FOR rec IN
    SELECT DISTINCT oc.user_id, oc.vin_id
    FROM public.owner_claims oc
    WHERE oc.status = 'active'
      AND EXISTS (
        SELECT 1 FROM public.owner_verifications ov
        WHERE ov.user_id = oc.user_id
          AND ov.vin_id = oc.vin_id
          AND ov.verification_status = 'verified'
      )
  LOOP
    SELECT COALESCE(p.username, p.display_name)
      INTO v_display_name
    FROM public.profiles p WHERE p.user_id = rec.user_id LIMIT 1;

    SELECT id INTO v_existing_id
    FROM public.contributors
    WHERE user_id = rec.user_id AND vin_id = rec.vin_id LIMIT 1;

    IF v_existing_id IS NOT NULL THEN
      UPDATE public.contributors
      SET role = 'owner_verified', face = 'face_b',
          display_name = COALESCE(display_name, v_display_name),
          updated_at = now()
      WHERE id = v_existing_id;
    ELSE
      INSERT INTO public.contributors (user_id, vin_id, role, face, display_name, is_anonymous)
      VALUES (rec.user_id, rec.vin_id, 'owner_verified', 'face_b', v_display_name, false);
    END IF;
  END LOOP;
END $$;
