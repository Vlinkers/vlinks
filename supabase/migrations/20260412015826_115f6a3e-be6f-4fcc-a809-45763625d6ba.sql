
CREATE OR REPLACE FUNCTION public.check_mileage_on_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prev_mileage INTEGER;
  prev_date DATE;
  diff INTEGER;
BEGIN
  IF NEW.mileage_at_event IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT mileage_at_event, event_date INTO prev_mileage, prev_date
  FROM public.events
  WHERE vin_id = NEW.vin_id
  AND mileage_at_event IS NOT NULL
  AND event_date < NEW.event_date
  AND id != NEW.id
  ORDER BY event_date DESC
  LIMIT 1;

  IF prev_mileage IS NOT NULL AND NEW.mileage_at_event < prev_mileage THEN
    diff := prev_mileage - NEW.mileage_at_event;
    INSERT INTO public.red_flags (vin_id, flag_type, severity, title, description, supporting_facts)
    VALUES (
      NEW.vin_id,
      'odometer_rollback',
      CASE
        WHEN diff > 10000 THEN 'critical'
        WHEN diff > 1000 THEN 'high'
        ELSE 'medium'
      END,
      'Recul d''odometre detecte: ' || prev_mileage || ' km vers ' || NEW.mileage_at_event || ' km',
      'Releve precedent: ' || prev_mileage || ' km le ' || prev_date || '. Nouveau releve: ' || NEW.mileage_at_event || ' km le ' || NEW.event_date || '. Difference: -' || diff || ' km.',
      ARRAY[]::UUID[]
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_check_mileage
  AFTER INSERT OR UPDATE OF mileage_at_event ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.check_mileage_on_event();
