
CREATE TABLE public.content_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_user_id UUID REFERENCES auth.users(id),
  reporter_email TEXT,
  reporter_name TEXT,
  report_type TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id UUID NOT NULL,
  vin_id UUID REFERENCES public.vins(id),
  description TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  admin_response TEXT,
  admin_action TEXT,
  processed_by UUID REFERENCES auth.users(id),
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_content_reports_status ON public.content_reports(status);

ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create reports"
  ON public.content_reports FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users see own reports"
  ON public.content_reports FOR SELECT
  TO authenticated
  USING (reporter_user_id = auth.uid());

CREATE POLICY "Admins manage all reports"
  ON public.content_reports FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));
