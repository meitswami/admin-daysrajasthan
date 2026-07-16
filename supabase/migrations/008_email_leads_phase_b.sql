-- Phase B: team email mailbox + unified leads

CREATE TYPE email_folder AS ENUM ('inbox', 'draft', 'sent', 'scheduled', 'outbox', 'spam');
CREATE TYPE email_delivery_status AS ENUM (
  'draft', 'scheduled', 'queued', 'sent', 'failed', 'received', 'pending'
);
CREATE TYPE lead_source AS ENUM ('website_inquiry', 'whatsapp', 'contact', 'email');
CREATE TYPE lead_status AS ENUM ('new', 'contacted', 'quoted', 'converted', 'closed');

CREATE TABLE IF NOT EXISTS team_email_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folder email_folder NOT NULL DEFAULT 'draft',
  from_email TEXT NOT NULL,
  from_name TEXT NOT NULL,
  to_email TEXT NOT NULL,
  to_name TEXT,
  cc TEXT,
  subject TEXT NOT NULL,
  body_text TEXT NOT NULL,
  body_html TEXT NOT NULL,
  template_id TEXT,
  itinerary_id UUID REFERENCES client_itineraries(id) ON DELETE SET NULL,
  quote_id VARCHAR(20),
  delivery_status email_delivery_status NOT NULL DEFAULT 'draft',
  send_count INTEGER DEFAULT 0,
  seen BOOLEAN DEFAULT false,
  seen_at TIMESTAMPTZ,
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_by TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_team_email_folder ON team_email_messages(folder, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_team_email_quote ON team_email_messages(quote_id);

CREATE TABLE IF NOT EXISTS unified_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source lead_source NOT NULL,
  source_id TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  destination TEXT,
  travel_date DATE,
  adults INTEGER DEFAULT 2,
  children INTEGER DEFAULT 0,
  package_hint TEXT,
  notes TEXT,
  status lead_status NOT NULL DEFAULT 'new',
  converted_quote_id VARCHAR(20),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (source, source_id)
);

ALTER TABLE client_itineraries
  ADD COLUMN IF NOT EXISTS lead_id TEXT,
  ADD COLUMN IF NOT EXISTS lead_source lead_source;

ALTER TABLE team_email_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE unified_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_team_email" ON team_email_messages
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "admins_unified_leads" ON unified_leads
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
