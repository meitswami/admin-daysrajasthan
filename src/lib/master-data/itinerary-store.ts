import type { Itinerary, ItineraryDayPlan, PackageType } from "@/types/database";
import type { TeamMember } from "@/types/rbac";
import { isRealDataMode, isSupabaseConfigured } from "@/lib/system/data-mode";
import { logMasterDataChange } from "@/lib/master-data/audit";
import { ensureStoredImageUrls } from "@/lib/supabase/storage-upload";

function useSupabaseMaster(): boolean {
  return isSupabaseConfigured() && isRealDataMode();
}

const STORAGE_KEY = "td-master-itineraries-v1";

function parseStringList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((u): u is string => typeof u === "string" && Boolean(u.trim()));
}

function parseDays(raw: unknown): ItineraryDayPlan[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((entry, index) => {
    const row = (entry ?? {}) as Record<string, unknown>;
    const images = Array.isArray(row.image_urls)
      ? row.image_urls.filter((u): u is string => typeof u === "string" && Boolean(u))
      : [];
    const alternateTitles = parseStringList(row.alternate_titles);
    const locations = parseStringList(row.locations);
    return {
      day_number: Number(row.day_number ?? index + 1),
      title: String(row.title ?? ""),
      alternate_titles: alternateTitles,
      location: String(row.location ?? ""),
      locations,
      description: String(row.description ?? ""),
      image_urls: images,
    };
  });
}

function seed(): Itinerary[] {
  const now = new Date().toISOString();
  return [
    {
      id: crypto.randomUUID(),
      package_name: "Jaipur Heritage 3N/4D",
      alternate_titles: [],
      tour_code: "DR001",
      destination: "Jaipur",
      slug: "dr001-jaipur-heritage-3n4d",
      pdf_url: null,
      cover_image_url: null,
      package_type: "Domestic",
      package_duration: "4 Days 3 Nights",
      show_on_website: true,
      is_trending: false,
      display_mode: "list",
      status: "active",
      download_count: 0,
      created_at: now,
      updated_at: now,
      inclusions: ["Hotel stay with breakfast", "Private AC cab for sightseeing"],
      exclusions: ["Airfare / train fare", "Personal expenses"],
      gallery_urls: [],
      days: [
        {
          day_number: 1,
          title: "Arrival in Jaipur",
          alternate_titles: [],
          location: "Jaipur",
          locations: [],
          description: "Airport pickup and check-in.",
          image_urls: [],
        },
      ],
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
    alternate_titles: parseStringList(row.alternate_titles),
    tour_code: (row.tour_code as string | null) ?? null,
    destination: (row.destination as string | null) ?? null,
    slug: (row.slug as string | null) ?? null,
    pdf_url: (row.pdf_url as string | null) ?? null,
    cover_image_url: (row.cover_image_url as string | null) ?? null,
    package_type: (row.package_type as PackageType | null) ?? null,
    package_duration: (row.package_duration as string | null) ?? null,
    show_on_website: Boolean(row.show_on_website ?? true),
    is_trending: Boolean(row.is_trending),
    display_mode: (row.display_mode as "grid" | "list") ?? "list",
    status: (row.status as "active" | "inactive") ?? "active",
    download_count: Number(row.download_count ?? 0),
    created_at: String(row.created_at ?? new Date().toISOString()),
    updated_at: String(row.updated_at ?? new Date().toISOString()),
    inclusions: Array.isArray(row.inclusions) ? (row.inclusions as string[]) : [],
    exclusions: Array.isArray(row.exclusions) ? (row.exclusions as string[]) : [],
    gallery_urls: Array.isArray(row.gallery_urls) ? (row.gallery_urls as string[]) : [],
    days: parseDays(row.days),
    created_by_id: (row.created_by as string | null) ?? null,
    created_by_name: (row.created_by_name as string | null) ?? null,
  };
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function buildSlug(tourCode: string | null | undefined, packageName: string): string {
  const code = (tourCode ?? "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
  const name = slugify(packageName);
  if (code && name) return `${code}-${name}`.slice(0, 120);
  if (code) return code;
  return name || crypto.randomUUID();
}

async function persistDayImages(days: ItineraryDayPlan[]): Promise<ItineraryDayPlan[]> {
  const next: ItineraryDayPlan[] = [];
  for (const day of days) {
    next.push({
      ...day,
      image_urls: await ensureStoredImageUrls(day.image_urls ?? [], "itineraries"),
    });
  }
  return next;
}

export type MasterItineraryInput = {
  package_name: string;
  alternate_titles?: string[];
  tour_code?: string | null;
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
  days?: ItineraryDayPlan[];
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
  const gallery = await ensureStoredImageUrls(input.gallery_urls ?? [], "itineraries");
  const days = await persistDayImages(input.days ?? []);
  const cover = input.cover_image_url || gallery[0] || days.find((d) => d.image_urls[0])?.image_urls[0] || null;
  const tourCode = input.tour_code?.trim().toUpperCase() || null;
  const item: Itinerary = {
    id: crypto.randomUUID(),
    package_name: input.package_name.trim(),
    alternate_titles: (input.alternate_titles ?? []).map((t) => t.trim()).filter(Boolean),
    tour_code: tourCode,
    destination: input.destination?.trim() || null,
    slug: buildSlug(tourCode, input.package_name),
    pdf_url: input.pdf_url || null,
    cover_image_url: cover,
    package_type: input.package_type ?? "Domestic",
    package_duration: input.package_duration ?? "3 Days 2 Nights",
    show_on_website: input.show_on_website ?? true,
    is_trending: input.is_trending ?? false,
    display_mode: input.display_mode ?? "list",
    status: input.status ?? "active",
    download_count: 0,
    created_at: now,
    updated_at: now,
    inclusions: input.inclusions ?? [],
    exclusions: input.exclusions ?? [],
    gallery_urls: gallery,
    days,
    created_by_id: actor.id,
    created_by_name: actor.name,
  };

  let persisted = false;
  let lastError: string | null = null;
  if (useSupabaseMaster()) {
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { error } = await supabase.from("itineraries").insert({
        id: item.id,
        package_name: item.package_name,
        alternate_titles: item.alternate_titles ?? [],
        tour_code: item.tour_code,
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
        days: item.days,
        created_by: actor.id,
        created_by_name: actor.name,
      });
      if (!error) persisted = true;
      else lastError = error.message;
    } catch (err) {
      lastError = err instanceof Error ? err.message : "Failed to save itinerary";
    }
  }

  if (!persisted) {
    if (useSupabaseMaster() && lastError) {
      throw new Error(lastError);
    }
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

  const nextPatch: Record<string, unknown> = { ...patch, updated_at: now };
  if (patch.gallery_urls) {
    nextPatch.gallery_urls = await ensureStoredImageUrls(patch.gallery_urls, "itineraries");
  }
  if (patch.days) {
    nextPatch.days = await persistDayImages(patch.days);
  }
  if (patch.tour_code !== undefined) {
    nextPatch.tour_code = patch.tour_code?.trim().toUpperCase() || null;
  }
  if (typeof patch.package_name === "string" || patch.tour_code !== undefined) {
    const name = typeof patch.package_name === "string" ? patch.package_name : before?.package_name ?? "";
    const code =
      patch.tour_code !== undefined
        ? (patch.tour_code?.trim().toUpperCase() || null)
        : before?.tour_code ?? null;
    nextPatch.slug = buildSlug(code, name);
  }
  if (patch.cover_image_url === undefined && Array.isArray(nextPatch.gallery_urls)) {
    const gallery = nextPatch.gallery_urls as string[];
    nextPatch.cover_image_url = gallery[0] ?? null;
  }
  if (
    !nextPatch.cover_image_url &&
    Array.isArray(nextPatch.days) &&
    (nextPatch.days as ItineraryDayPlan[]).length
  ) {
    const firstDayImage = (nextPatch.days as ItineraryDayPlan[]).find((d) => d.image_urls?.[0])
      ?.image_urls?.[0];
    if (firstDayImage) nextPatch.cover_image_url = firstDayImage;
  }

  if (useSupabaseMaster()) {
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { data, error } = await supabase
        .from("itineraries")
        .update(nextPatch)
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
      if (error) throw new Error(error.message);
    } catch (err) {
      if (useSupabaseMaster()) {
        throw err instanceof Error ? err : new Error("Failed to update itinerary");
      }
    }
  }

  const list = readLocal();
  const idx = list.findIndex((i) => i.id === id);
  if (idx < 0) return null;
  list[idx] = { ...list[idx], ...nextPatch, updated_at: now } as Itinerary;
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
