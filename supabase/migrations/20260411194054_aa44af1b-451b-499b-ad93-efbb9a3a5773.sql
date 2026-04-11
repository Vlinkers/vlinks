
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS preferred_role public.contributor_role DEFAULT 'buyer',
  ADD COLUMN IF NOT EXISTS verification_tier public.owner_verification_tier,
  ADD COLUMN IF NOT EXISTS is_professional BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS professional_type TEXT CHECK (professional_type IN ('mechanic', 'inspector', 'dealer', 'bodyshop', 'insurer')),
  ADD COLUMN IF NOT EXISTS professional_license TEXT,
  ADD COLUMN IF NOT EXISTS total_facts_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tier3_facts_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vins_contributed_to INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS trust_level TEXT DEFAULT 'new' CHECK (trust_level IN ('new', 'active', 'trusted', 'expert'));

CREATE INDEX IF NOT EXISTS idx_profiles_professional ON public.profiles(is_professional) WHERE is_professional = true;
CREATE INDEX IF NOT EXISTS idx_profiles_trust_level ON public.profiles(trust_level);

CREATE OR REPLACE FUNCTION public.calculate_trust_level(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  facts_total INTEGER;
  tier3_total INTEGER;
  vins_total INTEGER;
BEGIN
  SELECT total_facts_count, tier3_facts_count, vins_contributed_to
  INTO facts_total, tier3_total, vins_total
  FROM public.profiles WHERE user_id = p_user_id;

  IF tier3_total >= 10 AND vins_total >= 5 THEN
    RETURN 'expert';
  ELSIF facts_total >= 20 AND tier3_total >= 3 THEN
    RETURN 'trusted';
  ELSIF facts_total >= 5 THEN
    RETURN 'active';
  ELSE
    RETURN 'new';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
