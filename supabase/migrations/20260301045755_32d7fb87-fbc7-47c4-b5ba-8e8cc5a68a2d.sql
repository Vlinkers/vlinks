
-- Drop policies that depend on publishable column
DROP POLICY IF EXISTS "Public can view publishable contributions" ON public.public_contributions;

-- Recreate as simple public SELECT policy
CREATE POLICY "Public can view contributions" ON public.public_contributions FOR SELECT USING (true);

-- Drop service role policies no longer needed
DROP POLICY IF EXISTS "Service role can insert public contributions" ON public.public_contributions;
DROP POLICY IF EXISTS "Service role can update public contributions" ON public.public_contributions;

-- Remove AI-related columns from public_contributions
ALTER TABLE public.public_contributions
  DROP COLUMN IF EXISTS summary_public,
  DROP COLUMN IF EXISTS raw_contribution_id,
  DROP COLUMN IF EXISTS processed_at,
  DROP COLUMN IF EXISTS publishable;

-- Remove AI/OCR columns from raw_contributions  
ALTER TABLE public.raw_contributions
  DROP COLUMN IF EXISTS extracted_document_text,
  DROP COLUMN IF EXISTS extracted_document_stats,
  DROP COLUMN IF EXISTS needs_ocr,
  DROP COLUMN IF EXISTS processing_status;
