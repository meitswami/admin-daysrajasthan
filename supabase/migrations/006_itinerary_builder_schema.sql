-- Itinerary Builder V2 — Enterprise schema (apply when connecting Supabase)
-- Aligns with FRS: To Build Itinerary Builder.md

CREATE TYPE itinerary_record_type AS ENUM ('website_package', 'client_itinerary');
CREATE TYPE workflow_status AS ENUM (
  'draft', 'sales_review', 'manager_approval', 'accounts', 'operations',
  'client_shared', 'client_approved', 'booking_confirmed', 'completed', 'archived'
);
CREATE TYPE revision_save_type AS ENUM (
  'autosave', 'manual', 'rollback', 'duplicate', 'workflow_transition'
);

CREATE TABLE IF NOT EXISTS client_itineraries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id VARCHAR(20) NOT NULL UNIQUE,
  type itinerary_record_type NOT NULL DEFAULT 'client_itinerary',
  title TEXT NOT NULL,
  tour_code VARCHAR(50),
  workflow_status workflow_status NOT NULL DEFAULT 'draft',
  current_revision_id UUID,
  current_version INTEGER NOT NULL DEFAULT 1,
  owner_id UUID REFERENCES auth.users(id),
  client_name TEXT NOT NULL,
  client_email TEXT,
  client_phone TEXT,
  travel_date DATE,
  adults INTEGER DEFAULT 2,
  children INTEGER DEFAULT 0,
  rooms INTEGER DEFAULT 1,
  grand_total NUMERIC(12,2) DEFAULT 0,
  currency CHAR(3) DEFAULT 'INR',
  margin_pct NUMERIC(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS itinerary_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  itinerary_id UUID NOT NULL REFERENCES client_itineraries(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  parent_revision_id UUID REFERENCES itinerary_revisions(id),
  milestone_label VARCHAR(100),
  change_summary TEXT,
  save_type revision_save_type NOT NULL DEFAULT 'manual',
  snapshot JSONB NOT NULL,
  snapshot_checksum VARCHAR(64),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address INET,
  user_agent TEXT,
  UNIQUE (itinerary_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_client_itineraries_status ON client_itineraries(workflow_status);
CREATE INDEX IF NOT EXISTS idx_client_itineraries_updated ON client_itineraries(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_itinerary_revisions_itinerary ON itinerary_revisions(itinerary_id, version_number DESC);
CREATE INDEX IF NOT EXISTS idx_itinerary_revisions_snapshot ON itinerary_revisions USING GIN (snapshot);

ALTER TABLE client_itineraries
  ADD CONSTRAINT fk_current_revision
  FOREIGN KEY (current_revision_id) REFERENCES itinerary_revisions(id);

CREATE TABLE IF NOT EXISTS itinerary_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  action VARCHAR(50) NOT NULL,
  actor_id UUID REFERENCES auth.users(id),
  ip_address INET,
  user_agent TEXT,
  changes JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_entity ON itinerary_audit_logs(entity_type, entity_id, created_at DESC);

ALTER TABLE client_itineraries ENABLE ROW LEVEL SECURITY;
ALTER TABLE itinerary_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE itinerary_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_all_client_itineraries" ON client_itineraries
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "admins_all_itinerary_revisions" ON itinerary_revisions
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "admins_all_itinerary_audit" ON itinerary_audit_logs
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
