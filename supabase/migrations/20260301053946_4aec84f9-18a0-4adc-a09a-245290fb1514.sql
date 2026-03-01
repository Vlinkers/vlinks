
-- Create leads table for email collection on PDF downloads
CREATE TABLE public.leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  vin TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (public form)
CREATE POLICY "Anyone can submit a lead" ON public.leads
  FOR INSERT WITH CHECK (true);

-- Rate limiting: max 5 downloads per email per day (enforced in code)
-- Only service role can read leads
CREATE POLICY "Service role can read leads" ON public.leads
  FOR SELECT USING (false);

-- Add DELETE policy for public_contributions so users can delete their own
CREATE POLICY "Users can delete own public contributions" ON public.public_contributions
  FOR DELETE USING (auth.uid() = user_id);
