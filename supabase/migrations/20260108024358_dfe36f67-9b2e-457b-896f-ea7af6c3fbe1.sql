-- Add PDF extraction fields to raw_contributions
ALTER TABLE public.raw_contributions
ADD COLUMN IF NOT EXISTS extracted_document_text text,
ADD COLUMN IF NOT EXISTS extracted_document_stats jsonb,
ADD COLUMN IF NOT EXISTS needs_ocr boolean DEFAULT false;

-- Add source_evidence to public_contributions
ALTER TABLE public.public_contributions
ADD COLUMN IF NOT EXISTS source_evidence text[] DEFAULT ARRAY['Texte utilisateur uniquement'];

-- Add comment for clarity
COMMENT ON COLUMN public.raw_contributions.extracted_document_text IS 'Text extracted from attached PDF documents (private, never exposed publicly)';
COMMENT ON COLUMN public.raw_contributions.extracted_document_stats IS 'Stats about extraction: {chars, pages, is_scanned_guess}';
COMMENT ON COLUMN public.raw_contributions.needs_ocr IS 'True if PDF appears to be scanned and needs OCR for text extraction';
COMMENT ON COLUMN public.public_contributions.source_evidence IS 'Evidence sources used: PDF officiel analysé, Document non extractible, Texte utilisateur uniquement';