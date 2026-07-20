import {
  ALL_PERMISSION_KEYS,
  type PermissionKey,
  type StaffPermissionGroup,
} from "@/types/rbac";
import { SEED_PERMISSION_GROUPS } from "@/lib/rbac/staff-seed";
import { isSupabaseConfigured } from "@/lib/system/data-mode";
import { logActivity } from "@/lib/system/activity-log";

const STORAGE_KEY = "td-permission-groups-v1";

function sanitizePerms(raw: unknown): PermissionKey[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (p): p is PermissionKey =>
      typeof p === "string" && ALL_PERMISSION_KEYS.includes(p as PermissionKey)
  );
}

function mapRow(row: Record<string, unknown>): StaffPermissionGroup | null {
  const id = String(row.id ?? "");
  const name = String(row.name ?? "").trim();
  if (!id || !name) return null;
  return {
    id,
    name,
    description: row.description ? String(row.description) : undefined,
    permissions: sanitizePerms(row.permissions),
    created_at: String(row.created_at ?? new Date().toISOString()),
    updated_at: String(row.updated_at ?? new Date().toISOString()),
  };
}

function readLocal(): StaffPermissionGroup[] {
  if (typeof window === "undefined") return SEED_PERMISSION_GROUPS.map((g) => ({ ...g }));
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seeded = SEED_PERMISSION_GROUPS.map((g) => ({ ...g }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
      return seeded;
    }
    const parsed = JSON.parse(raw) as StaffPermissionGroup[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return SEED_PERMISSION_GROUPS.map((g) => ({ ...g }));
    }
    return parsed;
  } catch {
    return SEED_PERMISSION_GROUPS.map((g) => ({ ...g }));
  }
}

function writeLocal(groups: StaffPermissionGroup[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(groups));
  window.dispatchEvent(new CustomEvent("td-permission-groups-change"));
}

/** Synchronous lookup — used when resolving member permissions */
export function getPermissionGroupSync(id: string | null | undefined): StaffPermissionGroup | null {
  if (!id) return null;
  return readLocal().find((g) => g.id === id) ?? null;
}

export async function listPermissionGroups(): Promise<StaffPermissionGroup[]> {
  if (isSupabaseConfigured()) {
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { data, error } = await supabase
        .from("td_permission_groups")
        .select("id, name, description, permissions, created_at, updated_at")
        .order("name", { ascending: true });
      if (!error && data?.length) {
        const mapped = data
          .map((r) => mapRow(r as Record<string, unknown>))
          .filter((g): g is StaffPermissionGroup => Boolean(g));
        if (mapped.length) {
          writeLocal(mapped);
          return mapped;
        }
      }
    } catch {
      // fall through
    }
  }
  return readLocal();
}

export type PermissionGroupInput = {
  name: string;
  description?: string;
  permissions: PermissionKey[];
};

export async function createPermissionGroup(
  input: PermissionGroupInput
): Promise<StaffPermissionGroup> {
  const group: StaffPermissionGroup = {
    id: crypto.randomUUID(),
    name: input.name.trim(),
    description: input.description?.trim() || undefined,
    permissions: sanitizePerms(input.permissions),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  let persisted = false;
  if (isSupabaseConfigured()) {
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { error } = await supabase.from("td_permission_groups").insert({
        id: group.id,
        name: group.name,
        description: group.description ?? null,
        permissions: group.permissions,
      });
      if (!error) persisted = true;
    } catch {
      // fall through
    }
  }

  if (!persisted) {
    const list = readLocal();
    list.push(group);
    writeLocal(list);
  }

  logActivity({
    action: "settings_change",
    module: "staff",
    summary: `Created permission group ${group.name}`,
    entity_type: "permission_group",
    entity_id: group.id,
  });

  return group;
}

export async function updatePermissionGroup(
  id: string,
  patch: Partial<PermissionGroupInput>
): Promise<StaffPermissionGroup | null> {
  if (isSupabaseConfigured()) {
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (patch.name !== undefined) payload.name = patch.name.trim();
      if (patch.description !== undefined) payload.description = patch.description.trim() || null;
      if (patch.permissions !== undefined) payload.permissions = sanitizePerms(patch.permissions);

      const { data, error } = await supabase
        .from("td_permission_groups")
        .update(payload)
        .eq("id", id)
        .select("id, name, description, permissions, created_at, updated_at")
        .maybeSingle();

      if (!error && data) {
        const updated = mapRow(data as Record<string, unknown>);
        if (updated) {
          const list = readLocal();
          const idx = list.findIndex((g) => g.id === id);
          if (idx >= 0) list[idx] = updated;
          else list.push(updated);
          writeLocal(list);
          logActivity({
            action: "settings_change",
            module: "staff",
            summary: `Updated permission group ${updated.name}`,
            entity_type: "permission_group",
            entity_id: id,
          });
          return updated;
        }
      }
    } catch {
      // fall through
    }
  }

  const list = readLocal();
  const idx = list.findIndex((g) => g.id === id);
  if (idx < 0) return null;
  list[idx] = {
    ...list[idx],
    ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
    ...(patch.description !== undefined
      ? { description: patch.description.trim() || undefined }
      : {}),
    ...(patch.permissions !== undefined
      ? { permissions: sanitizePerms(patch.permissions) }
      : {}),
    updated_at: new Date().toISOString(),
  };
  writeLocal(list);
  return list[idx];
}

export async function deletePermissionGroup(id: string): Promise<boolean> {
  if (isSupabaseConfigured()) {
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { error } = await supabase.from("td_permission_groups").delete().eq("id", id);
      if (error) return false;
    } catch {
      return false;
    }
  }

  const list = readLocal().filter((g) => g.id !== id);
  writeLocal(list);
  return true;
}
