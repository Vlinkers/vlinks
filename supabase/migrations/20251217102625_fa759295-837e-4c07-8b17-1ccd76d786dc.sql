-- Add source_credibility column to public_contributions
ALTER TABLE public.public_contributions 
ADD COLUMN source_credibility TEXT;