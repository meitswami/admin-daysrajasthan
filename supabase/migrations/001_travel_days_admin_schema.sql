-- Travel Days Rajasthan – Website Admin Panel Schema
-- Apply to a dedicated Supabase project (NOT shared with other apps)

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Admin profiles (extends auth.users) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Module 3: Itinerary packages ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS itineraries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_name TEXT NOT NULL,
  destination TEXT,
  slug TEXT UNIQUE,
  pdf_url TEXT,
  cover_image_url TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  download_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS itinerary_downloads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  itinerary_id UUID REFERENCES itineraries(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  destination TEXT,
  package_name TEXT NOT NULL,
  source_page TEXT,
  downloaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  synced_to_crm BOOLEAN NOT NULL DEFAULT false,
  crm_synced_at TIMESTAMPTZ
);

-- ─── Module 4: Contact Us ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contact_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  mobile TEXT,
  subject TEXT,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  synced_to_crm BOOLEAN NOT NULL DEFAULT false,
  crm_synced_at TIMESTAMPTZ
);

-- ─── Module 5: Inquiry forms ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS package_inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name TEXT NOT NULL,
  mobile TEXT NOT NULL,
  email TEXT NOT NULL,
  destination TEXT,
  travel_date DATE,
  adults INT DEFAULT 1,
  children INT DEFAULT 0,
  budget TEXT,
  additional_requirements TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'quoted', 'converted', 'closed')),
  source_page TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  synced_to_crm BOOLEAN NOT NULL DEFAULT false,
  crm_synced_at TIMESTAMPTZ
);

-- ─── Module 6: Blog ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS blog_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS blog_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS blogs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  featured_image_url TEXT,
  content_html TEXT,
  meta_title TEXT,
  meta_description TEXT,
  keywords TEXT[],
  category_id UUID REFERENCES blog_categories(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  publish_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS blog_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blog_id UUID NOT NULL REFERENCES blogs(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS blog_tag_map (
  blog_id UUID NOT NULL REFERENCES blogs(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES blog_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (blog_id, tag_id)
);

-- ─── Module 7: WhatsApp leads ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS whatsapp_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name TEXT,
  phone TEXT NOT NULL,
  selected_package TEXT,
  destination TEXT,
  source_page TEXT,
  landing_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  synced_to_crm BOOLEAN NOT NULL DEFAULT false,
  crm_synced_at TIMESTAMPTZ
);

-- ─── Module 8: CRM sync log ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS crm_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('contact', 'inquiry', 'download', 'whatsapp')),
  entity_id UUID NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'success', 'failed')),
  request_payload JSONB,
  response_payload JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Indexes ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_itinerary_downloads_date ON itinerary_downloads(downloaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_queries_status ON contact_queries(status);
CREATE INDEX IF NOT EXISTS idx_package_inquiries_status ON package_inquiries(status);
CREATE INDEX IF NOT EXISTS idx_blogs_status ON blogs(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_leads_created ON whatsapp_leads(created_at DESC);

-- ─── Updated_at trigger ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_itineraries_updated BEFORE UPDATE ON itineraries
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_blogs_updated BEFORE UPDATE ON blogs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_admin_profiles_updated BEFORE UPDATE ON admin_profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
