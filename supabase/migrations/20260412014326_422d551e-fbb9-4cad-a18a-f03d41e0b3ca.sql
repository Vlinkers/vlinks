
-- Allow anonymous inserts on events for alert contributions
CREATE POLICY "Anonymous users can create events"
ON public.events
FOR INSERT
TO anon
WITH CHECK (true);

-- Allow anonymous inserts on facts for alert contributions
CREATE POLICY "Anonymous users can create facts"
ON public.facts
FOR INSERT
TO anon
WITH CHECK (true);

-- Allow anonymous inserts on evidence for alert contributions
CREATE POLICY "Anonymous users can upload evidence"
ON public.evidence
FOR INSERT
TO anon
WITH CHECK (true);
