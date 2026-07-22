-- Company achievements on Structure master

ALTER TABLE td_company_structure
  ADD COLUMN IF NOT EXISTS achievements JSONB NOT NULL DEFAULT '[]'::jsonb;
