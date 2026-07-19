-- Seed Master Data currently shown in admin + package ownership backfill + audit table

-- ── Destinations (India locations; includes former Cities) ─────────────────
INSERT INTO website_destinations (
  id, name, subtitle, country, image_url, show_on_website, is_trending, display_mode,
  created_at, created_by_name
) VALUES
  ('a1000001-0001-4000-8000-000000000001', 'Jaipur', 'Rajasthan Heritage', 'India',
   'https://images.unsplash.com/photo-1599661046289-e31897846e41?w=800&q=80', true, true, 'grid',
   '2026-01-05T08:00:00Z', 'Travel Days Admin'),
  ('a1000001-0001-4000-8000-000000000002', 'Udaipur', 'City of Lakes', 'India',
   'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&q=80', true, false, 'grid',
   '2026-01-05T08:00:00Z', 'Travel Days Admin'),
  ('a1000001-0001-4000-8000-000000000003', 'Jaisalmer', 'Desert Gateway', 'India',
   'https://images.unsplash.com/photo-1477587458883-47145ed94245?w=800&q=80', true, true, 'grid',
   '2026-01-05T08:00:00Z', 'Travel Days Admin'),
  ('a1000001-0001-4000-8000-000000000004', 'Gujarat', 'Cultural Trail', 'India',
   'https://images.unsplash.com/photo-1564507592333-c60657eea523?w=800&q=80', true, false, 'grid',
   '2026-01-05T08:00:00Z', 'Travel Days Admin'),
  ('a1000001-0001-4000-8000-000000000005', 'Jodhpur', 'Blue City', 'India',
   'https://images.unsplash.com/photo-1477587458883-47145ed94245?w=800&q=80', true, false, 'grid',
   '2026-01-08T08:00:00Z', 'Travel Days Admin'),
  ('a1000001-0001-4000-8000-000000000006', 'Ranthambore', 'Wildlife Sanctuary', 'India',
   'https://images.unsplash.com/photo-1561731216-c3a4d994f935?w=800&q=80', true, false, 'grid',
   '2026-01-08T08:00:00Z', 'Travel Days Admin'),
  ('a1000001-0001-4000-8000-000000000007', 'Mount Abu', 'Hill Station', 'India',
   'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&q=80', true, false, 'grid',
   '2026-01-08T08:00:00Z', 'Travel Days Admin'),
  ('a1000001-0001-4000-8000-000000000008', 'Bikaner', 'Camel Country', 'India',
   'https://images.unsplash.com/photo-1599661046289-e31897846e41?w=800&q=80', true, false, 'grid',
   '2026-01-08T08:00:00Z', 'Travel Days Admin')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  subtitle = EXCLUDED.subtitle,
  country = EXCLUDED.country,
  image_url = EXCLUDED.image_url,
  show_on_website = EXCLUDED.show_on_website,
  is_trending = EXCLUDED.is_trending,
  created_by_name = COALESCE(website_destinations.created_by_name, EXCLUDED.created_by_name);

-- ── Hotels ────────────────────────────────────────────────────────────────
INSERT INTO website_hotels (
  id, name, subtitle, country, image_url, show_on_website, display_mode,
  created_at, created_by_name
) VALUES
  ('a2000001-0001-4000-8000-000000000001', 'Heritage Palace Hotel', 'Jaipur · 5 Star', 'India',
   'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80', true, 'grid',
   '2026-01-10T08:00:00Z', 'Travel Days Admin'),
  ('a2000001-0001-4000-8000-000000000002', 'Lake View Resort', 'Udaipur · 4 Star', 'India',
   'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&q=80', true, 'grid',
   '2026-01-10T08:00:00Z', 'Travel Days Admin'),
  ('a2000001-0001-4000-8000-000000000003', 'Desert Camp Luxury', 'Jaisalmer', 'India',
   'https://images.unsplash.com/photo-1477587458883-47145ed94245?w=800&q=80', false, 'grid',
   '2026-01-10T08:00:00Z', 'Travel Days Admin')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  subtitle = EXCLUDED.subtitle,
  created_by_name = COALESCE(website_hotels.created_by_name, EXCLUDED.created_by_name);

-- ── Vehicles ──────────────────────────────────────────────────────────────
INSERT INTO website_vehicles (
  id, name, subtitle, image_url, show_on_website, display_mode,
  created_at, created_by_name
) VALUES
  ('a3000001-0001-4000-8000-000000000001', 'Toyota Innova', 'SUV · 7 Seater',
   'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=800&q=80', true, 'grid',
   '2026-01-12T08:00:00Z', 'Travel Days Admin'),
  ('a3000001-0001-4000-8000-000000000002', 'Tempo Traveller', 'Group · 12 Seater',
   'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800&q=80', true, 'grid',
   '2026-01-12T08:00:00Z', 'Travel Days Admin'),
  ('a3000001-0001-4000-8000-000000000003', 'Mercedes E Class', 'Luxury Sedan',
   'https://images.unsplash.com/photo-1617531653332-bd46c24f2068?w=800&q=80', true, 'list',
   '2026-01-12T08:00:00Z', 'Travel Days Admin')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  subtitle = EXCLUDED.subtitle,
  created_by_name = COALESCE(website_vehicles.created_by_name, EXCLUDED.created_by_name);

-- ── Inclusions & Exclusions library ───────────────────────────────────────
INSERT INTO td_master_inclusions_exclusions (id, kind, text, created_by_name, created_at) VALUES
  ('a4000001-0001-4000-8000-000000000001', 'inclusion', 'Accommodation as per plan', 'Travel Days Admin', '2026-01-01T08:00:00Z'),
  ('a4000001-0001-4000-8000-000000000002', 'inclusion', 'Private AC vehicle for sightseeing', 'Travel Days Admin', '2026-01-01T08:00:00Z'),
  ('a4000001-0001-4000-8000-000000000003', 'inclusion', 'Hotel stay with breakfast', 'Travel Days Admin', '2026-01-01T08:00:00Z'),
  ('a4000001-0001-4000-8000-000000000004', 'exclusion', 'Air fare / train fare', 'Travel Days Admin', '2026-01-01T08:00:00Z'),
  ('a4000001-0001-4000-8000-000000000005', 'exclusion', 'Personal expenses', 'Travel Days Admin', '2026-01-01T08:00:00Z'),
  ('a4000001-0001-4000-8000-000000000006', 'exclusion', 'Entry fees unless specified', 'Travel Days Admin', '2026-01-01T08:00:00Z')
ON CONFLICT (id) DO NOTHING;

-- ── Ensure classic demo packages exist (idempotent) ───────────────────────
INSERT INTO itineraries (
  id, package_name, destination, slug, pdf_url, cover_image_url, status, download_count,
  package_type, package_duration, show_on_website, is_trending, display_mode,
  inclusions, exclusions, created_by_name, created_at, updated_at
) VALUES
  ('11111111-1111-1111-1111-111111111001', '3 Days Jaipur Heritage Tour', 'Jaipur', '3-days-jaipur-heritage',
   '/uploads/itineraries/jaipur-heritage.pdf',
   'https://images.unsplash.com/photo-1599661046289-e31897846e41?w=800',
   'active', 142, 'Local Sight Seeing', '3 Days 2 Nights', true, true, 'grid',
   '["Hotel stay with breakfast","Private AC cab for sightseeing"]'::jsonb,
   '["Airfare / train fare","Personal expenses"]'::jsonb,
   'Travel Days Admin', '2026-01-15T10:00:00Z', '2026-06-20T14:30:00Z'),
  ('11111111-1111-1111-1111-111111111002', '5 Days Golden Triangle', 'Delhi · Agra · Jaipur', '5-days-golden-triangle',
   '/uploads/itineraries/golden-triangle.pdf',
   'https://images.unsplash.com/photo-1564507592333-c60657eea523?w=800',
   'active', 218, 'Domestic', '5 Days 4 Nights', true, true, 'grid',
   '["Accommodation as per plan","Private AC vehicle"]'::jsonb,
   '["Airfare","Monument entry fees"]'::jsonb,
   'Travel Days Admin', '2026-01-20T10:00:00Z', '2026-06-22T09:15:00Z'),
  ('11111111-1111-1111-1111-111111111003', '4 Days Jaisalmer Desert Safari', 'Jaisalmer', '4-days-jaisalmer-desert',
   '/uploads/itineraries/jaisalmer-desert.pdf',
   'https://images.unsplash.com/photo-1477587458883-47145ed94245?w=800',
   'active', 96, 'Family Trip', '4 Days 3 Nights', true, false, 'grid',
   '["Desert camp stay","Camel safari"]'::jsonb,
   '["Airfare","Personal expenses"]'::jsonb,
   'Travel Days Admin', '2026-02-01T10:00:00Z', '2026-06-18T11:00:00Z'),
  ('11111111-1111-1111-1111-111111111004', '3 Days Udaipur Lakes & Palaces', 'Udaipur', '3-days-udaipur-lakes',
   '/uploads/itineraries/udaipur-lakes.pdf',
   'https://images.unsplash.com/photo-1599661046289-e31897846e41?w=800',
   'active', 87, 'Honeymoon', '3 Days 2 Nights', true, true, 'list',
   '["Hotel with breakfast","Boat ride (subject to water level)"]'::jsonb,
   '["Airfare","Personal expenses"]'::jsonb,
   'Travel Days Admin', '2026-02-10T10:00:00Z', '2026-06-25T16:45:00Z'),
  ('11111111-1111-1111-1111-111111111005', '2 Days Ranthambore Wildlife', 'Ranthambore', '2-days-ranthambore-wildlife',
   '/uploads/itineraries/ranthambore-wildlife.pdf',
   'https://images.unsplash.com/photo-1561731216-c3a4d994f935?w=800',
   'inactive', 34, 'Local Sight Seeing', '2 Days 1 Night', false, false, 'grid',
   '["Safari jeep (shared)","Hotel stay"]'::jsonb,
   '["Park entry for extra persons","Airfare"]'::jsonb,
   'Travel Days Admin', '2026-03-01T10:00:00Z', '2026-06-10T08:00:00Z')
ON CONFLICT (id) DO UPDATE SET
  package_type = COALESCE(itineraries.package_type, EXCLUDED.package_type),
  package_duration = COALESCE(itineraries.package_duration, EXCLUDED.package_duration),
  inclusions = COALESCE(itineraries.inclusions, EXCLUDED.inclusions),
  exclusions = COALESCE(itineraries.exclusions, EXCLUDED.exclusions),
  created_by_name = COALESCE(itineraries.created_by_name, EXCLUDED.created_by_name);

-- Backfill ownership on existing catalog packages
UPDATE itineraries
SET created_by_name = COALESCE(NULLIF(created_by_name, ''), 'Days Rajasthan Admin')
WHERE created_by_name IS NULL OR created_by_name = '';

-- ── Durable master-data audit log ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS td_master_data_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete')),
  actor_id TEXT,
  actor_name TEXT,
  actor_role TEXT,
  summary TEXT NOT NULL,
  before_data JSONB,
  after_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_td_master_audit_created ON td_master_data_audit(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_td_master_audit_entity ON td_master_data_audit(entity_type, entity_id);

ALTER TABLE td_master_data_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins_master_data_audit" ON td_master_data_audit;
CREATE POLICY "admins_master_data_audit" ON td_master_data_audit
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
