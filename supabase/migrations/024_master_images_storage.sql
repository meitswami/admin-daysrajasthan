-- Public gallery bucket for master-data images (vehicles, itineraries, hotels, destinations)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'master-images',
  'master-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "public_read_master_images" ON storage.objects;
CREATE POLICY "public_read_master_images" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'master-images');

DROP POLICY IF EXISTS "anon_upload_master_images" ON storage.objects;
CREATE POLICY "anon_upload_master_images" ON storage.objects
  FOR INSERT TO anon WITH CHECK (bucket_id = 'master-images');

DROP POLICY IF EXISTS "authenticated_upload_master_images" ON storage.objects;
CREATE POLICY "authenticated_upload_master_images" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'master-images');

DROP POLICY IF EXISTS "anon_update_master_images" ON storage.objects;
CREATE POLICY "anon_update_master_images" ON storage.objects
  FOR UPDATE TO anon USING (bucket_id = 'master-images');

DROP POLICY IF EXISTS "authenticated_update_master_images" ON storage.objects;
CREATE POLICY "authenticated_update_master_images" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'master-images');

DROP POLICY IF EXISTS "anon_delete_master_images" ON storage.objects;
CREATE POLICY "anon_delete_master_images" ON storage.objects
  FOR DELETE TO anon USING (bucket_id = 'master-images');

DROP POLICY IF EXISTS "authenticated_delete_master_images" ON storage.objects;
CREATE POLICY "authenticated_delete_master_images" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'master-images');

ALTER TABLE itineraries
  ADD COLUMN IF NOT EXISTS tour_code text,
  ADD COLUMN IF NOT EXISTS alternate_titles jsonb NOT NULL DEFAULT '[]'::jsonb;

UPDATE itineraries
SET tour_code = UPPER(SUBSTRING(slug FROM '^([a-zA-Z]+[0-9]+)'))
WHERE tour_code IS NULL
  AND slug IS NOT NULL
  AND slug ~ '^[a-zA-Z]+[0-9]+';

UPDATE itineraries
SET status = 'inactive',
    show_on_website = false,
    updated_at = now()
WHERE status IS DISTINCT FROM 'inactive'
   OR show_on_website IS DISTINCT FROM false;
