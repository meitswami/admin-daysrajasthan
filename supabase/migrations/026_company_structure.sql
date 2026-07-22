-- Company Structure master (singleton row)

CREATE TABLE IF NOT EXISTS td_company_structure (
  id TEXT PRIMARY KEY DEFAULT 'default',
  logo_url TEXT,
  staff_contacts JSONB NOT NULL DEFAULT '[]'::jsonb,
  addresses JSONB NOT NULL DEFAULT '[]'::jsonb,
  social_links JSONB NOT NULL DEFAULT '{}'::jsonb,
  support_number TEXT,
  bank_accounts JSONB NOT NULL DEFAULT '[]'::jsonb,
  payment_methods JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID,
  updated_by_name TEXT
);

ALTER TABLE td_company_structure ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins_company_structure" ON td_company_structure;
CREATE POLICY "admins_company_structure" ON td_company_structure
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

INSERT INTO td_company_structure (id)
VALUES ('default')
ON CONFLICT (id) DO NOTHING;
