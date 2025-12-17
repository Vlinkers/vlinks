-- Table pour stocker les contributions brutes (jamais exposées publiquement)
CREATE TABLE public.raw_contributions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  vin_id UUID NOT NULL REFERENCES public.vins(id) ON DELETE CASCADE,
  contribution_type public.contribution_type NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  details TEXT,
  is_anonymous BOOLEAN DEFAULT false,
  processing_status TEXT NOT NULL DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
  processing_error TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table pour stocker les contributions traitées par l'IA (affichage public)
CREATE TABLE public.public_contributions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  raw_contribution_id UUID NOT NULL REFERENCES public.raw_contributions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  vin_id UUID NOT NULL REFERENCES public.vins(id) ON DELETE CASCADE,
  contribution_type public.contribution_type NOT NULL,
  summary_public TEXT NOT NULL,
  technical_findings TEXT[] DEFAULT '{}',
  risk_level INTEGER CHECK (risk_level >= 1 AND risk_level <= 5),
  confidence_source TEXT,
  is_anonymous BOOLEAN DEFAULT false,
  publishable BOOLEAN NOT NULL DEFAULT false,
  ai_model_used TEXT,
  processed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on raw_contributions
ALTER TABLE public.raw_contributions ENABLE ROW LEVEL SECURITY;

-- RLS policies for raw_contributions (private - only owner can see)
CREATE POLICY "Users can view their own raw contributions"
ON public.raw_contributions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create raw contributions"
ON public.raw_contributions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own raw contributions"
ON public.raw_contributions
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own raw contributions"
ON public.raw_contributions
FOR DELETE
USING (auth.uid() = user_id);

-- Enable RLS on public_contributions
ALTER TABLE public.public_contributions ENABLE ROW LEVEL SECURITY;

-- RLS policies for public_contributions (public read, system write)
CREATE POLICY "Anyone can view publishable contributions"
ON public.public_contributions
FOR SELECT
USING (publishable = true);

CREATE POLICY "Users can view their own contributions"
ON public.public_contributions
FOR SELECT
USING (auth.uid() = user_id);

-- Service role only for insert/update (edge function)
CREATE POLICY "Service role can insert public contributions"
ON public.public_contributions
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Service role can update public contributions"
ON public.public_contributions
FOR UPDATE
USING (true);

-- Indexes for performance
CREATE INDEX idx_raw_contributions_user_id ON public.raw_contributions(user_id);
CREATE INDEX idx_raw_contributions_vin_id ON public.raw_contributions(vin_id);
CREATE INDEX idx_raw_contributions_status ON public.raw_contributions(processing_status);
CREATE INDEX idx_public_contributions_vin_id ON public.public_contributions(vin_id);
CREATE INDEX idx_public_contributions_publishable ON public.public_contributions(publishable);

-- Triggers for updated_at
CREATE TRIGGER update_raw_contributions_updated_at
BEFORE UPDATE ON public.raw_contributions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_public_contributions_updated_at
BEFORE UPDATE ON public.public_contributions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();