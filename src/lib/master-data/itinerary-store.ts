import type { Itinerary, PackageType } from "@/types/database";
import type { TeamMember } from "@/types/rbac";
import { isRealDataMode, isSupabaseConfigured } from "@/lib/system/data-mode";
import { logMasterDataChange } from "@/lib/master-data/audit";

function useSupabaseMaster(): boolean {
  return isSupabaseConfigured() && isRealDataMode();
}

const STORAGE_KEY = "td-master-itineraries-v1";

function seed(): Itinerary[] {
  const now = new Date().toISOString();
  return [
    {
      id: crypto.randomUUID(),
      package_name: "Jaipur Heritage 3N/4D",
      destination: "Jaipur",
      slug: "jaipur-heritage-3n4d",
      pdf_url: null,
      cover_image_url: null,
      package_type: "Domestic",
      package_duration: "4 Days 3 Nights",
      show_on_website: true,
      is_trending: false,
      display_mode: "grid",
      status: "active",
      download_count: 0,
      created_at: now,
      updated_at: now,
      inclusions: ["Hotel stay with breakfast", "Private AC cab for sightseeing"],
      exclusions: ["Airfare / train fare", "Personal expenses"],
      gallery_urls: [],
      created_by_id: "tm-info",
      created_by_name: "Travel Days Admin",
    },
  ];
}

function readLocal(): Itinerary[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const s = seed();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
      return s;
    }
    return JSON.parse(raw) as Itinerary[];
  } catch {
    return seed();
  }
}

function writeLocal(items: Itinerary[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function mapRow(row: Record<string, unknown>): Itinerary {
  return {
    id: String(row.id),
    package_name: String(row.package_name ?? ""),
    destination: (row.destination as string | null) ?? null,
    slug: (row.slug as string | null) ?? null,
    pdf_url: (row.pdf_url as string | null) ?? null,
    cover_image_url: (row.cover_image_url as string | null) ?? null,
    package_type: (row.package_type as PackageType | null) ?? null,
    package_duration: (row.package_duration as string | null) ?? null,
    show_on_website: Boolean(row.show_on_website ?? true),
    is_trending: Boolean(row.is_trending),
    display_mode: (row.display_mode as "grid" | "list") ?? "grid",
    status: (row.status as "active" | "inactive") ?? "active",
    download_count: Number(row.download_count ?? 0),
    created_at: String(row.created_at ?? new Date().toISOString()),
    updated_at: String(row.updated_at ?? new Date().toISOString()),
    inclusions: Array.isArray(row.inclusions) ? (row.inclusions as string[]) : [],
    exclusions: Array.isArray(row.exclusions) ? (row.exclusions as string[]) : [],
    gallery_urls: Array.isArray(row.gallery_urls) ? (row.gallery_urls as string[]) : [],
    created_by_id: (row.created_by as string | null) ?? null,
    created_by_name: (row.created_by_name as string | null) ?? null,
  };
}

export type MasterItineraryInput = {
  package_name: string;
  destination?: string | null;
  package_type?: PackageType | null;
  package_duration?: string | null;
  pdf_url?: string | null;
  cover_image_url?: string | null;
  show_on_website?: boolean;
  is_trending?: boolean;
  display_mode?: "grid" | "list";
  status?: "active" | "inactive";
  inclusions?: string[];
  exclusions?: string[];
  gallery_urls?: string[];
};

export async function listMasterItineraries(): Promise<Itinerary[]> {
  if (useSupabaseMaster()) {
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { data, error } = await supabase
        .from("itineraries")
        .select("*")
        .order("created_at", { ascending: false });
      if (!error && data) return data.map((r) => mapRow(r as Record<string, unknown>));
    } catch {
      // fall through
    }
  }
  return readLocal();
}

export async function createMasterItinerary(
  input: MasterItineraryInput,
  actor: TeamMember
): Promise<Itinerary> {
  const now = new Date().toISOString();
  const slug = input.package_name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  const item: Itinerary = {
    id: crypto.randomUUID(),
    package_name: input.package_name.trim(),
    destination: input.destination?.trim() || null,
    slug,
    pdf_url: input.pdf_url || null,
    cover_image_url: input.cover_image_url || null,
    package_type: input.package_type ?? "Domestic",
    package_duration: input.package_duration ?? "3 Days 2 Nights",
    show_on_website: input.show_on_website ?? true,
    is_trending: input.is_trending ?? false,
    display_mode: input.display_mode ?? "grid",
    status: input.status ?? "active",
    download_count: 0,
    created_at: now,
    updated_at: now,
    inclusions: input.inclusions ?? [],
    exclusions: input.exclusions ?? [],
    gallery_urls: input.gallery_urls ?? [],
    created_by_id: actor.id,
    created_by_name: actor.name,
  };

  let persisted = false;
  if (useSupabaseMaster()) {
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { error } = await supabase.from("itineraries").insert({
        id: item.id,
        package_name: item.package_name,
        destination: item.destination,
        slug: item.slug,
        pdf_url: item.pdf_url,
        cover_image_url: item.cover_image_url,
        package_type: item.package_type,
        package_duration: item.package_duration,
        show_on_website: item.show_on_website,
        is_trending: item.is_trending,
        display_mode: item.display_mode,
        status: item.status,
        inclusions: item.inclusions,
        exclusions: item.exclusions,
        gallery_urls: item.gallery_urls,
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
    entityType: "itinerary",
    entityId: item.id,
    action: "create",
    summary: `Created package “${item.package_name}”`,
    after: { ...item },
    actor,
  });

  return item;
}

export async function updateMasterItinerary(
  id: string,
  patch: Partial<MasterItineraryInput>,
  actor?: TeamMember
): Promise<Itinerary | null> {
  const now = new Date().toISOString();
  const all = await listMasterItineraries();
  const before = all.find((i) => i.id === id) ?? null;

  if (useSupabaseMaster()) {
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const payload: Record<string, unknown> = { updated_at: now };
      for (const [k, v] of Object.entries(patch)) {
        if (v !== undefined) payload[k] = v;
      }
      if (typeof patch.package_name === "string") {
        payload.slug = patch.package_name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "");
      }
      const { data, error } = await supabase
        .from("itineraries")
        .update(payload)
        .eq("id", id)
        .select("*")
        .maybeSingle();
      if (!error && data) {
        const after = mapRow(data as Record<string, unknown>);
        logMasterDataChange({
          entityType: "itinerary",
          entityId: id,
          action: "update",
          summary: `Updated package “${after.package_name}”`,
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
  list[idx] = { ...list[idx], ...patch, updated_at: now };
  writeLocal(list);
  logMasterDataChange({
    entityType: "itinerary",
    entityId: id,
    action: "update",
    summary: `Updated package “${list[idx].package_name}”`,
    before: before ? { ...before } : null,
    after: { ...list[idx] },
    actor,
  });
  return list[idx];
}

export async function deleteMasterItinerary(id: string, actor?: TeamMember): Promise<boolean> {
  const all = await listMasterItineraries();
  const before = all.find((i) => i.id === id) ?? null;

  if (useSupabaseMaster()) {
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { error } = await supabase.from("itineraries").delete().eq("id", id);
      if (!error) {
        logMasterDataChange({
          entityType: "itinerary",
          entityId: id,
          action: "delete",
          summary: `Deleted package “${before?.package_name ?? id}”`,
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
    entityType: "itinerary",
    entityId: id,
    action: "delete",
    summary: `Deleted package “${before?.package_name ?? id}”`,
    before: before ? { ...before } : null,
    actor,
  });
  return true;
}
