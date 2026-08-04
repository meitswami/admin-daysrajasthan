import {
  ALL_PERMISSION_KEYS,
  type PermissionKey,
  type StaffPermissionGroup,
} from "@/types/rbac";
import { isSupabaseConfigured } from "@/lib/system/data-mode";
import { logActivity } from "@/lib/system/activity-log";

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

/** In-memory cache for sync permission resolution (never localStorage). */
let memoryGroups: StaffPermissionGroup[] = [];

function requireCloud() {
  if (!isSupabaseConfigured()) {
    throw new Error(
      "Supabase is not configured. Permission groups require a live database (no browser storage)."
    );
  }
}

/** Synchronous lookup — used when resolving member permissions */
export function getPermissionGroupSync(id: string | null | undefined): StaffPermissionGroup | null {
  if (!id) return null;
  return memoryGroups.find((g) => g.id === id) ?? null;
}

export async function listPermissionGroups(): Promise<StaffPermissionGroup[]> {
  requireCloud();
  const { createClient } = await import("@/lib/supabase/client");
  const supabase = createClient();
  const { data, error } = await supabase
    .from("td_permission_groups")
    .select("id, name, description, permissions, created_at, updated_at")
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  const mapped = (data ?? [])
    .map((r) => mapRow(r as Record<string, unknown>))
    .filter((g): g is StaffPermissionGroup => Boolean(g));
  memoryGroups = mapped;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("td-permission-groups-change"));
  }
  return mapped;
}

export type PermissionGroupInput = {
  name: string;
  description?: string;
  permissions: PermissionKey[];
};

export async function createPermissionGroup(
  input: PermissionGroupInput
): Promise<StaffPermissionGroup> {
  requireCloud();
  const group: StaffPermissionGroup = {
    id: crypto.randomUUID(),
    name: input.name.trim(),
    description: input.description?.trim() || undefined,
    permissions: sanitizePerms(input.permissions),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { createClient } = await import("@/lib/supabase/client");
  const supabase = createClient();
  const { error } = await supabase.from("td_permission_groups").insert({
    id: group.id,
    name: group.name,
    description: group.description ?? null,
    permissions: group.permissions,
  });
  if (error) throw new Error(error.message);

  memoryGroups = [...memoryGroups, group];
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
  requireCloud();
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
  if (error) throw new Error(error.message);
  if (!data) return null;
  const updated = mapRow(data as Record<string, unknown>);
  if (!updated) return null;

  memoryGroups = memoryGroups.map((g) => (g.id === id ? updated : g));
  logActivity({
    action: "settings_change",
    module: "staff",
    summary: `Updated permission group ${updated.name}`,
    entity_type: "permission_group",
    entity_id: id,
  });
  return updated;
}

export async function deletePermissionGroup(id: string): Promise<boolean> {
  requireCloud();
  const { createClient } = await import("@/lib/supabase/client");
  const supabase = createClient();
  const { error } = await supabase.from("td_permission_groups").delete().eq("id", id);
  if (error) throw new Error(error.message);
  memoryGroups = memoryGroups.filter((g) => g.id !== id);
  return true;
}
