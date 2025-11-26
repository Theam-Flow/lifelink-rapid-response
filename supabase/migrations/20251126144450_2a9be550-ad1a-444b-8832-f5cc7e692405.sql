-- Update missing_persons table to support multiple photos
ALTER TABLE missing_persons 
  DROP COLUMN IF EXISTS photo_url,
  ADD COLUMN IF NOT EXISTS photo_urls text[] DEFAULT '{}';

-- Create storage bucket for missing persons photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'missing-persons-photos',
  'missing-persons-photos',
  true,
  5242880, -- 5MB limit per file
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for missing persons photos bucket
CREATE POLICY "Anyone can view missing persons photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'missing-persons-photos');

CREATE POLICY "Authenticated users can upload missing persons photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'missing-persons-photos' 
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update their own missing persons photos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'missing-persons-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own missing persons photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'missing-persons-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);