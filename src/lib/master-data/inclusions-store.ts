import type { TeamMember } from "@/types/rbac";
import { isRealDataMode, isSupabaseConfigured } from "@/lib/system/data-mode";
import { logMasterDataChange } from "@/lib/master-data/audit";
import { ensureStoredImageUrls } from "@/lib/supabase/storage-upload";

function useSupabaseMaster(): boolean {
  return isSupabaseConfigured() && isRealDataMode();
}

export type InclusionExclusionKind = "inclusion" | "exclusion";

export type InclusionExclusionItem = {
  id: string;
  kind: InclusionExclusionKind;
  /** Display title (stored as `text` in the DB). */
  text: string;
  description: string;
  /** Optional image — used for inclusions; exclusions usually leave this null. */
  image_url: string | null;
  created_at: string;
  created_by_id?: string | null;
  created_by_name?: string | null;
};

const STORAGE_KEY = "td-master-inclusions-exclusions-v1";

function mapRow(row: Record<string, unknown>): InclusionExclusionItem {
  return {
    id: String(row.id),
    kind: row.kind as InclusionExclusionKind,
    text: String(row.text ?? ""),
    description: String(row.description ?? ""),
    image_url: (row.image_url as string | null) ?? null,
    created_at: String(row.created_at ?? new Date().toISOString()),
    created_by_id: (row.created_by as string | null) ?? null,
    created_by_name: (row.created_by_name as string | null) ?? null,
  };
}

function seed(): InclusionExclusionItem[] {
  const now = new Date().toISOString();
  return [
    {
      id: crypto.randomUUID(),
      kind: "inclusion",
      text: "Accommodation as per plan",
      description: "",
      image_url: null,
      created_at: now,
      created_by_id: "tm-info",
      created_by_name: "Travel Days Admin",
    },
    {
      id: crypto.randomUUID(),
      kind: "inclusion",
      text: "Private AC vehicle for sightseeing",
      description: "",
      image_url: null,
      created_at: now,
      created_by_id: "tm-info",
      created_by_name: "Travel Days Admin",
    },
    {
      id: crypto.randomUUID(),
      kind: "exclusion",
      text: "Air fare / train fare",
      description: "",
      image_url: null,
      created_at: now,
      created_by_id: "tm-info",
      created_by_name: "Travel Days Admin",
    },
    {
      id: crypto.randomUUID(),
      kind: "exclusion",
      text: "Personal expenses",
      description: "",
      image_url: null,
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
    const parsed = JSON.parse(raw) as InclusionExclusionItem[];
    return parsed.map((item) => ({
      ...item,
      description: item.description ?? "",
      image_url: item.image_url ?? null,
    }));
  } catch {
    return seed();
  }
}

function writeLocal(items: InclusionExclusionItem[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export async function listInclusionExclusions(): Promise<InclusionExclusionItem[]> {
  if (useSupabaseMaster()) {
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { data, error } = await supabase
        .from("td_master_inclusions_exclusions")
        .select("*")
        .order("created_at", { ascending: false });
      if (!error && data) {
        return data.map((row) => mapRow(row as Record<string, unknown>));
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
  actor: TeamMember,
  imageUrl?: string | null,
  description?: string
): Promise<InclusionExclusionItem> {
  const resolvedImages =
    kind === "inclusion" && imageUrl
      ? await ensureStoredImageUrls([imageUrl], "inclusions")
      : [];
  const item: InclusionExclusionItem = {
    id: crypto.randomUUID(),
    kind,
    text: text.trim(),
    description: (description ?? "").trim(),
    image_url: kind === "inclusion" ? resolvedImages[0] ?? null : null,
    created_at: new Date().toISOString(),
    created_by_id: actor.id,
    created_by_name: actor.name,
  };

  let persisted = false;
  if (useSupabaseMaster()) {
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { error } = await supabase.from("td_master_inclusions_exclusions").insert({
        id: item.id,
        kind: item.kind,
        text: item.text,
        description: item.description,
        image_url: item.image_url,
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
  patch: {
    text: string;
    description?: string;
    image_url?: string | null;
    kind?: InclusionExclusionKind;
  },
  actor?: TeamMember
): Promise<InclusionExclusionItem | null> {
  const beforeList = await listInclusionExclusions();
  const before = beforeList.find((i) => i.id === id) ?? null;
  if (!before) return null;

  const kind = patch.kind ?? before.kind;
  const nextImageRaw =
    kind === "inclusion"
      ? patch.image_url !== undefined
        ? patch.image_url
        : before.image_url
      : null;
  const resolvedImages =
    kind === "inclusion" && nextImageRaw
      ? await ensureStoredImageUrls([nextImageRaw], "inclusions")
      : [];
  const nextImage = kind === "inclusion" ? resolvedImages[0] ?? null : null;
  const nextText = patch.text.trim();
  const nextDescription =
    patch.description !== undefined ? patch.description.trim() : before.description;

  if (useSupabaseMaster()) {
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { data, error } = await supabase
        .from("td_master_inclusions_exclusions")
        .update({ text: nextText, description: nextDescription, image_url: nextImage })
        .eq("id", id)
        .select("*")
        .maybeSingle();
      if (!error && data) {
        const after = mapRow(data as Record<string, unknown>);
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
  list[idx] = {
    ...list[idx],
    text: nextText,
    description: nextDescription,
    image_url: nextImage,
  };
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

  if (useSupabaseMaster()) {
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
