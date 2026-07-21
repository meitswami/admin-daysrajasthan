-- Day-wise itinerary details on master packages
ALTER TABLE itineraries
  ADD COLUMN IF NOT EXISTS days JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN itineraries.days IS 'Day-wise itinerary: [{day_number, title, location, description, image_urls}]';
