-- Phase C/D: activity logs + team members (RBAC scaffold)

CREATE TABLE IF NOT EXISTS td_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  module TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  summary TEXT NOT NULL,
  actor_id TEXT,
  actor_name TEXT,
  actor_role TEXT,
  ip_address INET,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_td_activity_created ON td_activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_td_activity_module ON td_activity_logs(module, action);

CREATE TABLE IF NOT EXISTS td_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL,
  mfa_enabled BOOLEAN DEFAULT false,
  mfa_locked BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE td_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE td_team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_activity_logs" ON td_activity_logs
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "admins_team_members" ON td_team_members
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
