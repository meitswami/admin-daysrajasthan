-- Website display fields for itineraries & content modules (apply when connecting DB)

ALTER TABLE itineraries
  ADD COLUMN IF NOT EXISTS package_type TEXT,
  ADD COLUMN IF NOT EXISTS package_duration TEXT,
  ADD COLUMN IF NOT EXISTS show_on_website BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_trending BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS display_mode TEXT NOT NULL DEFAULT 'grid' CHECK (display_mode IN ('grid', 'list'));

CREATE TABLE IF NOT EXISTS website_countries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  image_url TEXT,
  show_on_website BOOLEAN NOT NULL DEFAULT true,
  display_mode TEXT NOT NULL DEFAULT 'grid',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS website_destinations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subtitle TEXT,
  country TEXT,
  image_url TEXT,
  show_on_website BOOLEAN NOT NULL DEFAULT true,
  is_trending BOOLEAN NOT NULL DEFAULT false,
  display_mode TEXT NOT NULL DEFAULT 'grid',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS website_cities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subtitle TEXT,
  country TEXT,
  show_on_website BOOLEAN NOT NULL DEFAULT true,
  display_mode TEXT NOT NULL DEFAULT 'grid',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS website_hotels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subtitle TEXT,
  country TEXT,
  image_url TEXT,
  show_on_website BOOLEAN NOT NULL DEFAULT true,
  display_mode TEXT NOT NULL DEFAULT 'grid',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS website_vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subtitle TEXT,
  image_url TEXT,
  show_on_website BOOLEAN NOT NULL DEFAULT true,
  display_mode TEXT NOT NULL DEFAULT 'grid',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS website_module_settings (
  module_key TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  show_on_website BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
