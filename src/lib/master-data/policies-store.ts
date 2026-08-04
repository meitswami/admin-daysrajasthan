import type { TeamMember } from "@/types/rbac";
import { requireCloudMaster, useCloudMaster } from "@/lib/master-data/cloud";
import { logMasterDataChange } from "@/lib/master-data/audit";

export type PolicySectionKey = "terms" | "cancellation" | "payment";

export type MasterPolicyLine = {
  id: string;
  section: PolicySectionKey;
  title: string;
  created_at: string;
  created_by_id?: string | null;
  created_by_name?: string | null;
};

function mapRow(row: Record<string, unknown>): MasterPolicyLine {
  return {
    id: String(row.id),
    section: row.section as PolicySectionKey,
    title: String(row.title ?? ""),
    created_at: String(row.created_at ?? new Date().toISOString()),
    created_by_id: (row.created_by as string | null) ?? null,
    created_by_name: (row.created_by_name as string | null) ?? null,
  };
}

function toRow(item: MasterPolicyLine) {
  return {
    id: item.id,
    section: item.section,
    title: item.title,
    created_at: item.created_at,
    created_by: item.created_by_id,
    created_by_name: item.created_by_name,
  };
}

async function fetchRemote(): Promise<MasterPolicyLine[]> {
  requireCloudMaster();
  const { createClient } = await import("@/lib/supabase/client");
  const supabase = createClient();
  const { data, error } = await supabase
    .from("td_master_policies")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapRow(row as Record<string, unknown>));
}

/**
 * Master policies — Supabase only when configured.
 * Never seeds dummy rows, never reads/writes localStorage or cookies.
 */
export async function listMasterPolicies(): Promise<MasterPolicyLine[]> {
  if (!useCloudMaster()) {
    throw new Error(
      "Supabase is not configured. Policies require a live database (no browser storage)."
    );
  }
  return fetchRemote();
}

export function policiesForSection(
  items: MasterPolicyLine[],
  section: PolicySectionKey
): { id: string; title: string; description: string }[] {
  return items
    .filter((i) => i.section === section && i.title.trim())
    .map((i) => ({ id: i.id, title: i.title, description: "" }));
}

export async function createMasterPolicy(
  section: PolicySectionKey,
  title: string,
  actor: TeamMember
): Promise<MasterPolicyLine> {
  requireCloudMaster();
  const item: MasterPolicyLine = {
    id: crypto.randomUUID(),
    section,
    title: title.trim(),
    created_at: new Date().toISOString(),
    created_by_id: actor.id,
    created_by_name: actor.name,
  };

  const { createClient } = await import("@/lib/supabase/client");
  const supabase = createClient();
  const { error } = await supabase.from("td_master_policies").insert(toRow(item));
  if (error) {
    if (error.code === "23505" || /duplicate|unique/i.test(error.message)) {
      throw new Error("A policy with this text already exists in this section.");
    }
    throw new Error(error.message);
  }

  logMasterDataChange({
    entityType: "policy",
    entityId: item.id,
    action: "create",
    summary: `Created ${section} policy “${item.title.slice(0, 80)}”`,
    after: { ...item },
    actor,
  });

  return item;
}

export async function updateMasterPolicy(
  id: string,
  title: string,
  actor?: TeamMember
): Promise<MasterPolicyLine | null> {
  requireCloudMaster();
  const beforeList = await listMasterPolicies();
  const before = beforeList.find((i) => i.id === id);
  if (!before) return null;
  const next: MasterPolicyLine = { ...before, title: title.trim() };

  const { createClient } = await import("@/lib/supabase/client");
  const supabase = createClient();
  const { error } = await supabase
    .from("td_master_policies")
    .update({ title: next.title })
    .eq("id", id);
  if (error) {
    if (error.code === "23505" || /duplicate|unique/i.test(error.message)) {
      throw new Error("A policy with this text already exists in this section.");
    }
    throw new Error(error.message);
  }

  logMasterDataChange({
    entityType: "policy",
    entityId: id,
    action: "update",
    summary: `Updated ${next.section} policy “${next.title.slice(0, 80)}”`,
    before: { ...before },
    after: { ...next },
    actor,
  });

  return next;
}

export async function deleteMasterPolicy(id: string, actor?: TeamMember): Promise<boolean> {
  requireCloudMaster();
  const beforeList = await listMasterPolicies();
  const before = beforeList.find((i) => i.id === id);
  if (!before) return false;

  const { createClient } = await import("@/lib/supabase/client");
  const supabase = createClient();
  const { error } = await supabase.from("td_master_policies").delete().eq("id", id);
  if (error) throw new Error(error.message);

  logMasterDataChange({
    entityType: "policy",
    entityId: id,
    action: "delete",
    summary: `Deleted ${before.section} policy “${before.title.slice(0, 80)}”`,
    before: { ...before },
    actor,
  });

  return true;
}
