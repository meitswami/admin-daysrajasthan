import type { TeamMember } from "@/types/rbac";
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

/** Categories — Supabase only. No seed insert, no localStorage. */
export async function listMasterCategories(): Promise<MasterCategory[]> {
  if (!useCloudMaster()) {
    throw new Error(
      "Supabase is not configured. Categories require a live database (no browser storage)."
    );
  }
  return fetchRemote();
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
