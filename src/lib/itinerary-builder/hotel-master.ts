import type { WebsiteContentItem } from "@/types/database";
import type { HotelCategoryKey } from "@/types/itinerary-builder";
import { HOTEL_CATEGORY_OPTIONS } from "@/types/itinerary-builder";

export type HotelMasterItem = {
  id: string;
  name: string;
  location: string;
  rating: number;
  category_key: HotelCategoryKey;
  image_url: string;
  /** Free-text Price Description from Master Data (Price/Night column) */
  price_description?: string | null;
};

const IMG =
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=200&q=80";

function h(
  id: string,
  name: string,
  location: string,
  rating: number,
  category_key: HotelCategoryKey,
  price_description?: string | null
): HotelMasterItem {
  return { id, name, location, rating, category_key, image_url: IMG, price_description };
}

/** Dummy location-scoped hotel inventory for V1 night picker */
export const HOTEL_MASTER: HotelMasterItem[] = [
  // Jaipur
  h("jp-1", "Opulence Inn", "Jaipur", 4.6, "deluxe_hotels"),
  h("jp-2", "Siddhartha Inn", "Jaipur", 4.8, "deluxe_hotels"),
  h("jp-3", "The Archi", "Jaipur", 4.5, "deluxe_hotels"),
  h("jp-4", "ITC Rajputana", "Jaipur", 4.7, "luxury_hotels"),
  h("jp-5", "Taj Rambagh Palace", "Jaipur", 4.9, "luxury_hotels"),
  h("jp-6", "Samode Haveli", "Jaipur", 4.4, "heritage_hotels"),
  h("jp-7", "Kaner Bagh", "Jaipur", 4.4, "super_deluxe_hotels"),
  h("jp-8", "Royal Courtyard", "Jaipur", 4.9, "super_deluxe_hotels"),

  // Udaipur
  h("ud-1", "Opulence Inn", "Udaipur", 4.6, "deluxe_hotels"),
  h("ud-2", "Raghunandan Palace", "Udaipur", 4.8, "super_deluxe_hotels"),
  h("ud-3", "Amet Haveli - Lake View", "Udaipur", 4.1, "heritage_hotels"),
  h("ud-4", "Bhairavgarh Palace", "Udaipur", 4.3, "heritage_hotels"),
  h("ud-5", "Lakend - Lake View", "Udaipur", 4.4, "luxury_hotels"),
  h("ud-6", "Pride", "Udaipur", 4.3, "luxury_hotels"),
  h("ud-7", "Ramada Encore by Wyndham", "Udaipur", 4.7, "luxury_hotels"),
  h("ud-8", "Wonder Cliff", "Udaipur", 4.6, "super_deluxe_hotels"),
  h("ud-9", "The Archi", "Udaipur", 4.5, "deluxe_hotels"),
  h("ud-10", "Siddhartha Inn", "Udaipur", 4.8, "deluxe_hotels"),

  // Jodhpur
  h("jd-1", "RAAS Jodhpur", "Jodhpur", 4.7, "luxury_hotels"),
  h("jd-2", "Opulence Inn", "Jodhpur", 4.5, "deluxe_hotels"),
  h("jd-3", "The Archi", "Jodhpur", 4.4, "deluxe_hotels"),
  h("jd-4", "Kaner Bagh", "Jodhpur", 4.3, "super_deluxe_hotels"),
  h("jd-5", "Bhairavgarh Palace", "Jodhpur", 4.2, "heritage_hotels"),

  // Jaisalmer
  h("js-1", "Suryagarh", "Jaisalmer", 4.8, "luxury_hotels"),
  h("js-2", "Desert Camp Luxury", "Jaisalmer", 4.5, "super_deluxe_hotels"),
  h("js-3", "Opulence Inn", "Jaisalmer", 4.3, "deluxe_hotels"),

  // Agra
  h("ag-1", "Hotel Taj Resorts", "Agra", 4.5, "deluxe_hotels"),
  h("ag-2", "Crystal Inn Agra", "Agra", 4.3, "deluxe_hotels"),
  h("ag-3", "The Gateway Hotel", "Agra", 4.6, "super_deluxe_hotels"),
  h("ag-4", "Howard Plaza - The Fern", "Agra", 4.4, "super_deluxe_hotels"),
  h("ag-5", "ITC Mughal", "Agra", 4.8, "luxury_hotels"),
  h("ag-6", "Oberoi Amarvilas", "Agra", 4.9, "luxury_hotels"),
  h("ag-7", "Trident Agra", "Agra", 4.7, "luxury_hotels"),
  h("ag-8", "Hotel Atulya Taj", "Agra", 4.2, "heritage_hotels"),
  h("ag-9", "Clarks Shiraz", "Agra", 4.1, "heritage_hotels"),
  h("ag-10", "Hotel Pushp Villa", "Agra", 4.0, "deluxe_hotels"),

  // Delhi
  h("dl-1", "Hotel Bloom Rooms", "Delhi", 4.3, "deluxe_hotels"),
  h("dl-2", "The Suryaa New Delhi", "Delhi", 4.5, "super_deluxe_hotels"),
  h("dl-3", "The Leela Palace", "Delhi", 4.8, "luxury_hotels"),
  h("dl-4", "Taj Palace", "Delhi", 4.7, "luxury_hotels"),
  h("dl-5", "Hotel Diplomat", "Delhi", 4.1, "heritage_hotels"),
  h("dl-6", "Pride Plaza Aerocity", "Delhi", 4.4, "super_deluxe_hotels"),

  // Pushkar
  h("pk-1", "Hotel Pushkar Palace", "Pushkar", 4.4, "deluxe_hotels"),
  h("pk-2", "Ananta Spa & Resorts", "Pushkar", 4.6, "super_deluxe_hotels"),
  h("pk-3", "Jagat Palace", "Pushkar", 4.3, "heritage_hotels"),
  h("pk-4", "Pushkar Resort", "Pushkar", 4.5, "luxury_hotels"),

  // Mount Abu
  h("ma-1", "Hotel Hilltone", "Mount Abu", 4.3, "deluxe_hotels"),
  h("ma-2", "Cama Rajputana Club Resort", "Mount Abu", 4.5, "super_deluxe_hotels"),
  h("ma-3", "Jaipur House", "Mount Abu", 4.2, "heritage_hotels"),
  h("ma-4", "The Connaught House", "Mount Abu", 4.6, "luxury_hotels"),

  // Bikaner
  h("bk-1", "Hotel Heritage Mandawa", "Bikaner", 4.2, "deluxe_hotels"),
  h("bk-2", "Laxmi Niwas Palace", "Bikaner", 4.5, "heritage_hotels"),
  h("bk-3", "Narendra Bhawan", "Bikaner", 4.7, "luxury_hotels"),
  h("bk-4", "Hotel Gaj Kesri", "Bikaner", 4.4, "super_deluxe_hotels"),

  // Ranthambhore
  h("rt-1", "Tiger Den Resort", "Ranthambhore", 4.3, "deluxe_hotels"),
  h("rt-2", "The Oberoi Vanyavilas", "Ranthambhore", 4.9, "luxury_hotels"),
  h("rt-3", "Ranthambhore Regency", "Ranthambhore", 4.4, "super_deluxe_hotels"),
  h("rt-4", "Nahargarh Ranthambhore", "Ranthambhore", 4.6, "heritage_hotels"),
];

export function categoryLabel(key: HotelCategoryKey): string {
  return HOTEL_CATEGORY_OPTIONS.find((o) => o.key === key)?.label ?? key;
}

export function categoryKeyFromLabel(label: string | null | undefined): HotelCategoryKey {
  const q = (label ?? "").trim().toLowerCase();
  const hit = HOTEL_CATEGORY_OPTIONS.find((o) => o.label.toLowerCase() === q);
  return hit?.key ?? "deluxe_hotels";
}

export function formatHotelOption(hotel: HotelMasterItem): string {
  return `${hotel.name} - ${hotel.rating.toFixed(1)}★ - ${categoryLabel(hotel.category_key)}`;
}

export function hotelPriceDescription(hotel: HotelMasterItem | null | undefined): string {
  const text = hotel?.price_description?.trim();
  return text || "Not specified";
}

function normalizeLoc(value: string): string {
  return value
    .toLowerCase()
    .replace(/\s+city$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function hotelFromWebsiteItem(item: WebsiteContentItem): HotelMasterItem | null {
  const name = item.name?.trim();
  const location = item.location?.trim();
  if (!name || !location) return null;
  const image =
    item.image_url?.trim() ||
    (Array.isArray(item.gallery_urls) ? item.gallery_urls.find((u) => Boolean(u?.trim())) : null) ||
    "";
  return {
    id: item.id,
    name,
    location,
    rating: typeof item.rating === "number" && !Number.isNaN(item.rating) ? item.rating : 0,
    category_key: categoryKeyFromLabel(item.category),
    // Never invent a stock Unsplash photo — wrong images confuse clients.
    image_url: image,
    price_description: item.price_description ?? null,
  };
}

/** Prefer Master Data hotels. Do not pad with dummy HOTEL_MASTER when cloud data exists. */
export function mergeHotelCatalog(
  masterHotels: HotelMasterItem[],
  fallback: HotelMasterItem[] = HOTEL_MASTER
): HotelMasterItem[] {
  if (masterHotels.length > 0) return masterHotels;
  return fallback;
}

function filterByLocation(
  catalog: HotelMasterItem[],
  location: string | null | undefined
): HotelMasterItem[] {
  if (!location) return [];
  const loc = normalizeLoc(location);
  if (!loc || loc === "departure") return [];

  const exact = catalog.filter((h) => normalizeLoc(h.location) === loc);
  if (exact.length) return exact;

  // Prefer longer location tokens to avoid "Jaipur" matching inside unrelated names.
  return catalog.filter((h) => {
    const hl = normalizeLoc(h.location);
    if (!hl) return false;
    if (hl === loc) return true;
    // Only allow containment when one side is a clear prefix/suffix city match (min 4 chars).
    if (loc.length >= 4 && hl.length >= 4) {
      return loc.startsWith(hl) || hl.startsWith(loc);
    }
    return false;
  });
}

export function hotelsForLocation(
  location: string | null | undefined,
  catalog: HotelMasterItem[] = HOTEL_MASTER
): HotelMasterItem[] {
  return filterByLocation(catalog, location);
}

/** Deluxe → Super Deluxe → Heritage → Luxury, then name. */
export function sortHotelsByCategory(hotels: HotelMasterItem[]): HotelMasterItem[] {
  const order = new Map(HOTEL_CATEGORY_OPTIONS.map((o, i) => [o.key, i]));
  return [...hotels].sort((a, b) => {
    const ai = order.get(a.category_key) ?? 99;
    const bi = order.get(b.category_key) ?? 99;
    if (ai !== bi) return ai - bi;
    return a.name.localeCompare(b.name);
  });
}

/** Group hotels for `<optgroup>` sections in the night hotel dropdowns. */
export function groupHotelsByCategory(
  hotels: HotelMasterItem[]
): { key: HotelCategoryKey; label: string; hotels: HotelMasterItem[] }[] {
  const sorted = sortHotelsByCategory(hotels);
  return HOTEL_CATEGORY_OPTIONS.map(({ key, label }) => ({
    key,
    label,
    hotels: sorted.filter((h) => h.category_key === key),
  })).filter((g) => g.hotels.length > 0);
}

/**
 * Resolve a hotel option label to master row.
 * Labels look like: `Opulence Inn - 4.6★ - Deluxe Hotels`
 * Optional `location` prevents same-name hotels in other cities from winning.
 */
export function findHotelByOptionLabel(
  label: string,
  catalog: HotelMasterItem[] = HOTEL_MASTER,
  location?: string | null
): HotelMasterItem | null {
  const trimmed = label?.trim();
  if (!trimmed) return null;

  const scoped = location ? filterByLocation(catalog, location) : catalog;
  const pool = scoped.length > 0 ? scoped : catalog;

  const exact = pool.find((h) => formatHotelOption(h) === trimmed);
  if (exact) return exact;

  // Parse "Name - 4.6★ - Category"
  const parts = trimmed.split(" - ").map((p) => p.trim()).filter(Boolean);
  const name = (parts[0] ?? "").toLowerCase();
  if (!name) return null;

  const ratingPart = parts.find((p) => /★/.test(p));
  const rating = ratingPart ? Number(ratingPart.replace("★", "").trim()) : null;
  const categoryPart = parts.length >= 3 ? parts[parts.length - 1] : null;
  const categoryKey = categoryPart ? categoryKeyFromLabel(categoryPart) : null;

  const scored = pool
    .filter((h) => h.name.trim().toLowerCase() === name)
    .map((h) => {
      let score = 1;
      if (rating != null && Number.isFinite(rating) && Math.abs(h.rating - rating) < 0.05) score += 2;
      if (categoryKey && h.category_key === categoryKey) score += 2;
      return { h, score };
    })
    .sort((a, b) => b.score - a.score);

  return scored[0]?.h ?? null;
}

export function hotelLocations(catalog: HotelMasterItem[] = HOTEL_MASTER): string[] {
  return Array.from(new Set(catalog.map((h) => h.location))).sort();
}
