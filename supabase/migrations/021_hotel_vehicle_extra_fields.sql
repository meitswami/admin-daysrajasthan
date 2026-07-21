-- Hotel Google Maps / listing link
ALTER TABLE website_hotels
  ADD COLUMN IF NOT EXISTS google_maps_url TEXT;

-- Vehicle structured fields (Model = name)
ALTER TABLE website_vehicles
  ADD COLUMN IF NOT EXISTS vehicle_type TEXT,
  ADD COLUMN IF NOT EXISTS capacity TEXT;
