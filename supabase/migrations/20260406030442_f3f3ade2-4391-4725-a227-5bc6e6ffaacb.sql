
-- Make vin-documents bucket public
UPDATE storage.buckets SET public = true WHERE id = 'vin-documents';

-- Add RLS policies for vin-documents bucket
CREATE POLICY "Public can read vin-documents"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'vin-documents');

CREATE POLICY "Authenticated users can upload vin-documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'vin-documents');

CREATE POLICY "Users can delete own vin-documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'vin-documents' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(), 'admin')));

-- Add RLS policies for vin-photos bucket (ensure they exist)
CREATE POLICY "Public can read vin-photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'vin-photos');

CREATE POLICY "Authenticated users can upload vin-photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'vin-photos');

CREATE POLICY "Users can delete own vin-photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'vin-photos' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(), 'admin')));
