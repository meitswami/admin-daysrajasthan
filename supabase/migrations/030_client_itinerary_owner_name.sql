-- Denormalized creator display name for itinerary quotes (Created By column).
ALTER TABLE client_itineraries
  ADD COLUMN IF NOT EXISTS owner_name TEXT;

COMMENT ON COLUMN client_itineraries.owner_name IS
  'Staff display name of the agent who created the quote';
