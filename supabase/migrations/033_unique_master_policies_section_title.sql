-- Prevent future duplicate policy lines from localStorage re-uploads
CREATE UNIQUE INDEX IF NOT EXISTS td_master_policies_section_title_uidx
  ON td_master_policies (section, (lower(trim(title))));
