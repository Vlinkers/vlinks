-- Add ended_at column to track when ownership ended
ALTER TABLE public.owner_verifications 
ADD COLUMN ended_at timestamp with time zone DEFAULT NULL;

-- Add index for faster lookup of active verifications
CREATE INDEX idx_owner_verifications_active 
ON public.owner_verifications (user_id, vin_id) 
WHERE ended_at IS NULL AND verification_status = 'verified';

-- Add policy to allow users to update ended_at on their verified records
DROP POLICY IF EXISTS "Users can update their pending verifications" ON public.owner_verifications;

CREATE POLICY "Users can update their own verifications" 
ON public.owner_verifications 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Add is_former_owner column to raw_contributions to mark historical ownership
ALTER TABLE public.raw_contributions 
ADD COLUMN is_former_owner boolean DEFAULT false;