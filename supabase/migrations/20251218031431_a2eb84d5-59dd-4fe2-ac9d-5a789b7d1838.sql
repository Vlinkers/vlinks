-- =====================================================
-- SECURITY FIX: Prevent user_id exposure in public data
-- =====================================================

-- 1. Add public_id to profiles for anonymous public identification
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS public_id text UNIQUE;

-- Generate unique public_id for existing profiles
UPDATE public.profiles 
SET public_id = substr(md5(random()::text || user_id::text), 1, 12)
WHERE public_id IS NULL;

-- Create trigger to auto-generate public_id for new profiles
CREATE OR REPLACE FUNCTION public.generate_profile_public_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.public_id IS NULL THEN
    NEW.public_id := substr(md5(random()::text || NEW.user_id::text), 1, 12);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ensure_profile_public_id ON public.profiles;
CREATE TRIGGER ensure_profile_public_id
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_profile_public_id();

-- 2. Add author fields to public_contributions (instead of exposing user_id)
ALTER TABLE public.public_contributions 
ADD COLUMN IF NOT EXISTS author_label text NOT NULL DEFAULT 'Anonyme',
ADD COLUMN IF NOT EXISTS author_public_id text;

-- 3. Update existing public_contributions with author info
UPDATE public.public_contributions pc
SET 
  author_label = CASE 
    WHEN pc.is_anonymous THEN 'Anonyme'
    ELSE COALESCE(p.username, p.display_name, 'Contributeur')
  END,
  author_public_id = CASE 
    WHEN pc.is_anonymous THEN NULL
    ELSE p.public_id
  END
FROM public.profiles p
WHERE pc.user_id = p.user_id;

-- 4. CRITICAL: Update vin_contributions RLS - remove public access
-- This table should NOT be publicly readable as it contains user_id
DROP POLICY IF EXISTS "Anyone can view contributions" ON public.vin_contributions;

-- Only allow users to view their own contributions
CREATE POLICY "Users can view own contributions"
ON public.vin_contributions
FOR SELECT
USING (auth.uid() = user_id);

-- 5. Update public_contributions RLS to use a view-like approach
-- Drop existing SELECT policies
DROP POLICY IF EXISTS "Anyone can view publishable contributions" ON public.public_contributions;
DROP POLICY IF EXISTS "Users can view their own contributions" ON public.public_contributions;

-- Create new restricted SELECT policy that only exposes safe columns
-- Note: RLS can't restrict columns, so we'll handle this via the app layer
-- But we can at least ensure only publishable ones are visible
CREATE POLICY "Public can view publishable contributions"
ON public.public_contributions
FOR SELECT
USING (publishable = true);

-- Users can also see their own (for profile page)
CREATE POLICY "Users can view own contributions"
ON public.public_contributions
FOR SELECT
USING (auth.uid() = user_id);

-- 6. Update contribution_documents RLS - remove public access
DROP POLICY IF EXISTS "Anyone can view documents" ON public.contribution_documents;

-- Create policy for users to only see documents from their own contributions
CREATE POLICY "Users can view documents from own contributions"
ON public.contribution_documents
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.vin_contributions vc
    WHERE vc.id = contribution_documents.contribution_id
    AND vc.user_id = auth.uid()
  )
);

-- Allow viewing documents for publishable public contributions (via service role only in practice)
-- Actually, for public display, photos should go through a public storage bucket URL
-- Documents in private bucket shouldn't be directly accessible