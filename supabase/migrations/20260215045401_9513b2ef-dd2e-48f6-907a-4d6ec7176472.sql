
-- Remove AI-specific columns from public_contributions
ALTER TABLE public.public_contributions DROP COLUMN IF EXISTS ai_model_used;
ALTER TABLE public.public_contributions DROP COLUMN IF EXISTS key_facts;
ALTER TABLE public.public_contributions DROP COLUMN IF EXISTS mechanic_signals;
ALTER TABLE public.public_contributions DROP COLUMN IF EXISTS risk_indicators;
ALTER TABLE public.public_contributions DROP COLUMN IF EXISTS document_analysis;
ALTER TABLE public.public_contributions DROP COLUMN IF EXISTS document_vs_oral_gap;
ALTER TABLE public.public_contributions DROP COLUMN IF EXISTS confidence_level;
ALTER TABLE public.public_contributions DROP COLUMN IF EXISTS document_text_extracted;
ALTER TABLE public.public_contributions DROP COLUMN IF EXISTS source_evidence;
ALTER TABLE public.public_contributions DROP COLUMN IF EXISTS technical_findings;
ALTER TABLE public.public_contributions DROP COLUMN IF EXISTS risk_level;
ALTER TABLE public.public_contributions DROP COLUMN IF EXISTS confidence_source;
ALTER TABLE public.public_contributions DROP COLUMN IF EXISTS source_credibility;
ALTER TABLE public.public_contributions DROP COLUMN IF EXISTS has_document_attached;
ALTER TABLE public.public_contributions DROP COLUMN IF EXISTS raw_user_content;

-- Remove AI-specific columns from raw_contributions
ALTER TABLE public.raw_contributions DROP COLUMN IF EXISTS extracted_document_text;
ALTER TABLE public.raw_contributions DROP COLUMN IF EXISTS extracted_document_stats;
ALTER TABLE public.raw_contributions DROP COLUMN IF EXISTS needs_ocr;

-- Remove processing_status from raw_contributions (no longer needed without AI)
ALTER TABLE public.raw_contributions DROP COLUMN IF EXISTS processing_status;
ALTER TABLE public.raw_contributions DROP COLUMN IF EXISTS processing_error;

-- Make summary_public nullable since contributions are now stored as-is
-- Actually keep it NOT NULL but it will just be the user's summary directly

-- Add direct INSERT policy for authenticated users on public_contributions
CREATE POLICY "Authenticated users can insert contributions"
ON public.public_contributions
FOR INSERT
WITH CHECK (auth.uid() = user_id);
