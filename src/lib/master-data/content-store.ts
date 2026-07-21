import type { DisplayMode, WebsiteContentItem } from "@/types/database";
import type { TeamMember } from "@/types/rbac";
import {
  destinations as seedDestinations,
  hotels as seedHotels,
  vehicles as seedVehicles,
} from "@/lib/data/website-content";
import { isRealDataMode, isSupabaseConfigured } from "@/lib/system/data-mode";
import { logMasterDataChange } from "@/lib/master-data/audit";

/** Real mode + configured env → Supabase. Dummy → local mock/seed. */
function useSupabaseMaster(): boolean {
  return isSupabaseConfigured() && isRealDataMode();
}

export type MasterContentEntity = "destinations" | "hotels" | "vehicles";

const STORAGE_PREFIX = "td-master-content-v1:";

const SEEDS: Record<MasterContentEntity, WebsiteContentItem[]> = {
  destinations: seedDestinations.map((d) => ({
    ...d,
    country: d.country ?? "India",
    created_by_id: "tm-info",
    created_by_name: "Travel Days Admin",
  })),
  hotels: seedHotels.map((h) => ({
    ...h,
    country: h.country ?? "India",
    created_by_id: "tm-info",
    created_by_name: "Travel Days Admin",
  })),
  vehicles: seedVehicles.map((v) => ({
    ...v,
    created_by_id: "tm-info",
    created_by_name: "Travel Days Admin",
  })),
};

const TABLE_MAP: Record<MasterContentEntity, string> = {
  destinations: "website_destinations",
  hotels: "website_hotels",
  vehicles: "website_vehicles",
};

function storageKey(entity: MasterContentEntity) {
  return `${STORAGE_PREFIX}${entity}`;
}

function readLocal(entity: MasterContentEntity): WebsiteContentItem[] {
  if (typeof window === "undefined") return [...SEEDS[entity]];
  try {
    const raw = localStorage.getItem(storageKey(entity));
    if (!raw) {
      localStorage.setItem(storageKey(entity), JSON.stringify(SEEDS[entity]));
      return [...SEEDS[entity]];
    }
    return JSON.parse(raw) as WebsiteContentItem[];
  } catch {
    return [...SEEDS[entity]];
  }
}

function writeLocal(entity: MasterContentEntity, items: WebsiteContentItem[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(storageKey(entity), JSON.stringify(items));
}

function parseGallery(row: Record<string, unknown>): string[] {
  const raw = row.gallery_urls;
  if (Array.isArray(raw)) return raw.filter((u): u is string => typeof u === "string" && Boolean(u));
  return [];
}

function mapRow(entity: MasterContentEntity, row: Record<string, unknown>): WebsiteContentItem {
  const gallery = parseGallery(row);
  const imageUrl = (row.image_url as string | null) ?? gallery[0] ?? null;
  return {
    id: String(row.id),
    name: String(row.name ?? ""),
    subtitle: (row.subtitle as string | null) ?? null,
    image_url: imageUrl,
    gallery_urls: gallery.length
      ? gallery
      : imageUrl
        ? [imageUrl]
        : [],
    show_on_website: Boolean(row.show_on_website ?? true),
    is_trending: entity === "destinations" ? Boolean(row.is_trending) : undefined,
    display_mode: ((row.display_mode as DisplayMode) ?? "list") as DisplayMode,
    country: (row.country as string | null) ?? "India",
    google_maps_url:
      entity === "hotels" ? ((row.google_maps_url as string | null) ?? null) : undefined,
    vehicle_type:
      entity === "vehicles" ? ((row.vehicle_type as string | null) ?? null) : undefined,
    capacity: entity === "vehicles" ? ((row.capacity as string | null) ?? null) : undefined,
    created_at: String(row.created_at ?? new Date().toISOString()),
    created_by_id: (row.created_by as string | null) ?? null,
    created_by_name: (row.created_by_name as string | null) ?? null,
    updated_at: (row.updated_at as string | undefined) ?? undefined,
  };
}

function asMeta(item: WebsiteContentItem): Record<string, unknown> {
  return { ...item };
}

export async function listMasterContent(entity: MasterContentEntity): Promise<WebsiteContentItem[]> {
  if (useSupabaseMaster()) {
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { data, error } = await supabase
        .from(TABLE_MAP[entity])
        .select("*")
        .order("created_at", { ascending: false });
      if (!error && data) {
        return data.map((row) => mapRow(entity, row as Record<string, unknown>));
      }
    } catch {
      // fall through
    }
  }
  return readLocal(entity);
}

export type MasterContentInput = {
  name: string;
  subtitle?: string | null;
  image_url?: string | null;
  gallery_urls?: string[];
  show_on_website?: boolean;
  is_trending?: boolean;
  display_mode?: DisplayMode;
  country?: string | null;
  google_maps_url?: string | null;
  vehicle_type?: string | null;
  capacity?: string | null;
};

export async function createMasterContent(
  entity: MasterContentEntity,
  input: MasterContentInput,
  actor: TeamMember
): Promise<WebsiteContentItem> {
  const now = new Date().toISOString();
  const gallery = (input.gallery_urls ?? []).filter(Boolean).slice(0, 6);
  const cover = input.image_url || gallery[0] || null;
  const item: WebsiteContentItem = {
    id: crypto.randomUUID(),
    name: input.name.trim(),
    subtitle: input.subtitle?.trim() || null,
    image_url: cover,
    gallery_urls: gallery.length ? gallery : cover ? [cover] : [],
    show_on_website: input.show_on_website ?? true,
    is_trending: entity === "destinations" ? Boolean(input.is_trending) : undefined,
    display_mode: input.display_mode ?? "list",
    country: input.country ?? "India",
    google_maps_url: entity === "hotels" ? input.google_maps_url?.trim() || null : undefined,
    vehicle_type: entity === "vehicles" ? input.vehicle_type?.trim() || null : undefined,
    capacity: entity === "vehicles" ? input.capacity?.trim() || null : undefined,
    created_at: now,
    updated_at: now,
    created_by_id: actor.id,
    created_by_name: actor.name,
  };

  let persisted = false;
  if (useSupabaseMaster()) {
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const payload: Record<string, unknown> = {
        id: item.id,
        name: item.name,
        subtitle: item.subtitle,
        image_url: item.image_url,
        gallery_urls: item.gallery_urls ?? [],
        show_on_website: item.show_on_website,
        display_mode: item.display_mode,
        created_by: actor.id,
        created_by_name: actor.name,
      };
      if (entity !== "vehicles") payload.country = item.country ?? "India";
      if (entity === "destinations") payload.is_trending = item.is_trending ?? false;
      if (entity === "hotels") payload.google_maps_url = item.google_maps_url ?? null;
      if (entity === "vehicles") {
        payload.vehicle_type = item.vehicle_type ?? null;
        payload.capacity = item.capacity ?? null;
      }

      const { error } = await supabase.from(TABLE_MAP[entity]).insert(payload);
      if (!error) persisted = true;
    } catch {
      // fall through to local
    }
  }

  if (!persisted) {
    const list = readLocal(entity);
    list.unshift(item);
    writeLocal(entity, list);
  }

  logMasterDataChange({
    entityType: entity,
    entityId: item.id,
    action: "create",
    summary: `Created ${entity.slice(0, -1)} “${item.name}”`,
    after: asMeta(item),
    actor,
  });

  return item;
}

export async function updateMasterContent(
  entity: MasterContentEntity,
  id: string,
  patch: Partial<MasterContentInput>,
  actor?: TeamMember
): Promise<WebsiteContentItem | null> {
  const now = new Date().toISOString();
  const beforeList = await listMasterContent(entity);
  const before = beforeList.find((i) => i.id === id) ?? null;

  if (useSupabaseMaster()) {
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const payload: Record<string, unknown> = { updated_at: now };
      if (patch.name !== undefined) payload.name = patch.name.trim();
      if (patch.subtitle !== undefined) payload.subtitle = patch.subtitle;
      if (patch.gallery_urls !== undefined) {
        const gallery = patch.gallery_urls.slice(0, 6);
        payload.gallery_urls = gallery;
        payload.image_url = patch.image_url !== undefined ? patch.image_url : gallery[0] ?? null;
      } else if (patch.image_url !== undefined) {
        payload.image_url = patch.image_url;
      }
      if (patch.show_on_website !== undefined) payload.show_on_website = patch.show_on_website;
      if (patch.display_mode !== undefined) payload.display_mode = patch.display_mode;
      if (patch.country !== undefined) payload.country = patch.country;
      if (patch.is_trending !== undefined) payload.is_trending = patch.is_trending;
      if (patch.google_maps_url !== undefined) payload.google_maps_url = patch.google_maps_url;
      if (patch.vehicle_type !== undefined) payload.vehicle_type = patch.vehicle_type;
      if (patch.capacity !== undefined) payload.capacity = patch.capacity;

      const { data, error } = await supabase
        .from(TABLE_MAP[entity])
        .update(payload)
        .eq("id", id)
        .select("*")
        .maybeSingle();
      if (!error && data) {
        const after = mapRow(entity, data as Record<string, unknown>);
        logMasterDataChange({
          entityType: entity,
          entityId: id,
          action: "update",
          summary: `Updated ${entity.slice(0, -1)} “${after.name}”`,
          before: before ? asMeta(before) : null,
          after: asMeta(after),
          actor,
        });
        return after;
      }
    } catch {
      // fall through
    }
  }

  const list = readLocal(entity);
  const idx = list.findIndex((i) => i.id === id);
  if (idx < 0) return null;
  const gallery =
    patch.gallery_urls !== undefined
      ? patch.gallery_urls.filter(Boolean).slice(0, 6)
      : list[idx].gallery_urls;
  const cover =
    patch.image_url !== undefined
      ? patch.image_url
      : gallery?.[0] ?? list[idx].image_url;
  list[idx] = {
    ...list[idx],
    ...patch,
    name: patch.name !== undefined ? patch.name.trim() : list[idx].name,
    gallery_urls: gallery,
    image_url: cover,
    updated_at: now,
  };
  writeLocal(entity, list);
  logMasterDataChange({
    entityType: entity,
    entityId: id,
    action: "update",
    summary: `Updated ${entity.slice(0, -1)} “${list[idx].name}”`,
    before: before ? asMeta(before) : null,
    after: asMeta(list[idx]),
    actor,
  });
  return list[idx];
}

export async function deleteMasterContent(
  entity: MasterContentEntity,
  id: string,
  actor?: TeamMember
): Promise<boolean> {
  const beforeList = await listMasterContent(entity);
  const before = beforeList.find((i) => i.id === id) ?? null;

  if (useSupabaseMaster()) {
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { error } = await supabase.from(TABLE_MAP[entity]).delete().eq("id", id);
      if (!error) {
        logMasterDataChange({
          entityType: entity,
          entityId: id,
          action: "delete",
          summary: `Deleted ${entity.slice(0, -1)} “${before?.name ?? id}”`,
          before: before ? asMeta(before) : null,
          actor,
        });
        return true;
      }
    } catch {
      // fall through
    }
  }

  const list = readLocal(entity).filter((i) => i.id !== id);
  writeLocal(entity, list);
  logMasterDataChange({
    entityType: entity,
    entityId: id,
    action: "delete",
    summary: `Deleted ${entity.slice(0, -1)} “${before?.name ?? id}”`,
    before: before ? asMeta(before) : null,
    actor,
  });
  return true;
}
