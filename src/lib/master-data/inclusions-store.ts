import type { TeamMember } from "@/types/rbac";
import { useCloudMaster } from "@/lib/master-data/cloud";
import { logMasterDataChange } from "@/lib/master-data/audit";
import { ensureStoredImageUrls } from "@/lib/supabase/storage-upload";
import { OPTIONAL_INCLUSIONS } from "@/lib/itinerary-builder/defaults";
import {
  DEFAULT_EXCLUSION_ITEMS,
  DEFAULT_INCLUSION_ITEMS,
  stringsToContentBlocks,
  type ContentBlockItem,
} from "@/lib/itinerary-builder/policy-master";

/** Titles left unticked by default — staff can still add them from the master picker. */
const OPTIONAL_INCLUSION_TITLES = new Set(
  OPTIONAL_INCLUSIONS.map((o) => o.label.trim().toLowerCase())
);

function useSupabaseMaster(): boolean {
  return useCloudMaster();
}

export type InclusionExclusionKind = "inclusion" | "exclusion";

export type InclusionExclusionItem = {
  id: string;
  kind: InclusionExclusionKind;
  /** Display title (stored as `text` in the DB). */
  text: string;
  description: string;
  /** Optional image shown on itinerary inclusion / exclusion cards. */
  image_url: string | null;
  created_at: string;
  created_by_id?: string | null;
  created_by_name?: string | null;
};

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

function sortByCreatedAsc(items: InclusionExclusionItem[]): InclusionExclusionItem[] {
  return [...items].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
}

/** Inclusions/exclusions — Supabase only. No localStorage / dummy seed. */
export async function listInclusionExclusions(): Promise<InclusionExclusionItem[]> {
  if (!useSupabaseMaster()) {
    throw new Error(
      "Supabase is not configured. Inclusions require a live database (no browser storage)."
    );
  }
  const { createClient } = await import("@/lib/supabase/client");
  const supabase = createClient();
  const { data, error } = await supabase
    .from("td_master_inclusions_exclusions")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return sortByCreatedAsc((data ?? []).map((row) => mapRow(row as Record<string, unknown>)));
}

/** Master library → content blocks used on preview / public quotation. */
export function masterToContentBlocks(
  master: InclusionExclusionItem[],
  kind: InclusionExclusionKind
): ContentBlockItem[] {
  return master
    .filter((row) => row.kind === kind && row.text.trim())
    .map((row) => ({
      id: row.id,
      title: row.text.trim(),
      description: (row.description ?? "").trim(),
      images: row.image_url ? [row.image_url] : [],
    }));
}

/** Hardcoded demo blocks from policy-master (not Master Data). */
export function isHardcodedPolicyDefaults(
  items: ContentBlockItem[] | null | undefined,
  kind: InclusionExclusionKind
): boolean {
  if (!items?.length) return true;
  const defaults = kind === "inclusion" ? DEFAULT_INCLUSION_ITEMS : DEFAULT_EXCLUSION_ITEMS;
  if (items.length !== defaults.length) return false;
  const defaultTitles = new Set(defaults.map((d) => d.title.trim().toLowerCase()));
  return items.every((i) => defaultTitles.has(i.title.trim().toLowerCase()));
}

/** Fill missing description / images from Master Data by title match. */
export function enrichContentBlocksFromMaster(
  items: ContentBlockItem[],
  master: InclusionExclusionItem[],
  kind: InclusionExclusionKind
): ContentBlockItem[] {
  const byTitle = new Map<string, InclusionExclusionItem>();
  for (const row of master) {
    if (row.kind !== kind) continue;
    byTitle.set(row.text.trim().toLowerCase(), row);
  }
  return items.map((item) => {
    const hit = byTitle.get(item.title.trim().toLowerCase());
    if (!hit) return item;
    const description = item.description?.trim() || hit.description?.trim() || "";
    const images =
      item.images?.some(Boolean)
        ? item.images.filter(Boolean)
        : hit.image_url
          ? [hit.image_url]
          : [];
    return { ...item, description, images };
  });
}

/**
 * Resolve real inclusion/exclusion cards for display:
 * prefer itinerary items (enriched from master); if empty/hardcoded defaults, use Master Data.
 * Never invent demo/default rows when Master Data is empty.
 */
export function resolvePolicyContentBlocks(
  items: ContentBlockItem[] | null | undefined,
  lines: string[] | null | undefined,
  master: InclusionExclusionItem[],
  kind: InclusionExclusionKind
): ContentBlockItem[] {
  const masterBlocks = masterToContentBlocks(master, kind);
  const fromItems = (items ?? []).filter((i) => i.title.trim());
  if (fromItems.length > 0 && !isHardcodedPolicyDefaults(fromItems, kind)) {
    return enrichContentBlocksFromMaster(fromItems, master, kind);
  }
  const fromLines = (lines ?? []).map((t) => t.trim()).filter(Boolean);
  if (fromLines.length > 0 && !isHardcodedPolicyDefaults(stringsToContentBlocks(fromLines), kind)) {
    return enrichContentBlocksFromMaster(stringsToContentBlocks(fromLines), master, kind);
  }
  return masterBlocks;
}

/** Snapshot fields hydrated from Master Data (for new drafts / empty defaults). */
export function policyFieldsFromMaster(master: InclusionExclusionItem[]): {
  inclusion_items: ContentBlockItem[];
  exclusion_items: ContentBlockItem[];
  inclusions: string[];
  exclusions: string[];
} {
  // Pre-select every master inclusion except the fixed optional add-ons
  // (Ranthambhore safaris / Jaisalmer desert) — those stay available to tick.
  const inclusion_items = masterToContentBlocks(master, "inclusion").filter(
    (b) => !OPTIONAL_INCLUSION_TITLES.has(b.title.trim().toLowerCase())
  );
  const exclusion_items = masterToContentBlocks(master, "exclusion");
  return {
    inclusion_items,
    exclusion_items,
    inclusions: inclusion_items.map((i) => i.title),
    exclusions: exclusion_items.map((i) => i.title),
  };
}

export async function createInclusionExclusion(
  kind: InclusionExclusionKind,
  text: string,
  actor: TeamMember,
  imageUrl?: string | null,
  description?: string
): Promise<InclusionExclusionItem> {
  const folder = kind === "inclusion" ? "inclusions" : "exclusions";
  const resolvedImages = imageUrl
    ? await ensureStoredImageUrls([imageUrl], folder)
    : [];
  const item: InclusionExclusionItem = {
    id: crypto.randomUUID(),
    kind,
    text: text.trim(),
    description: (description ?? "").trim(),
    image_url: resolvedImages[0] ?? null,
    created_at: new Date().toISOString(),
    created_by_id: actor.id,
    created_by_name: actor.name,
  };

  if (!useSupabaseMaster()) {
    throw new Error(
      "Supabase is not configured. Inclusions require a live database (no browser storage)."
    );
  }
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
  if (error) throw new Error(error.message);

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
    patch.image_url !== undefined ? patch.image_url : before.image_url;
  const folder = kind === "inclusion" ? "inclusions" : "exclusions";
  const resolvedImages = nextImageRaw
    ? await ensureStoredImageUrls([nextImageRaw], folder)
    : [];
  const nextImage = resolvedImages[0] ?? null;
  const nextText = patch.text.trim();
  const nextDescription =
    patch.description !== undefined ? patch.description.trim() : before.description;

  if (!useSupabaseMaster()) {
    throw new Error(
      "Supabase is not configured. Inclusions require a live database (no browser storage)."
    );
  }
  const { createClient } = await import("@/lib/supabase/client");
  const supabase = createClient();
  const { data, error } = await supabase
    .from("td_master_inclusions_exclusions")
    .update({ text: nextText, description: nextDescription, image_url: nextImage })
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
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

export async function deleteInclusionExclusion(id: string, actor?: TeamMember): Promise<boolean> {
  const beforeList = await listInclusionExclusions();
  const before = beforeList.find((i) => i.id === id) ?? null;

  if (!useSupabaseMaster()) {
    throw new Error(
      "Supabase is not configured. Inclusions require a live database (no browser storage)."
    );
  }
  const { createClient } = await import("@/lib/supabase/client");
  const supabase = createClient();
  const { error } = await supabase.from("td_master_inclusions_exclusions").delete().eq("id", id);
  if (error) throw new Error(error.message);
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
