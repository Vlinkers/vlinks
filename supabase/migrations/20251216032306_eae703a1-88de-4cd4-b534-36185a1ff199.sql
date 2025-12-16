-- Rate limiting table for password reset requests (minimal storage)
CREATE TABLE public.password_reset_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email_hash text NOT NULL,
  requested_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Index for efficient lookups
CREATE INDEX idx_password_reset_email_hash ON public.password_reset_requests(email_hash);
CREATE INDEX idx_password_reset_requested_at ON public.password_reset_requests(requested_at);

-- Auto-cleanup old records (older than 1 hour)
CREATE OR REPLACE FUNCTION public.cleanup_old_reset_requests()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.password_reset_requests WHERE requested_at < now() - interval '1 hour';
  RETURN NEW;
END;
$$;

CREATE TRIGGER cleanup_reset_requests_trigger
AFTER INSERT ON public.password_reset_requests
FOR EACH STATEMENT
EXECUTE FUNCTION public.cleanup_old_reset_requests();

-- No RLS needed - this table is only accessed by edge function with service role