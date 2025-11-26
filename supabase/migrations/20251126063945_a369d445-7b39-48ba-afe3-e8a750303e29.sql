-- Create storage bucket for shelter photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'shelter-photos',
  'shelter-photos',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Add photo_urls array to shelters table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'shelters' AND column_name = 'photo_urls'
  ) THEN
    ALTER TABLE shelters ADD COLUMN photo_urls text[] DEFAULT '{}';
  END IF;
END $$;