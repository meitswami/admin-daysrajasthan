-- Optional image for inclusion library lines (exclusions typically stay text-only).
ALTER TABLE td_master_inclusions_exclusions
  ADD COLUMN IF NOT EXISTS image_url TEXT;
