-- Allow Super Admins to set staff password / email from Staff Management
-- without relying on the email reset link alone.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.td_admin_update_staff_credentials(
  p_member_id UUID,
  p_new_email TEXT DEFAULT NULL,
  p_new_password TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_actor_id UUID := auth.uid();
  v_actor_email TEXT;
  v_actor_role TEXT;
  v_member RECORD;
  v_email TEXT;
  v_auth_id UUID;
  v_password_set BOOLEAN := false;
  v_email_changed BOOLEAN := false;
BEGIN
  IF v_actor_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Not authenticated');
  END IF;

  SELECT lower(email) INTO v_actor_email FROM auth.users WHERE id = v_actor_id;

  SELECT role INTO v_actor_role
  FROM public.td_team_members
  WHERE is_active = true
    AND (id = v_actor_id OR lower(email) = v_actor_email)
  ORDER BY CASE WHEN id = v_actor_id THEN 0 ELSE 1 END
  LIMIT 1;

  IF v_actor_role IS DISTINCT FROM 'superadmin' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Only Super Admin can change credentials');
  END IF;

  SELECT * INTO v_member
  FROM public.td_team_members
  WHERE id = p_member_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Staff member not found');
  END IF;

  IF (p_new_email IS NULL OR trim(p_new_email) = '')
     AND (p_new_password IS NULL OR p_new_password = '') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Provide a new email and/or password');
  END IF;

  v_email := lower(trim(COALESCE(NULLIF(trim(p_new_email), ''), v_member.email)));

  IF v_email = '' OR v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Enter a valid email address');
  END IF;

  IF lower(v_email) <> lower(v_member.email) THEN
    IF EXISTS (
      SELECT 1 FROM public.td_team_members
      WHERE lower(email) = v_email AND id <> p_member_id
    ) THEN
      RETURN jsonb_build_object('ok', false, 'error', 'This email is already used by another staff member');
    END IF;

    IF EXISTS (
      SELECT 1 FROM auth.users
      WHERE lower(email) = v_email
        AND id <> COALESCE(
          (SELECT id FROM auth.users WHERE id = p_member_id),
          (SELECT id FROM auth.users WHERE lower(email) = lower(v_member.email) LIMIT 1),
          '00000000-0000-0000-0000-000000000000'::uuid
        )
    ) THEN
      RETURN jsonb_build_object('ok', false, 'error', 'This email is already registered for login');
    END IF;

    v_email_changed := true;
  END IF;

  IF p_new_password IS NOT NULL AND p_new_password <> '' THEN
    IF char_length(p_new_password) < 8 THEN
      RETURN jsonb_build_object('ok', false, 'error', 'Password must be at least 8 characters');
    END IF;
  END IF;

  -- Resolve auth user: prefer same id as team member, else match current email
  SELECT id INTO v_auth_id FROM auth.users WHERE id = p_member_id;
  IF v_auth_id IS NULL THEN
    SELECT id INTO v_auth_id FROM auth.users WHERE lower(email) = lower(v_member.email) LIMIT 1;
  END IF;

  IF v_auth_id IS NULL THEN
    -- Create auth user if missing (e.g. staff row without login yet)
    IF p_new_password IS NULL OR p_new_password = '' THEN
      RETURN jsonb_build_object(
        'ok', false,
        'error', 'No login account found — set a password to create one'
      );
    END IF;

    v_auth_id := public.td_upsert_auth_user(
      p_member_id,
      v_email,
      p_new_password,
      v_member.name
    );
    v_password_set := true;
  ELSE
    IF p_new_password IS NOT NULL AND p_new_password <> '' THEN
      UPDATE auth.users
      SET
        encrypted_password = crypt(p_new_password, gen_salt('bf')),
        updated_at = now(),
        banned_until = NULL,
        deleted_at = NULL
      WHERE id = v_auth_id;
      v_password_set := true;
    END IF;

    IF v_email_changed THEN
      UPDATE auth.users
      SET
        email = v_email,
        email_change = '',
        email_change_token_new = '',
        updated_at = now()
      WHERE id = v_auth_id;

      UPDATE auth.identities
      SET
        identity_data = COALESCE(identity_data, '{}'::jsonb)
          || jsonb_build_object(
            'sub', v_auth_id::text,
            'email', v_email,
            'email_verified', true
          ),
        updated_at = now()
      WHERE user_id = v_auth_id;
    END IF;
  END IF;

  IF v_email_changed THEN
    UPDATE public.td_team_members
    SET email = v_email, updated_at = now()
    WHERE id = p_member_id;
  ELSE
    UPDATE public.td_team_members
    SET updated_at = now()
    WHERE id = p_member_id;
  END IF;

  IF EXISTS (SELECT 1 FROM public.admin_profiles WHERE id = p_member_id) THEN
    UPDATE public.admin_profiles
    SET updated_at = now()
    WHERE id = p_member_id;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'email', v_email,
    'password_set', v_password_set,
    'email_changed', v_email_changed
  );
END;
$$;

REVOKE ALL ON FUNCTION public.td_admin_update_staff_credentials(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.td_admin_update_staff_credentials(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.td_admin_update_staff_credentials(UUID, TEXT, TEXT) TO service_role;

COMMENT ON FUNCTION public.td_admin_update_staff_credentials IS
  'Super Admin only: update staff login email and/or set password from Staff Management.';
