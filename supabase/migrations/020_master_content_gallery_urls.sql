-- Multi-image galleries for Locations / Hotels / Vehicles master rows
ALTER TABLE website_destinations
  ADD COLUMN IF NOT EXISTS gallery_urls JSONB DEFAULT '[]'::jsonb;
ALTER TABLE website_hotels
  ADD COLUMN IF NOT EXISTS gallery_urls JSONB DEFAULT '[]'::jsonb;
ALTER TABLE website_vehicles
  ADD COLUMN IF NOT EXISTS gallery_urls JSONB DEFAULT '[]'::jsonb;
