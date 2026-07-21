-- Hotel list/form fields matching Manage Hotels admin UI
ALTER TABLE website_hotels
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS price_description TEXT,
  ADD COLUMN IF NOT EXISTS rating NUMERIC(3, 1) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reviews_count INTEGER DEFAULT 0;
