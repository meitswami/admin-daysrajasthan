-- Phase A extensions: multi-tier pricing, payments, soft delete, pricing audit

CREATE TYPE payment_status AS ENUM ('unpaid', 'partial', 'paid');

ALTER TABLE client_itineraries
  ADD COLUMN IF NOT EXISTS category_totals JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS payment_status payment_status NOT NULL DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS amount_paid NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS source_package_id TEXT;

CREATE TABLE IF NOT EXISTS pricing_change_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_itinerary_id UUID NOT NULL REFERENCES client_itineraries(id) ON DELETE CASCADE,
  revision_id UUID REFERENCES itinerary_revisions(id),
  category_key TEXT,
  field_path TEXT NOT NULL,
  old_value NUMERIC,
  new_value NUMERIC,
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  note TEXT
);

CREATE INDEX IF NOT EXISTS idx_pricing_log_itinerary ON pricing_change_log(client_itinerary_id, changed_at DESC);

CREATE TABLE IF NOT EXISTS td_system_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO td_system_settings (key, value)
VALUES ('data_mode', '"dummy"'::jsonb)
ON CONFLICT (key) DO NOTHING;

ALTER TABLE pricing_change_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE td_system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_pricing_log" ON pricing_change_log
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "admins_system_settings" ON td_system_settings
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
