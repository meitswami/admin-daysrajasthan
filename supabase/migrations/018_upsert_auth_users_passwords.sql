-- Upsert Auth users + team/admin roster passwords & roles
-- SUPERADMIN: info@traveldaysrajasthan.com
-- ADMIN:      ransa5566@gmail.com
-- Others:     demo1234

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Helper: create or update an email/password auth user + identity
CREATE OR REPLACE FUNCTION td_upsert_auth_user(
  p_id UUID,
  p_email TEXT,
  p_password TEXT,
  p_full_name TEXT
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth, public, extensions
AS $$
DECLARE
  v_id UUID;
  v_encrypted TEXT;
BEGIN
  v_encrypted := crypt(p_password, gen_salt('bf'));

  SELECT id INTO v_id FROM auth.users WHERE lower(email) = lower(p_email);

  IF v_id IS NULL THEN
    v_id := COALESCE(p_id, gen_random_uuid());
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      recovery_token,
      email_change_token_new,
      email_change,
      is_sso_user,
      is_anonymous
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_id,
      'authenticated',
      'authenticated',
      lower(p_email),
      v_encrypted,
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('full_name', p_full_name),
      now(),
      now(),
      '',
      '',
      '',
      '',
      false,
      false
    );
  ELSE
    UPDATE auth.users
    SET
      encrypted_password = v_encrypted,
      email_confirmed_at = COALESCE(email_confirmed_at, now()),
      raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('full_name', p_full_name),
      updated_at = now(),
      banned_until = NULL,
      deleted_at = NULL
    WHERE id = v_id;
  END IF;

  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    v_id,
    jsonb_build_object('sub', v_id::text, 'email', lower(p_email), 'email_verified', true),
    'email',
    v_id::text,
    now(),
    now(),
    now()
  )
  ON CONFLICT (provider_id, provider) DO UPDATE SET
    user_id = EXCLUDED.user_id,
    identity_data = EXCLUDED.identity_data,
    updated_at = now();

  RETURN v_id;
END;
$$;

-- ── Superadmin ─────────────────────────────────────────────────────────────
SELECT td_upsert_auth_user(
  'b1000001-0001-4000-8000-000000000001'::uuid,
  'info@traveldaysrajasthan.com',
  'DaysRajasthan@0012',
  'Travel Days Admin'
);

INSERT INTO td_team_members (
  id, name, email, role, mfa_enabled, mfa_locked, is_active, created_at, updated_at
) VALUES (
  'b1000001-0001-4000-8000-000000000001',
  'Travel Days Admin',
  'info@traveldaysrajasthan.com',
  'superadmin',
  false, false, true,
  '2026-01-01T00:00:00Z',
  now()
)
ON CONFLICT (email) DO UPDATE SET
  name = EXCLUDED.name,
  role = 'superadmin',
  is_active = true,
  updated_at = now();

INSERT INTO admin_profiles (id, full_name, role, is_active, created_at, updated_at)
VALUES (
  'b1000001-0001-4000-8000-000000000001',
  'Travel Days Admin',
  'super_admin',
  true,
  now(),
  now()
)
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  role = 'super_admin',
  is_active = true,
  updated_at = now();

-- ── Admin (Ranveer) ────────────────────────────────────────────────────────
SELECT td_upsert_auth_user(
  'd1000001-0001-4000-8000-000000000001'::uuid,
  'ransa5566@gmail.com',
  'Ranveer@rt@7773',
  'Ranveer'
);

INSERT INTO td_team_members (
  id, name, email, role, mfa_enabled, mfa_locked, is_active, created_at, updated_at
) VALUES (
  'd1000001-0001-4000-8000-000000000001',
  'Ranveer',
  'ransa5566@gmail.com',
  'admin',
  false, false, true,
  now(),
  now()
)
ON CONFLICT (email) DO UPDATE SET
  name = EXCLUDED.name,
  role = 'admin',
  is_active = true,
  updated_at = now();

INSERT INTO admin_profiles (id, full_name, role, is_active, created_at, updated_at)
VALUES (
  'd1000001-0001-4000-8000-000000000001',
  'Ranveer',
  'admin',
  true,
  now(),
  now()
)
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  role = 'admin',
  is_active = true,
  updated_at = now();

-- ── All other team members → password demo1234 ─────────────────────────────
DO $$
DECLARE
  r RECORD;
  v_auth_id UUID;
BEGIN
  FOR r IN
    SELECT id, name, email
    FROM td_team_members
    WHERE is_active = true
      AND lower(email) NOT IN (
        'info@traveldaysrajasthan.com',
        'ransa5566@gmail.com'
      )
  LOOP
    v_auth_id := td_upsert_auth_user(r.id, r.email, 'demo1234', r.name);
  END LOOP;

  -- Existing standalone auth user (admin@daysrajasthan.com)
  IF EXISTS (SELECT 1 FROM auth.users WHERE lower(email) = 'admin@daysrajasthan.com') THEN
    PERFORM td_upsert_auth_user(
      (SELECT id FROM auth.users WHERE lower(email) = 'admin@daysrajasthan.com'),
      'admin@daysrajasthan.com',
      'demo1234',
      'Days Rajasthan Admin'
    );
  END IF;
END $$;

-- Keep helper for future idempotent runs (optional to drop)
-- DROP FUNCTION IF EXISTS td_upsert_auth_user(UUID, TEXT, TEXT, TEXT);
