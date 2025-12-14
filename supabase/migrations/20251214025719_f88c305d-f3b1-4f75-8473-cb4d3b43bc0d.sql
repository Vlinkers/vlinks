
-- Create enum for contribution types
CREATE TYPE public.contribution_type AS ENUM (
  'inspection_report',
  'vehicle_history',
  'owner_exchange',
  'mechanic_conversation',
  'photo_evidence',
  'observation',
  'purchase_decision'
);

-- Create VINs table to store vehicle basic info
CREATE TABLE public.vins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vin VARCHAR(17) NOT NULL UNIQUE,
  make TEXT,
  model TEXT,
  year INTEGER,
  trust_score INTEGER DEFAULT 0,
  contributions_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create VIN contributions table
CREATE TABLE public.vin_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vin_id UUID NOT NULL REFERENCES public.vins(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contribution_type contribution_type NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  details TEXT,
  is_verified BOOLEAN DEFAULT false,
  is_anonymous BOOLEAN DEFAULT false,
  points_awarded INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create contribution documents table
CREATE TABLE public.contribution_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contribution_id UUID NOT NULL REFERENCES public.vin_contributions(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  description TEXT,
  is_redacted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create contribution photos table
CREATE TABLE public.contribution_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contribution_id UUID NOT NULL REFERENCES public.vin_contributions(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  caption TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create contribution tags table
CREATE TABLE public.contribution_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contribution_id UUID NOT NULL REFERENCES public.vin_contributions(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_vins_vin ON public.vins(vin);
CREATE INDEX idx_contributions_vin_id ON public.vin_contributions(vin_id);
CREATE INDEX idx_contributions_user_id ON public.vin_contributions(user_id);
CREATE INDEX idx_contributions_type ON public.vin_contributions(contribution_type);
CREATE INDEX idx_documents_contribution_id ON public.contribution_documents(contribution_id);
CREATE INDEX idx_photos_contribution_id ON public.contribution_photos(contribution_id);
CREATE INDEX idx_tags_contribution_id ON public.contribution_tags(contribution_id);

-- Enable RLS on all tables
ALTER TABLE public.vins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vin_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contribution_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contribution_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contribution_tags ENABLE ROW LEVEL SECURITY;

-- VINs policies: public read, authenticated users can create
CREATE POLICY "Anyone can view VINs" ON public.vins FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create VINs" ON public.vins FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admins can update VINs" ON public.vins FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Contributions policies: public read, users manage their own
CREATE POLICY "Anyone can view contributions" ON public.vin_contributions FOR SELECT USING (true);
CREATE POLICY "Users can create contributions" ON public.vin_contributions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own contributions" ON public.vin_contributions FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own contributions" ON public.vin_contributions FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Documents policies: public read, linked to contribution owner
CREATE POLICY "Anyone can view documents" ON public.contribution_documents FOR SELECT USING (true);
CREATE POLICY "Users can add documents to own contributions" ON public.contribution_documents FOR INSERT TO authenticated 
  WITH CHECK (EXISTS (SELECT 1 FROM public.vin_contributions WHERE id = contribution_id AND user_id = auth.uid()));
CREATE POLICY "Users can delete own contribution documents" ON public.contribution_documents FOR DELETE TO authenticated 
  USING (EXISTS (SELECT 1 FROM public.vin_contributions WHERE id = contribution_id AND user_id = auth.uid()));

-- Photos policies: public read, linked to contribution owner
CREATE POLICY "Anyone can view photos" ON public.contribution_photos FOR SELECT USING (true);
CREATE POLICY "Users can add photos to own contributions" ON public.contribution_photos FOR INSERT TO authenticated 
  WITH CHECK (EXISTS (SELECT 1 FROM public.vin_contributions WHERE id = contribution_id AND user_id = auth.uid()));
CREATE POLICY "Users can delete own contribution photos" ON public.contribution_photos FOR DELETE TO authenticated 
  USING (EXISTS (SELECT 1 FROM public.vin_contributions WHERE id = contribution_id AND user_id = auth.uid()));

-- Tags policies: public read, linked to contribution owner
CREATE POLICY "Anyone can view tags" ON public.contribution_tags FOR SELECT USING (true);
CREATE POLICY "Users can add tags to own contributions" ON public.contribution_tags FOR INSERT TO authenticated 
  WITH CHECK (EXISTS (SELECT 1 FROM public.vin_contributions WHERE id = contribution_id AND user_id = auth.uid()));
CREATE POLICY "Users can delete own contribution tags" ON public.contribution_tags FOR DELETE TO authenticated 
  USING (EXISTS (SELECT 1 FROM public.vin_contributions WHERE id = contribution_id AND user_id = auth.uid()));

-- Create storage buckets for documents and photos
INSERT INTO storage.buckets (id, name, public) VALUES ('vin-documents', 'vin-documents', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('vin-photos', 'vin-photos', true);

-- Storage policies for documents (private, owner access)
CREATE POLICY "Users can upload documents" ON storage.objects FOR INSERT TO authenticated 
  WITH CHECK (bucket_id = 'vin-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can view own documents" ON storage.objects FOR SELECT TO authenticated 
  USING (bucket_id = 'vin-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete own documents" ON storage.objects FOR DELETE TO authenticated 
  USING (bucket_id = 'vin-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for photos (public view, owner manage)
CREATE POLICY "Anyone can view vin photos" ON storage.objects FOR SELECT USING (bucket_id = 'vin-photos');
CREATE POLICY "Users can upload vin photos" ON storage.objects FOR INSERT TO authenticated 
  WITH CHECK (bucket_id = 'vin-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete own vin photos" ON storage.objects FOR DELETE TO authenticated 
  USING (bucket_id = 'vin-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Trigger for updated_at on vins
CREATE TRIGGER update_vins_updated_at BEFORE UPDATE ON public.vins
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for updated_at on contributions
CREATE TRIGGER update_contributions_updated_at BEFORE UPDATE ON public.vin_contributions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to increment VIN contributions count
CREATE OR REPLACE FUNCTION public.increment_vin_contributions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.vins SET contributions_count = contributions_count + 1 WHERE id = NEW.vin_id;
  RETURN NEW;
END;
$$;

-- Trigger to auto-increment contributions count
CREATE TRIGGER on_contribution_created
  AFTER INSERT ON public.vin_contributions
  FOR EACH ROW EXECUTE FUNCTION public.increment_vin_contributions();
