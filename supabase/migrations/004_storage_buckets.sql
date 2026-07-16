-- Storage buckets for itinerary PDFs and blog images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('itinerary-pdfs', 'itinerary-pdfs', true, 10485760, ARRAY['application/pdf']),
  ('blog-images', 'blog-images', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Public read for website; authenticated admin upload
CREATE POLICY "public_read_itinerary_pdfs" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'itinerary-pdfs');

CREATE POLICY "admin_upload_itinerary_pdfs" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'itinerary-pdfs');

CREATE POLICY "admin_update_itinerary_pdfs" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'itinerary-pdfs');

CREATE POLICY "public_read_blog_images" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'blog-images');

CREATE POLICY "admin_upload_blog_images" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'blog-images');

CREATE POLICY "admin_update_blog_images" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'blog-images');
