import type { TeamMember, TeamRole, PermissionKey } from "@/types/rbac";
import { ALL_PERMISSION_KEYS } from "@/types/rbac";
import { DEMO_TEAM } from "@/lib/rbac/current-user";
import { asTeamRole } from "@/lib/rbac/role-utils";

type AuthUserLike = {
  id: string;
  email?: string | null;
  user_metadata?: { full_name?: string };
  created_at?: string;
};

function sanitizePerms(raw: unknown): PermissionKey[] | null {
  if (!Array.isArray(raw)) return null;
  return raw.filter((p): p is PermissionKey =>
    typeof p === "string" && ALL_PERMISSION_KEYS.includes(p as PermissionKey)
  );
}

/**
 * Map a Supabase Auth user to a TeamMember using Real DB roles when present.
 * Prefers td_team_members, then admin_profiles, then demo roster, then admin.
 */
export async function resolveAuthTeamMember(user: AuthUserLike): Promise<TeamMember> {
  const email = (user.email ?? "").trim().toLowerCase();

  let role: TeamRole = "admin";
  let name = user.user_metadata?.full_name ?? email.split("@")[0] ?? "User";
  let mfa_enabled = false;
  let mfa_locked = false;
  let is_active = true;
  let created_at = user.created_at ?? new Date().toISOString();
  let id = user.id;
  let permission_overrides: PermissionKey[] | null = null;
  let foundTeam = false;

  try {
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();

    if (email) {
      const { data: teamRow } = await supabase
        .from("td_team_members")
        .select("id, name, email, role, mfa_enabled, mfa_locked, is_active, created_at, permission_overrides")
        .ilike("email", email)
        .maybeSingle();

      if (teamRow) {
        foundTeam = true;
        const mapped = asTeamRole(teamRow.role);
        if (mapped) role = mapped;
        id = teamRow.id || id;
        name = teamRow.name || name;
        mfa_enabled = Boolean(teamRow.mfa_enabled);
        mfa_locked = Boolean(teamRow.mfa_locked);
        is_active = teamRow.is_active !== false;
        created_at = teamRow.created_at || created_at;
        permission_overrides = sanitizePerms(teamRow.permission_overrides);
      }
    }

    const { data: profile } = await supabase
      .from("admin_profiles")
      .select("full_name, role, is_active")
      .eq("id", user.id)
      .maybeSingle();

    if (profile) {
      const mapped = asTeamRole(profile.role);
      if (mapped === "superadmin") role = "superadmin";
      else if (mapped && role === "admin") role = mapped;
      if (profile.full_name) name = profile.full_name;
      if (profile.is_active === false) is_active = false;
    }
  } catch {
    // Fall through with defaults when Supabase is unreachable.
  }

  if (!foundTeam) {
    const demoMatch = DEMO_TEAM.find((m) => m.email.toLowerCase() === email && m.is_active);
    if (demoMatch) return demoMatch;
  }

  return {
    id,
    name,
    email: user.email ?? email,
    role,
    mfa_enabled,
    mfa_locked,
    is_active,
    created_at,
    permission_overrides,
  };
}
