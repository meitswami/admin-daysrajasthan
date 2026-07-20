-- Website master tables: RLS was enabled without policies, so the admin
-- anon/authenticated clients always received empty results.

ALTER TABLE website_destinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_hotels ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_module_settings ENABLE ROW LEVEL SECURITY;

-- Authenticated admins: full access
DROP POLICY IF EXISTS "admins_all_website_destinations" ON website_destinations;
CREATE POLICY "admins_all_website_destinations" ON website_destinations
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "admins_all_website_hotels" ON website_hotels;
CREATE POLICY "admins_all_website_hotels" ON website_hotels
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "admins_all_website_vehicles" ON website_vehicles;
CREATE POLICY "admins_all_website_vehicles" ON website_vehicles
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "admins_all_website_countries" ON website_countries;
CREATE POLICY "admins_all_website_countries" ON website_countries
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "admins_all_website_cities" ON website_cities;
CREATE POLICY "admins_all_website_cities" ON website_cities
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "admins_all_website_module_settings" ON website_module_settings;
CREATE POLICY "admins_all_website_module_settings" ON website_module_settings
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Anon access: admin panel currently uses the anon key with demo sessions
-- (no auth.uid). Matches the demo pattern used on td_customers.
DROP POLICY IF EXISTS "anon_all_website_destinations" ON website_destinations;
CREATE POLICY "anon_all_website_destinations" ON website_destinations
  FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_all_website_hotels" ON website_hotels;
CREATE POLICY "anon_all_website_hotels" ON website_hotels
  FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_all_website_vehicles" ON website_vehicles;
CREATE POLICY "anon_all_website_vehicles" ON website_vehicles
  FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_all_website_countries" ON website_countries;
CREATE POLICY "anon_all_website_countries" ON website_countries
  FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_all_website_cities" ON website_cities;
CREATE POLICY "anon_all_website_cities" ON website_cities
  FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_all_website_module_settings" ON website_module_settings;
CREATE POLICY "anon_all_website_module_settings" ON website_module_settings
  FOR ALL TO anon USING (true) WITH CHECK (true);

-- Inclusions library (authenticated-only before — empty under demo session)
DROP POLICY IF EXISTS "anon_all_master_inclusions" ON td_master_inclusions_exclusions;
CREATE POLICY "anon_all_master_inclusions" ON td_master_inclusions_exclusions
  FOR ALL TO anon USING (true) WITH CHECK (true);

-- Allow demo/admin clients to read + persist data_mode without Supabase Auth
DROP POLICY IF EXISTS "anon_read_system_settings" ON td_system_settings;
CREATE POLICY "anon_read_system_settings" ON td_system_settings
  FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "anon_write_system_settings" ON td_system_settings;
CREATE POLICY "anon_write_system_settings" ON td_system_settings
  FOR ALL TO anon USING (true) WITH CHECK (true);

-- Default production admin to Real (Supabase) mode
INSERT INTO td_system_settings (key, value, updated_at)
VALUES ('data_mode', '"real"'::jsonb, now())
ON CONFLICT (key) DO UPDATE
SET value = '"real"'::jsonb, updated_at = now();
