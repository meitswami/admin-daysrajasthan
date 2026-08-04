import type { TeamMember } from "@/types/rbac";
import {
  MASTER_CANCELLATION,
  MASTER_PAYMENT,
  MASTER_TERMS,
} from "@/lib/itinerary-builder/policy-master";
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

const STORAGE_KEY = "td-master-policies-v1";

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

function seed(): MasterPolicyLine[] {
  const now = new Date().toISOString();
  const map = (
    section: PolicySectionKey,
    lines: { id: string; title: string }[]
  ): MasterPolicyLine[] =>
    lines.map((l) => ({
      id: crypto.randomUUID(),
      section,
      title: l.title,
      created_at: now,
      created_by_id: "tm-info",
      created_by_name: "Travel Days Admin",
    }));
  return [
    ...map("terms", MASTER_TERMS),
    ...map("cancellation", MASTER_CANCELLATION),
    ...map("payment", MASTER_PAYMENT),
  ];
}

function readLocalRaw(): MasterPolicyLine[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as MasterPolicyLine[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalCache(items: MasterPolicyLine[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
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

function policyKey(section: string, title: string): string {
  return `${section}::${title.trim().toLowerCase()}`;
}

/** Upload browser-local rows that are not already in the cloud (by id OR section+title). */
async function uploadMissingLocal(remote: MasterPolicyLine[]): Promise<MasterPolicyLine[]> {
  const local = readLocalRaw();
  if (!local.length) return remote;
  const remoteIds = new Set(remote.map((r) => r.id));
  const remoteKeys = new Set(remote.map((r) => policyKey(r.section, r.title)));
  const missing = local.filter(
    (l) =>
      l.title.trim() &&
      !remoteIds.has(l.id) &&
      !remoteKeys.has(policyKey(l.section, l.title))
  );
  if (!missing.length) return remote;

  const { createClient } = await import("@/lib/supabase/client");
  const supabase = createClient();
  const { error } = await supabase
    .from("td_master_policies")
    .upsert(missing.map(toRow), { onConflict: "id" });
  if (error) throw new Error(`Failed to migrate policies to cloud: ${error.message}`);
  return fetchRemote();
}

export async function listMasterPolicies(): Promise<MasterPolicyLine[]> {
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
      const { error } = await supabase.from("td_master_policies").insert(seeded.map(toRow));
      if (error) throw new Error(error.message);
      remote = seeded;
    }
  } else {
    // Only migrate truly new local drafts — never re-upload seed clones with new UUIDs
    remote = await uploadMissingLocal(remote);
  }

  writeLocalCache(remote);
  return remote;
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
  if (error) throw new Error(error.message);

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
