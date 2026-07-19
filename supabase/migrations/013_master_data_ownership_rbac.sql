-- Master data ownership + RBAC role support

-- Ownership columns on website master tables
ALTER TABLE website_destinations
  ADD COLUMN IF NOT EXISTS created_by UUID,
  ADD COLUMN IF NOT EXISTS created_by_name TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

ALTER TABLE website_hotels
  ADD COLUMN IF NOT EXISTS created_by UUID,
  ADD COLUMN IF NOT EXISTS created_by_name TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

ALTER TABLE website_vehicles
  ADD COLUMN IF NOT EXISTS created_by UUID,
  ADD COLUMN IF NOT EXISTS created_by_name TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

ALTER TABLE website_countries
  ADD COLUMN IF NOT EXISTS created_by UUID,
  ADD COLUMN IF NOT EXISTS created_by_name TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

ALTER TABLE website_cities
  ADD COLUMN IF NOT EXISTS created_by UUID,
  ADD COLUMN IF NOT EXISTS created_by_name TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- Package / itinerary master ownership + package body fields
ALTER TABLE itineraries
  ADD COLUMN IF NOT EXISTS created_by UUID,
  ADD COLUMN IF NOT EXISTS created_by_name TEXT,
  ADD COLUMN IF NOT EXISTS inclusions JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS exclusions JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS gallery_urls JSONB DEFAULT '[]'::jsonb;

-- Reusable inclusion / exclusion library
CREATE TABLE IF NOT EXISTS td_master_inclusions_exclusions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind TEXT NOT NULL CHECK (kind IN ('inclusion', 'exclusion')),
  text TEXT NOT NULL,
  created_by UUID,
  created_by_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE td_master_inclusions_exclusions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins_master_inclusions" ON td_master_inclusions_exclusions;
CREATE POLICY "admins_master_inclusions" ON td_master_inclusions_exclusions
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Keep admin@daysrajasthan.com as superadmin
UPDATE td_team_members
SET role = 'superadmin', is_active = true, name = COALESCE(name, 'Days Rajasthan Admin')
WHERE lower(email) = 'admin@daysrajasthan.com';

UPDATE admin_profiles ap
SET role = 'super_admin', is_active = true, full_name = COALESCE(full_name, 'Days Rajasthan Admin'), updated_at = now()
FROM auth.users u
WHERE ap.id = u.id AND lower(u.email) = 'admin@daysrajasthan.com';
