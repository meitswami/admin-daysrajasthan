-- Phase E: CRM customers + quote linking

CREATE TABLE IF NOT EXISTS td_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT,
  phone TEXT,
  phone_normalized TEXT,
  name TEXT NOT NULL,
  notes TEXT,
  lead_source TEXT,
  crm_synced BOOLEAN NOT NULL DEFAULT false,
  crm_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_td_customers_email_unique
  ON td_customers (lower(email))
  WHERE email IS NOT NULL AND email <> '';

CREATE INDEX IF NOT EXISTS idx_td_customers_phone_normalized
  ON td_customers (phone_normalized)
  WHERE phone_normalized IS NOT NULL AND phone_normalized <> '';

ALTER TABLE client_itineraries
  ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES td_customers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_client_itineraries_customer
  ON client_itineraries(customer_id);

ALTER TABLE unified_leads
  ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES td_customers(id) ON DELETE SET NULL;

ALTER TABLE td_customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_td_customers" ON td_customers
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "anon_read_td_customers_demo" ON td_customers
  FOR SELECT TO anon USING (true);

CREATE POLICY "anon_write_td_customers_demo" ON td_customers
  FOR ALL TO anon USING (true) WITH CHECK (true);
