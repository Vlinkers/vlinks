-- Replace the strict UNIQUE(vin_id) constraint with a partial unique index
-- that only enforces uniqueness for ACTIVE claims. Revoked claims should not
-- block new claim attempts (by the same or another user).

ALTER TABLE public.owner_claims DROP CONSTRAINT IF EXISTS unique_active_claim_per_vin;

CREATE UNIQUE INDEX IF NOT EXISTS owner_claims_unique_active_per_vin
ON public.owner_claims (vin_id)
WHERE status = 'active';

-- Also allow a user to retry after their own claim was revoked: ensure no
-- accidental duplicate active claim per (user, vin).
CREATE UNIQUE INDEX IF NOT EXISTS owner_claims_unique_active_per_user_vin
ON public.owner_claims (user_id, vin_id)
WHERE status = 'active';