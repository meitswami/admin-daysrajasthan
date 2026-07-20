-- Permission groups + Rajasthan Touring staff roster

CREATE TABLE IF NOT EXISTS td_permission_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE td_team_members
  ADD COLUMN IF NOT EXISTS permission_group_id UUID REFERENCES td_permission_groups(id) ON DELETE SET NULL;

ALTER TABLE td_permission_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_permission_groups" ON td_permission_groups
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Shared permission group for Rajasthan Touring team
INSERT INTO td_permission_groups (id, name, description, permissions, created_at, updated_at)
VALUES (
  'c2000001-0001-4000-8000-000000000001',
  'Rajasthan Touring Team',
  'Shared access for sales & operations staff at Rajasthan Touring',
  '[
    "dashboard.view",
    "itinerary_builder.view",
    "itinerary_builder.create",
    "itinerary_builder.edit",
    "email.view",
    "email.send",
    "crm.view",
    "crm.leads",
    "reports.view",
    "master_data.view",
    "operations.view"
  ]'::jsonb,
  '2026-01-01T00:00:00Z',
  '2026-01-01T00:00:00Z'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  permissions = EXCLUDED.permissions,
  updated_at = EXCLUDED.updated_at;

-- Rajasthan Touring staff (idempotent by email)
INSERT INTO td_team_members (
  id, name, email, role, mfa_enabled, mfa_locked, is_active, created_at, permission_group_id
)
VALUES
  ('c2000002-0001-4000-8000-000000000001', 'Yuvraj Singh', 'yuvraj.rajasthantouring@gmail.com', 'staff', false, false, true, '2026-03-01T00:00:00Z', 'c2000001-0001-4000-8000-000000000001'),
  ('c2000002-0001-4000-8000-000000000002', 'Vandana Shekhawat', 'vandana.rajasthantouring@gmail.com', 'staff', false, false, true, '2026-03-01T00:00:00Z', 'c2000001-0001-4000-8000-000000000001'),
  ('c2000002-0001-4000-8000-000000000003', 'Shatrughan Singh', 'shatrughan.rajasthantouring@gmail.com', 'staff', false, false, true, '2026-03-01T00:00:00Z', 'c2000001-0001-4000-8000-000000000001'),
  ('c2000002-0001-4000-8000-000000000004', 'Priya Vohra', 'priya.rajasthantouring@gmail.com', 'staff', false, false, true, '2026-03-01T00:00:00Z', 'c2000001-0001-4000-8000-000000000001'),
  ('c2000002-0001-4000-8000-000000000005', 'Pooja Shekhawat', 'pooja.rajasthantouring@gmail.com', 'staff', false, false, true, '2026-03-01T00:00:00Z', 'c2000001-0001-4000-8000-000000000001'),
  ('c2000002-0001-4000-8000-000000000006', 'Soniya Shekhawat', 'soniya.rajasthantouring@gmail.com', 'staff', false, false, true, '2026-03-01T00:00:00Z', 'c2000001-0001-4000-8000-000000000001'),
  ('c2000002-0001-4000-8000-000000000007', 'Naveen Sharma', 'naveen.rajasthantouring@gmail.com', 'staff', false, false, true, '2026-03-01T00:00:00Z', 'c2000001-0001-4000-8000-000000000001'),
  ('c2000002-0001-4000-8000-000000000008', 'Hemendra Singh', 'hemendra.rajasthantouring@gmail.com', 'staff', false, false, true, '2026-03-01T00:00:00Z', 'c2000001-0001-4000-8000-000000000001'),
  ('c2000002-0001-4000-8000-000000000009', 'Shivani', 'operation.rajasthantouring@gmail.com', 'staff', false, false, true, '2026-03-01T00:00:00Z', 'c2000001-0001-4000-8000-000000000001')
ON CONFLICT (email) DO UPDATE SET
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  is_active = EXCLUDED.is_active,
  permission_group_id = EXCLUDED.permission_group_id,
  updated_at = now();
