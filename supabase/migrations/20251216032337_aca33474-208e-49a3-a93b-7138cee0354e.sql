-- Enable RLS but deny all public access (table only accessed by service role)
ALTER TABLE public.password_reset_requests ENABLE ROW LEVEL SECURITY;

-- No policies needed - service role bypasses RLS