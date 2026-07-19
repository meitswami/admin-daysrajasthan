import {
  ALL_PERMISSION_KEYS,
  type PermissionKey,
  type TeamMember,
  type TeamRole,
} from "@/types/rbac";
import { getEffectivePermissions } from "@/lib/rbac/permission-overrides";
import { asTeamRole } from "@/lib/rbac/role-utils";
import { DEMO_TEAM } from "@/lib/rbac/current-user";
import { isSupabaseConfigured } from "@/lib/system/data-mode";
import { logActivity } from "@/lib/system/activity-log";

const STORAGE_KEY = "td-staff-members-v1";

function sanitizePerms(raw: unknown): PermissionKey[] | null {
  if (raw == null) return null;
  if (!Array.isArray(raw)) return null;
  const valid = raw.filter((p): p is PermissionKey =>
    typeof p === "string" && ALL_PERMISSION_KEYS.includes(p as PermissionKey)
  );
  return valid;
}

function mapRow(row: Record<string, unknown>): TeamMember | null {
  const role = asTeamRole(String(row.role ?? ""));
  if (!role) return null;
  return {
    id: String(row.id),
    name: String(row.name ?? ""),
    email: String(row.email ?? ""),
    role,
    mfa_enabled: Boolean(row.mfa_enabled),
    mfa_locked: Boolean(row.mfa_locked),
    is_active: row.is_active !== false,
    created_at: String(row.created_at ?? new Date().toISOString()),
    permission_overrides: sanitizePerms(row.permission_overrides),
  };
}

function readLocal(): TeamMember[] {
  if (typeof window === "undefined") return DEMO_TEAM.map((m) => ({ ...m }));
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seeded = DEMO_TEAM.map((m) => ({ ...m, permission_overrides: null }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
      return seeded;
    }
    const parsed = JSON.parse(raw) as TeamMember[];
    return Array.isArray(parsed) ? parsed : DEMO_TEAM.map((m) => ({ ...m }));
  } catch {
    return DEMO_TEAM.map((m) => ({ ...m }));
  }
}

function writeLocal(members: TeamMember[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(members));
  window.dispatchEvent(new CustomEvent("td-team-member-change"));
}

export function memberEffectivePermissions(member: TeamMember): PermissionKey[] {
  if (member.permission_overrides != null) {
    return [...member.permission_overrides];
  }
  return getEffectivePermissions(member.role);
}

export function memberHasPermission(member: TeamMember, permission: PermissionKey): boolean {
  return memberEffectivePermissions(member).includes(permission);
}

export async function listStaffMembers(): Promise<TeamMember[]> {
  if (isSupabaseConfigured()) {
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { data, error } = await supabase
        .from("td_team_members")
        .select("id, name, email, role, mfa_enabled, mfa_locked, is_active, created_at, permission_overrides")
        .order("created_at", { ascending: true });
      if (!error && data?.length) {
        const mapped = data
          .map((r) => mapRow(r as Record<string, unknown>))
          .filter((m): m is TeamMember => Boolean(m));
        if (mapped.length) return mapped;
      }
    } catch {
      // fall through
    }
  }
  return readLocal();
}

export type StaffUpdateInput = {
  name?: string;
  role?: TeamRole;
  is_active?: boolean;
  mfa_enabled?: boolean;
  mfa_locked?: boolean;
  permission_overrides?: PermissionKey[] | null;
};

export async function updateStaffMember(
  id: string,
  patch: StaffUpdateInput,
  actor?: TeamMember
): Promise<TeamMember | null> {
  const beforeList = await listStaffMembers();
  const before = beforeList.find((m) => m.id === id) ?? null;

  if (isSupabaseConfigured()) {
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (patch.name !== undefined) payload.name = patch.name.trim();
      if (patch.role !== undefined) payload.role = patch.role;
      if (patch.is_active !== undefined) payload.is_active = patch.is_active;
      if (patch.mfa_enabled !== undefined) payload.mfa_enabled = patch.mfa_enabled;
      if (patch.mfa_locked !== undefined) payload.mfa_locked = patch.mfa_locked;
      if (patch.permission_overrides !== undefined) {
        payload.permission_overrides = patch.permission_overrides;
      }

      const { data, error } = await supabase
        .from("td_team_members")
        .update(payload)
        .eq("id", id)
        .select("id, name, email, role, mfa_enabled, mfa_locked, is_active, created_at, permission_overrides")
        .maybeSingle();

      if (!error && data) {
        const after = mapRow(data as Record<string, unknown>);
        logActivity({
          action: "settings_change",
          module: "staff",
          summary: `Updated staff ${after?.name ?? id}`,
          entity_type: "team_member",
          entity_id: id,
          metadata: { before, after, actor: actor?.email },
        });
        return after;
      }
    } catch {
      // fall through
    }
  }

  const list = readLocal();
  const idx = list.findIndex((m) => m.id === id);
  if (idx < 0) return null;
  list[idx] = {
    ...list[idx],
    ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
    ...(patch.role !== undefined ? { role: patch.role } : {}),
    ...(patch.is_active !== undefined ? { is_active: patch.is_active } : {}),
    ...(patch.mfa_enabled !== undefined ? { mfa_enabled: patch.mfa_enabled } : {}),
    ...(patch.mfa_locked !== undefined ? { mfa_locked: patch.mfa_locked } : {}),
    ...(patch.permission_overrides !== undefined
      ? { permission_overrides: patch.permission_overrides }
      : {}),
  };
  writeLocal(list);
  // Keep demo Acting-as roster in sync for local edits
  const demoIdx = DEMO_TEAM.findIndex((m) => m.id === id);
  if (demoIdx >= 0) {
    DEMO_TEAM[demoIdx] = { ...list[idx] };
  }
  logActivity({
    action: "settings_change",
    module: "staff",
    summary: `Updated staff ${list[idx].name}`,
    entity_type: "team_member",
    entity_id: id,
    metadata: { before, after: list[idx] },
  });
  return list[idx];
}

export type StaffCreateInput = {
  name: string;
  email: string;
  role: TeamRole;
  is_active?: boolean;
};

export async function createStaffMember(
  input: StaffCreateInput,
  actor?: TeamMember
): Promise<TeamMember> {
  const member: TeamMember = {
    id: crypto.randomUUID(),
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    role: input.role,
    mfa_enabled: false,
    mfa_locked: false,
    is_active: input.is_active !== false,
    created_at: new Date().toISOString(),
    permission_overrides: null,
  };

  let persisted = false;
  if (isSupabaseConfigured()) {
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { error } = await supabase.from("td_team_members").insert({
        id: member.id,
        name: member.name,
        email: member.email,
        role: member.role,
        mfa_enabled: false,
        mfa_locked: false,
        is_active: member.is_active,
        permission_overrides: null,
      });
      if (!error) persisted = true;
    } catch {
      // fall through
    }
  }

  if (!persisted) {
    const list = readLocal();
    list.push(member);
    writeLocal(list);
  }

  logActivity({
    action: "settings_change",
    module: "staff",
    summary: `Added staff ${member.name} (${member.role})`,
    entity_type: "team_member",
    entity_id: member.id,
    metadata: { member, actor: actor?.email },
  });

  return member;
}

export async function sendStaffPasswordReset(email: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const { requestPasswordReset } = await import("@/lib/auth/password-reset");
    return await requestPasswordReset(email);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed" };
  }
}
