-- Optional provider / contact / pricing fields for master vehicles
ALTER TABLE website_vehicles
  ADD COLUMN IF NOT EXISTS provider_company_name TEXT,
  ADD COLUMN IF NOT EXISTS contact_person_name TEXT,
  ADD COLUMN IF NOT EXISTS contact_phone_1 TEXT,
  ADD COLUMN IF NOT EXISTS contact_phone_2 TEXT,
  ADD COLUMN IF NOT EXISTS price_per_km TEXT,
  ADD COLUMN IF NOT EXISTS price_per_day TEXT;
