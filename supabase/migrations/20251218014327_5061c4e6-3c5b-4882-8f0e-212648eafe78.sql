-- Create vin_decodes table to cache NHTSA API results
CREATE TABLE public.vin_decodes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vin character varying(17) NOT NULL UNIQUE,
  make text,
  model text,
  model_year integer,
  trim text,
  engine text,
  body_class text,
  drive_type text,
  fuel_type text,
  is_valid boolean NOT NULL DEFAULT true,
  error_message text,
  raw_response jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.vin_decodes ENABLE ROW LEVEL SECURITY;

-- Anyone can read decoded VIN data (public cache)
CREATE POLICY "Anyone can view vin decodes"
ON public.vin_decodes
FOR SELECT
USING (true);

-- Service role can insert/update (edge function)
CREATE POLICY "Service role can insert vin decodes"
ON public.vin_decodes
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Service role can update vin decodes"
ON public.vin_decodes
FOR UPDATE
USING (true);

-- Index for fast lookups
CREATE INDEX idx_vin_decodes_vin ON public.vin_decodes(vin);

-- Trigger for updated_at
CREATE TRIGGER update_vin_decodes_updated_at
BEFORE UPDATE ON public.vin_decodes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();