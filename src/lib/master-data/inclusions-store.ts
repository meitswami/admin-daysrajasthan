import type { TeamMember } from "@/types/rbac";
import { isSupabaseConfigured } from "@/lib/system/data-mode";
import { logMasterDataChange } from "@/lib/master-data/audit";

export type InclusionExclusionKind = "inclusion" | "exclusion";

export type InclusionExclusionItem = {
  id: string;
  kind: InclusionExclusionKind;
  text: string;
  created_at: string;
  created_by_id?: string | null;
  created_by_name?: string | null;
};

const STORAGE_KEY = "td-master-inclusions-exclusions-v1";

function seed(): InclusionExclusionItem[] {
  const now = new Date().toISOString();
  return [
    {
      id: crypto.randomUUID(),
      kind: "inclusion",
      text: "Accommodation as per plan",
      created_at: now,
      created_by_id: "tm-info",
      created_by_name: "Travel Days Admin",
    },
    {
      id: crypto.randomUUID(),
      kind: "inclusion",
      text: "Private AC vehicle for sightseeing",
      created_at: now,
      created_by_id: "tm-info",
      created_by_name: "Travel Days Admin",
    },
    {
      id: crypto.randomUUID(),
      kind: "exclusion",
      text: "Air fare / train fare",
      created_at: now,
      created_by_id: "tm-info",
      created_by_name: "Travel Days Admin",
    },
    {
      id: crypto.randomUUID(),
      kind: "exclusion",
      text: "Personal expenses",
      created_at: now,
      created_by_id: "tm-info",
      created_by_name: "Travel Days Admin",
    },
  ];
}

function readLocal(): InclusionExclusionItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const s = seed();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
      return s;
    }
    return JSON.parse(raw) as InclusionExclusionItem[];
  } catch {
    return seed();
  }
}

function writeLocal(items: InclusionExclusionItem[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export async function listInclusionExclusions(): Promise<InclusionExclusionItem[]> {
  if (isSupabaseConfigured()) {
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { data, error } = await supabase
        .from("td_master_inclusions_exclusions")
        .select("*")
        .order("created_at", { ascending: false });
      if (!error && data) {
        return data.map((row) => ({
          id: String(row.id),
          kind: row.kind as InclusionExclusionKind,
          text: String(row.text ?? ""),
          created_at: String(row.created_at),
          created_by_id: (row.created_by as string | null) ?? null,
          created_by_name: (row.created_by_name as string | null) ?? null,
        }));
      }
    } catch {
      // fall through
    }
  }
  return readLocal();
}

export async function createInclusionExclusion(
  kind: InclusionExclusionKind,
  text: string,
  actor: TeamMember
): Promise<InclusionExclusionItem> {
  const item: InclusionExclusionItem = {
    id: crypto.randomUUID(),
    kind,
    text: text.trim(),
    created_at: new Date().toISOString(),
    created_by_id: actor.id,
    created_by_name: actor.name,
  };

  let persisted = false;
  if (isSupabaseConfigured()) {
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { error } = await supabase.from("td_master_inclusions_exclusions").insert({
        id: item.id,
        kind: item.kind,
        text: item.text,
        created_by: actor.id,
        created_by_name: actor.name,
      });
      if (!error) persisted = true;
    } catch {
      // fall through
    }
  }

  if (!persisted) {
    const list = readLocal();
    list.unshift(item);
    writeLocal(list);
  }

  logMasterDataChange({
    entityType: "inclusion_exclusion",
    entityId: item.id,
    action: "create",
    summary: `Created ${kind} “${item.text}”`,
    after: { ...item },
    actor,
  });

  return item;
}

export async function updateInclusionExclusion(
  id: string,
  text: string,
  actor?: TeamMember
): Promise<InclusionExclusionItem | null> {
  const beforeList = await listInclusionExclusions();
  const before = beforeList.find((i) => i.id === id) ?? null;

  if (isSupabaseConfigured()) {
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { data, error } = await supabase
        .from("td_master_inclusions_exclusions")
        .update({ text: text.trim() })
        .eq("id", id)
        .select("*")
        .maybeSingle();
      if (!error && data) {
        const after = {
          id: String(data.id),
          kind: data.kind as InclusionExclusionKind,
          text: String(data.text),
          created_at: String(data.created_at),
          created_by_id: (data.created_by as string | null) ?? null,
          created_by_name: (data.created_by_name as string | null) ?? null,
        };
        logMasterDataChange({
          entityType: "inclusion_exclusion",
          entityId: id,
          action: "update",
          summary: `Updated ${after.kind} “${after.text}”`,
          before: before ? { ...before } : null,
          after: { ...after },
          actor,
        });
        return after;
      }
    } catch {
      // fall through
    }
  }

  const list = readLocal();
  const idx = list.findIndex((i) => i.id === id);
  if (idx < 0) return null;
  list[idx] = { ...list[idx], text: text.trim() };
  writeLocal(list);
  logMasterDataChange({
    entityType: "inclusion_exclusion",
    entityId: id,
    action: "update",
    summary: `Updated ${list[idx].kind} “${list[idx].text}”`,
    before: before ? { ...before } : null,
    after: { ...list[idx] },
    actor,
  });
  return list[idx];
}

export async function deleteInclusionExclusion(id: string, actor?: TeamMember): Promise<boolean> {
  const beforeList = await listInclusionExclusions();
  const before = beforeList.find((i) => i.id === id) ?? null;

  if (isSupabaseConfigured()) {
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { error } = await supabase.from("td_master_inclusions_exclusions").delete().eq("id", id);
      if (!error) {
        logMasterDataChange({
          entityType: "inclusion_exclusion",
          entityId: id,
          action: "delete",
          summary: `Deleted ${before?.kind ?? "item"} “${before?.text ?? id}”`,
          before: before ? { ...before } : null,
          actor,
        });
        return true;
      }
    } catch {
      // fall through
    }
  }
  writeLocal(readLocal().filter((i) => i.id !== id));
  logMasterDataChange({
    entityType: "inclusion_exclusion",
    entityId: id,
    action: "delete",
    summary: `Deleted ${before?.kind ?? "item"} “${before?.text ?? id}”`,
    before: before ? { ...before } : null,
    actor,
  });
  return true;
}
