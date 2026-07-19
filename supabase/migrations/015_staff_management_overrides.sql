-- Staff management: per-member permission overrides
ALTER TABLE td_team_members
  ADD COLUMN IF NOT EXISTS permission_overrides JSONB,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Seed demo staff roster into Real DB (idempotent by email)
INSERT INTO td_team_members (id, name, email, role, mfa_enabled, mfa_locked, is_active, created_at)
VALUES
  ('b1000001-0001-4000-8000-000000000001', 'Travel Days Admin', 'info@traveldaysrajasthan.com', 'superadmin', false, false, true, '2026-01-01T00:00:00Z'),
  ('b1000001-0001-4000-8000-000000000002', 'Vandana Shekhawat', 'vandana@traveldays.in', 'sales', false, false, true, '2026-01-01T00:00:00Z'),
  ('b1000001-0001-4000-8000-000000000003', 'Raja Shaker', 'raja@traveldays.in', 'sales_admin', false, false, true, '2026-01-01T00:00:00Z'),
  ('b1000001-0001-4000-8000-000000000004', 'Admin User', 'admin@traveldays.in', 'admin', true, false, true, '2026-01-01T00:00:00Z'),
  ('b1000001-0001-4000-8000-000000000005', 'Priya Vohra', 'priya@traveldays.in', 'sales_admin', false, false, true, '2026-02-01T00:00:00Z'),
  ('b1000001-0001-4000-8000-000000000006', 'Finance User', 'finance@traveldays.in', 'finance', false, false, true, '2026-02-01T00:00:00Z')
ON CONFLICT (email) DO UPDATE SET
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  is_active = EXCLUDED.is_active;
