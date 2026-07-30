-- Optional description for inclusion / exclusion library lines.
ALTER TABLE td_master_inclusions_exclusions
  ADD COLUMN IF NOT EXISTS description TEXT;
