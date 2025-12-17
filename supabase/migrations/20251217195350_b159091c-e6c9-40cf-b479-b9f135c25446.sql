-- Add owner-related fields to raw_contributions table
ALTER TABLE public.raw_contributions 
ADD COLUMN IF NOT EXISTS is_owner_contribution boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS intervention_type text,
ADD COLUMN IF NOT EXISTS intervention_date date,
ADD COLUMN IF NOT EXISTS mileage_at_intervention integer;

-- Add owner-related fields to public_contributions table
ALTER TABLE public.public_contributions 
ADD COLUMN IF NOT EXISTS is_owner_contribution boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS intervention_type text,
ADD COLUMN IF NOT EXISTS intervention_date date,
ADD COLUMN IF NOT EXISTS mileage_at_intervention integer;

-- Create owner_verifications table for tracking verified owners
CREATE TABLE IF NOT EXISTS public.owner_verifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vin_id uuid NOT NULL REFERENCES public.vins(id) ON DELETE CASCADE,
  verification_status text NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
  document_path text,
  document_type text,
  verified_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, vin_id)
);

-- Enable RLS on owner_verifications
ALTER TABLE public.owner_verifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own verifications
CREATE POLICY "Users can view their own verifications"
ON public.owner_verifications
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create verification requests
CREATE POLICY "Users can create verification requests"
ON public.owner_verifications
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their pending verifications
CREATE POLICY "Users can update their pending verifications"
ON public.owner_verifications
FOR UPDATE
USING (auth.uid() = user_id AND verification_status = 'pending');

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_owner_verifications_user_vin ON public.owner_verifications(user_id, vin_id);
CREATE INDEX IF NOT EXISTS idx_owner_verifications_vin ON public.owner_verifications(vin_id);

-- Create storage bucket for owner verification documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('owner-verification-docs', 'owner-verification-docs', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policy for owner verification documents (private, only owner can access)
CREATE POLICY "Users can upload verification documents"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'owner-verification-docs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their verification documents"
ON storage.objects
FOR SELECT
USING (bucket_id = 'owner-verification-docs' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Add trigger for updated_at on owner_verifications
CREATE TRIGGER update_owner_verifications_updated_at
BEFORE UPDATE ON public.owner_verifications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();