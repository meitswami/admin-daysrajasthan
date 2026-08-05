-- Operations + Chat platform persistence (no localStorage)
-- Email table already exists; add anon RLS like other admin tables.

-- ── Operations ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS td_ops_transports (
  itinerary_id UUID PRIMARY KEY,
  driver_name TEXT NOT NULL DEFAULT '',
  driver_phone TEXT NOT NULL DEFAULT '',
  vehicle_id TEXT,
  vehicle_name TEXT NOT NULL DEFAULT '',
  vehicle_number TEXT NOT NULL DEFAULT '',
  vehicle_type TEXT NOT NULL DEFAULT '',
  vehicle_model TEXT NOT NULL DEFAULT '',
  pickup_location TEXT NOT NULL DEFAULT '',
  dropoff_location TEXT NOT NULL DEFAULT '',
  trip_end_date DATE,
  driver_advance NUMERIC NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS td_ops_cost_sheets (
  itinerary_id UUID PRIMARY KEY,
  hotel_rows JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_vehicle_km NUMERIC NOT NULL DEFAULT 0,
  price_per_km NUMERIC NOT NULL DEFAULT 0,
  additional_charges NUMERIC NOT NULL DEFAULT 0,
  pax INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS td_ops_expenses (
  itinerary_id UUID PRIMARY KEY,
  lines JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS td_ops_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind TEXT NOT NULL CHECK (kind IN ('sales', 'car_rental', 'quotation')),
  number TEXT NOT NULL,
  date TEXT NOT NULL DEFAULT '',
  due_date TEXT NOT NULL DEFAULT '',
  agency JSONB NOT NULL DEFAULT '{}'::jsonb,
  client JSONB NOT NULL DEFAULT '{}'::jsonb,
  logo_data_url TEXT,
  services JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT NOT NULL DEFAULT '',
  terms TEXT NOT NULL DEFAULT '',
  gst_rate NUMERIC NOT NULL DEFAULT 0,
  total_paid NUMERIC NOT NULL DEFAULT 0,
  driver_license TEXT,
  vehicle_number TEXT,
  aadhaar_name TEXT,
  vehicle_name TEXT,
  trip_legs JSONB,
  rental_amount NUMERIC,
  bank_name TEXT,
  account_number TEXT,
  ifsc TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'paid')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_td_ops_invoices_updated ON td_ops_invoices(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_td_ops_invoices_kind ON td_ops_invoices(kind);

CREATE TABLE IF NOT EXISTS td_ops_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  itinerary_id UUID NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  method TEXT NOT NULL DEFAULT 'UPI',
  gateway TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed')),
  receipt_url TEXT NOT NULL DEFAULT '',
  screenshot_data_url TEXT,
  mobile TEXT NOT NULL DEFAULT '',
  transaction_id TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_td_ops_payments_itinerary ON td_ops_payments(itinerary_id, created_at DESC);

ALTER TABLE td_ops_transports ENABLE ROW LEVEL SECURITY;
ALTER TABLE td_ops_cost_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE td_ops_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE td_ops_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE td_ops_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_all_ops_transports" ON td_ops_transports;
CREATE POLICY "anon_all_ops_transports" ON td_ops_transports FOR ALL TO anon USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "authenticated_all_ops_transports" ON td_ops_transports;
CREATE POLICY "authenticated_all_ops_transports" ON td_ops_transports FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_all_ops_cost_sheets" ON td_ops_cost_sheets;
CREATE POLICY "anon_all_ops_cost_sheets" ON td_ops_cost_sheets FOR ALL TO anon USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "authenticated_all_ops_cost_sheets" ON td_ops_cost_sheets;
CREATE POLICY "authenticated_all_ops_cost_sheets" ON td_ops_cost_sheets FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_all_ops_expenses" ON td_ops_expenses;
CREATE POLICY "anon_all_ops_expenses" ON td_ops_expenses FOR ALL TO anon USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "authenticated_all_ops_expenses" ON td_ops_expenses;
CREATE POLICY "authenticated_all_ops_expenses" ON td_ops_expenses FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_all_ops_invoices" ON td_ops_invoices;
CREATE POLICY "anon_all_ops_invoices" ON td_ops_invoices FOR ALL TO anon USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "authenticated_all_ops_invoices" ON td_ops_invoices;
CREATE POLICY "authenticated_all_ops_invoices" ON td_ops_invoices FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_all_ops_payments" ON td_ops_payments;
CREATE POLICY "anon_all_ops_payments" ON td_ops_payments FOR ALL TO anon USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "authenticated_all_ops_payments" ON td_ops_payments;
CREATE POLICY "authenticated_all_ops_payments" ON td_ops_payments FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── Chat platform ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS td_chat_platform (
  id TEXT PRIMARY KEY DEFAULT 'default',
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO td_chat_platform (id, payload)
VALUES ('default', '{}'::jsonb)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE td_chat_platform ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_all_chat_platform" ON td_chat_platform;
CREATE POLICY "anon_all_chat_platform" ON td_chat_platform FOR ALL TO anon USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "authenticated_all_chat_platform" ON td_chat_platform;
CREATE POLICY "authenticated_all_chat_platform" ON td_chat_platform FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── Email anon RLS ────────────────────────────────────────────────────
DROP POLICY IF EXISTS "anon_all_team_email" ON team_email_messages;
CREATE POLICY "anon_all_team_email" ON team_email_messages FOR ALL TO anon USING (true) WITH CHECK (true);
