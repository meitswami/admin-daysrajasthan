import type { HotelCategoryKey } from "@/types/itinerary-builder";
import { HOTEL_CATEGORY_OPTIONS } from "@/types/itinerary-builder";

export type HotelMasterItem = {
  id: string;
  name: string;
  location: string;
  rating: number;
  category_key: HotelCategoryKey;
  image_url: string;
};

const IMG =
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=200&q=80";

function h(
  id: string,
  name: string,
  location: string,
  rating: number,
  category_key: HotelCategoryKey
): HotelMasterItem {
  return { id, name, location, rating, category_key, image_url: IMG };
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

export function formatHotelOption(hotel: HotelMasterItem): string {
  return `${hotel.name} - ${hotel.rating.toFixed(1)}★ - ${categoryLabel(hotel.category_key)}`;
}

function normalizeLoc(value: string): string {
  return value
    .toLowerCase()
    .replace(/\s+city$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function hotelsForLocation(location: string | null | undefined): HotelMasterItem[] {
  if (!location) return [];
  const loc = normalizeLoc(location);
  if (!loc || loc === "departure") return [];

  const exact = HOTEL_MASTER.filter((h) => normalizeLoc(h.location) === loc);
  if (exact.length) return exact;

  return HOTEL_MASTER.filter((h) => {
    const hl = normalizeLoc(h.location);
    return loc.includes(hl) || hl.includes(loc);
  });
}

export function findHotelByOptionLabel(label: string): HotelMasterItem | null {
  return HOTEL_MASTER.find((h) => formatHotelOption(h) === label) ?? null;
}

export function hotelLocations(): string[] {
  return Array.from(new Set(HOTEL_MASTER.map((h) => h.location))).sort();
}
