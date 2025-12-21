-- Add new columns to public_contributions for enriched AI output
ALTER TABLE public.public_contributions
ADD COLUMN IF NOT EXISTS raw_user_content text,
ADD COLUMN IF NOT EXISTS document_analysis text,
ADD COLUMN IF NOT EXISTS key_facts text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS mechanic_signals text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS risk_indicators text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS document_vs_oral_gap text,
ADD COLUMN IF NOT EXISTS confidence_level text DEFAULT 'medium' CHECK (confidence_level IN ('low', 'medium', 'high')),
ADD COLUMN IF NOT EXISTS has_document_attached boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS document_text_extracted text;

-- Add comment to explain the purpose
COMMENT ON COLUMN public.public_contributions.raw_user_content IS 'Original user content, preserved unmodified';
COMMENT ON COLUMN public.public_contributions.document_analysis IS 'AI analysis of attached documents';
COMMENT ON COLUMN public.public_contributions.key_facts IS 'Array of key facts extracted by AI';
COMMENT ON COLUMN public.public_contributions.mechanic_signals IS 'Array of mechanical signals/concerns extracted by AI';
COMMENT ON COLUMN public.public_contributions.risk_indicators IS 'Array of risk indicators extracted by AI';
COMMENT ON COLUMN public.public_contributions.document_vs_oral_gap IS 'Differences between document content and oral testimony';
COMMENT ON COLUMN public.public_contributions.confidence_level IS 'AI confidence level: low, medium, high';
COMMENT ON COLUMN public.public_contributions.has_document_attached IS 'Whether a document was attached to the contribution';
COMMENT ON COLUMN public.public_contributions.document_text_extracted IS 'Text extracted from attached documents via OCR';