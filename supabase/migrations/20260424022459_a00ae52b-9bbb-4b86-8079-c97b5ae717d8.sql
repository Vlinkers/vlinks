CREATE OR REPLACE FUNCTION public.vin_has_active_owner_claim(p_vin_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.owner_claims
    WHERE vin_id = p_vin_id
      AND status = 'active'
  );
$$;

REVOKE ALL ON FUNCTION public.vin_has_active_owner_claim(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.vin_has_active_owner_claim(uuid) TO authenticated;