import type { TeamMember } from "@/types/rbac";
import { HOTEL_CATEGORY_OPTIONS } from "@/types/itinerary-builder";
import { requireCloudMaster, useCloudMaster } from "@/lib/master-data/cloud";
import { logMasterDataChange } from "@/lib/master-data/audit";

export type MasterCategory = {
  id: string;
  label: string;
  room_category: string;
  key: string;
  created_at: string;
  created_by_id?: string | null;
  created_by_name?: string | null;
};

const STORAGE_KEY = "td-master-categories-v1";

function mapRow(row: Record<string, unknown>): MasterCategory {
  return {
    id: String(row.id),
    label: String(row.label ?? ""),
    room_category: String(row.room_category ?? ""),
    key: String(row.key ?? ""),
    created_at: String(row.created_at ?? new Date().toISOString()),
    created_by_id: (row.created_by as string | null) ?? null,
    created_by_name: (row.created_by_name as string | null) ?? null,
  };
}

function toRow(item: MasterCategory) {
  return {
    id: item.id,
    label: item.label,
    room_category: item.room_category,
    key: item.key,
    created_at: item.created_at,
    created_by: item.created_by_id,
    created_by_name: item.created_by_name,
  };
}

function seed(): MasterCategory[] {
  const now = new Date().toISOString();
  return HOTEL_CATEGORY_OPTIONS.map((opt) => ({
    id: crypto.randomUUID(),
    label: opt.label,
    room_category: opt.room_category,
    key: opt.key,
    created_at: now,
    created_by_id: "tm-info",
    created_by_name: "Travel Days Admin",
  }));
}

function readLocalRaw(): MasterCategory[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as MasterCategory[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalCache(items: MasterCategory[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

async function fetchRemote(): Promise<MasterCategory[]> {
  requireCloudMaster();
  const { createClient } = await import("@/lib/supabase/client");
  const supabase = createClient();
  const { data, error } = await supabase
    .from("td_master_categories")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapRow(row as Record<string, unknown>));
}

async function uploadMissingLocal(remote: MasterCategory[]): Promise<MasterCategory[]> {
  const local = readLocalRaw();
  if (!local.length) return remote;
  const remoteIds = new Set(remote.map((r) => r.id));
  const remoteKeys = new Set(remote.map((r) => r.key));
  const missing = local.filter((l) => !remoteIds.has(l.id) && !remoteKeys.has(l.key));
  if (!missing.length) return remote;
  const { createClient } = await import("@/lib/supabase/client");
  const supabase = createClient();
  const { error } = await supabase
    .from("td_master_categories")
    .upsert(missing.map(toRow), { onConflict: "id" });
  if (error) throw new Error(error.message);
  return fetchRemote();
}

export async function listMasterCategories(): Promise<MasterCategory[]> {
  if (!useCloudMaster()) {
    const local = readLocalRaw();
    return local.length ? local : seed();
  }

  let remote = await fetchRemote();
  if (remote.length === 0) {
    const local = readLocalRaw();
    if (local.length > 0) {
      remote = await uploadMissingLocal([]);
    } else {
      const seeded = seed();
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { error } = await supabase.from("td_master_categories").insert(seeded.map(toRow));
      if (error) throw new Error(error.message);
      remote = seeded;
    }
  } else {
    remote = await uploadMissingLocal(remote);
  }

  writeLocalCache(remote);
  return remote;
}

/** Sync helper for places that still need an immediate list (hotel dropdowns). */
export function listMasterCategoriesCached(): MasterCategory[] {
  const local = readLocalRaw();
  return local.length ? local : seed();
}

export async function createMasterCategory(
  input: { label: string; room_category: string; key: string },
  actor: TeamMember
): Promise<MasterCategory> {
  requireCloudMaster();
  const item: MasterCategory = {
    id: crypto.randomUUID(),
    label: input.label.trim(),
    room_category: input.room_category.trim(),
    key: input.key.trim().toLowerCase().replace(/\s+/g, "_"),
    created_at: new Date().toISOString(),
    created_by_id: actor.id,
    created_by_name: actor.name,
  };

  const { createClient } = await import("@/lib/supabase/client");
  const supabase = createClient();
  const { error } = await supabase.from("td_master_categories").insert(toRow(item));
  if (error) throw new Error(error.message);

  logMasterDataChange({
    entityType: "category",
    entityId: item.id,
    action: "create",
    summary: `Created category “${item.label}”`,
    after: { ...item },
    actor,
  });

  return item;
}

export async function updateMasterCategory(
  id: string,
  input: { label: string; room_category: string; key: string },
  actor?: TeamMember
): Promise<MasterCategory | null> {
  requireCloudMaster();
  const list = await listMasterCategories();
  const before = list.find((i) => i.id === id);
  if (!before) return null;
  const next: MasterCategory = {
    ...before,
    label: input.label.trim(),
    room_category: input.room_category.trim(),
    key: input.key.trim().toLowerCase().replace(/\s+/g, "_"),
  };

  const { createClient } = await import("@/lib/supabase/client");
  const supabase = createClient();
  const { error } = await supabase
    .from("td_master_categories")
    .update({
      label: next.label,
      room_category: next.room_category,
      key: next.key,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);

  logMasterDataChange({
    entityType: "category",
    entityId: id,
    action: "update",
    summary: `Updated category “${next.label}”`,
    before: { ...before },
    after: { ...next },
    actor,
  });

  return next;
}

export async function deleteMasterCategory(id: string, actor?: TeamMember): Promise<boolean> {
  requireCloudMaster();
  const list = await listMasterCategories();
  const before = list.find((i) => i.id === id);
  if (!before) return false;

  const { createClient } = await import("@/lib/supabase/client");
  const supabase = createClient();
  const { error } = await supabase.from("td_master_categories").delete().eq("id", id);
  if (error) throw new Error(error.message);

  logMasterDataChange({
    entityType: "category",
    entityId: id,
    action: "delete",
    summary: `Deleted category “${before.label}”`,
    before: { ...before },
    actor,
  });

  return true;
}
