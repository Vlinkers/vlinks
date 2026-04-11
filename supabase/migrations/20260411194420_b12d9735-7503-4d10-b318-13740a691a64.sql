
ALTER TABLE public.owner_verifications
  ADD COLUMN IF NOT EXISTS verification_tier public.owner_verification_tier,
  ADD COLUMN IF NOT EXISTS certificate_file_path TEXT,
  ADD COLUMN IF NOT EXISTS vin_plate_photo_path TEXT,
  ADD COLUMN IF NOT EXISTS chain_of_trust_from UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS chain_of_trust_confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS reviewer_id UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS notes TEXT;

CREATE OR REPLACE FUNCTION public.determine_verification_tier()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.chain_of_trust_from IS NOT NULL AND NEW.chain_of_trust_confirmed_at IS NOT NULL THEN
    NEW.verification_tier := 'chain_of_trust';
  ELSIF NEW.certificate_file_path IS NOT NULL AND NEW.vin_plate_photo_path IS NOT NULL THEN
    NEW.verification_tier := 'certificate_plus_vin';
  ELSIF NEW.certificate_file_path IS NOT NULL THEN
    NEW.verification_tier := 'certificate_only';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trigger_determine_verification_tier
  BEFORE INSERT OR UPDATE OF certificate_file_path, vin_plate_photo_path, chain_of_trust_from, chain_of_trust_confirmed_at
  ON public.owner_verifications
  FOR EACH ROW
  EXECUTE FUNCTION public.determine_verification_tier();

CREATE OR REPLACE FUNCTION public.on_verification_approved()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.verification_status = 'verified' AND (OLD.verification_status IS NULL OR OLD.verification_status != 'verified') THEN
    UPDATE public.contributors
    SET role = 'owner_verified', updated_at = now()
    WHERE user_id = NEW.user_id
    AND vin_id = NEW.vin_id
    AND role = 'owner_unverified';

    UPDATE public.profiles
    SET verification_tier = NEW.verification_tier, updated_at = now()
    WHERE user_id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_on_verification_approved
  AFTER UPDATE OF verification_status ON public.owner_verifications
  FOR EACH ROW
  EXECUTE FUNCTION public.on_verification_approved();
