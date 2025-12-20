-- Create owner_claims table for V1 claim-only feature
-- A VIN can only have one active claim at a time

CREATE TABLE public.owner_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vin_id UUID NOT NULL REFERENCES public.vins(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  revoked_at TIMESTAMP WITH TIME ZONE,
  
  -- Ensure only one active claim per VIN
  CONSTRAINT unique_active_claim_per_vin UNIQUE (vin_id) DEFERRABLE INITIALLY DEFERRED
);

-- Create partial unique index for active claims only
DROP INDEX IF EXISTS idx_unique_active_claim_per_vin;
CREATE UNIQUE INDEX idx_unique_active_claim_per_vin ON public.owner_claims (vin_id) WHERE status = 'active';

-- Enable RLS
ALTER TABLE public.owner_claims ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own claims"
ON public.owner_claims FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create claims"
ON public.owner_claims FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own claims"
ON public.owner_claims FOR UPDATE
USING (auth.uid() = user_id);

-- Index for faster lookups
CREATE INDEX idx_owner_claims_user_id ON public.owner_claims(user_id);
CREATE INDEX idx_owner_claims_vin_id_status ON public.owner_claims(vin_id, status);