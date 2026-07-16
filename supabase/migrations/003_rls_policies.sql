-- Row Level Security — enable when connecting Supabase
-- Public website can INSERT via service role / edge functions; admins read all

ALTER TABLE itineraries ENABLE ROW LEVEL SECURITY;
ALTER TABLE itinerary_downloads ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE package_inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE blogs ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_tag_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_profiles ENABLE ROW LEVEL SECURITY;

-- Authenticated admins: full access
CREATE POLICY "admins_all_itineraries" ON itineraries FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "admins_all_downloads" ON itinerary_downloads FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "admins_all_contacts" ON contact_queries FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "admins_all_inquiries" ON package_inquiries FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "admins_all_blogs" ON blogs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "admins_all_categories" ON blog_categories FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "admins_all_tags" ON blog_tags FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "admins_all_tag_map" ON blog_tag_map FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "admins_all_whatsapp" ON whatsapp_leads FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "admins_all_crm_logs" ON crm_sync_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "admins_own_profile" ON admin_profiles FOR ALL TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Public read: published blogs only (for website)
CREATE POLICY "public_read_published_blogs" ON blogs FOR SELECT TO anon USING (status = 'published');
CREATE POLICY "public_read_active_itineraries" ON itineraries FOR SELECT TO anon USING (status = 'active');
