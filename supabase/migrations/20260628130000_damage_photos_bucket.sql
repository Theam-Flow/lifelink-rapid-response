-- Public bucket for damage-report photos (like terremotovenezuela.com photos).
-- Public read so the damage map popups can show them; authenticated users upload
-- into their own folder.
INSERT INTO storage.buckets (id, name, public)
VALUES ('damage-photos', 'damage-photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "damage_photos_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'damage-photos');
CREATE POLICY "damage_photos_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'damage-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
