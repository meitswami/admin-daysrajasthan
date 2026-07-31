import type { Itinerary, ItineraryDayPlan } from "@/types/database";
import type {
  CategoryPricingTier,
  HotelCategoryKey,
  ItineraryDay,
  ItinerarySnapshot,
} from "@/types/itinerary-builder";
import { HOTEL_CATEGORY_OPTIONS } from "@/types/itinerary-builder";
import {
  applyCostToSnapshot,
  durationLabelFromDays,
  resolveCategoryTierPricing,
} from "./cost-engine";
import { emptyCustomItineraryDays, emptyDay, emptySnapshot } from "./defaults";

export type PackageCatalogLocation = {
  name: string;
  nights: number;
};

export type PackageCatalogEntry = {
  id: string;
  tour_code: string;
  title: string;
  duration_label: string;
  duration_nights: number;
  duration_days: number;
  locations: PackageCatalogLocation[];
  updated_at: string;
  /** Builds a prefilled snapshot template for the wizard */
  buildTemplate: () => ItinerarySnapshot;
};

/** Parse "3 Days 2 Nights" / "02 Nights / 03 Days" style labels */
export function parseDurationParts(label: string | null | undefined): {
  days: number | null;
  nights: number | null;
} {
  if (!label?.trim()) return { days: null, nights: null };
  const daysMatch = label.match(/(\d+)\s*Days?/i);
  const nightsMatch = label.match(/(\d+)\s*Nights?/i);
  return {
    days: daysMatch ? Number(daysMatch[1]) : null,
    nights: nightsMatch ? Number(nightsMatch[1]) : null,
  };
}

/** Collapse consecutive day locations into name + night chips for the package table */
export function locationsFromDayPlans(days: ItineraryDayPlan[]): PackageCatalogLocation[] {
  const segments: PackageCatalogLocation[] = [];
  for (const day of days) {
    const name = (day.location ?? "").trim();
    if (!name) continue;
    const last = segments[segments.length - 1];
    if (last && last.name.toLowerCase() === name.toLowerCase()) last.nights += 1;
    else segments.push({ name, nights: 1 });
  }
  return segments;
}

/** Map a master-data day plan into a builder day, preserving Location for hotel filtering */
export function masterDayToBuilderDay(plan: ItineraryDayPlan, index: number): ItineraryDay {
  const day = emptyDay(plan.day_number || index + 1);
  const location = (plan.location ?? "").trim() || null;
  day.day_title = plan.title?.trim() || day.day_title;
  day.alternate_day_titles = (plan.alternate_titles ?? []).map((t) => t.trim()).filter(Boolean);
  day.day_description = plan.description?.trim() || "";
  day.location = location;
  day.pickup_location = location;
  day.images = (plan.image_urls ?? []).filter(Boolean).slice(0, 4);
  return day;
}

/** Convert a Master Data itinerary into a selectable wizard package (with day locations) */
export function masterItineraryToCatalogEntry(item: Itinerary): PackageCatalogEntry {
  const days = item.days ?? [];
  const parsed = parseDurationParts(item.package_duration);
  const duration_days =
    days.length > 0 ? days.length : parsed.days ?? Math.max(1, (parsed.nights ?? 0) + 1);
  const duration_nights =
    parsed.nights ?? Math.max(0, duration_days - 1);
  const duration_label =
    item.package_duration?.trim() ||
    `${String(duration_nights).padStart(2, "0")} Night${duration_nights !== 1 ? "s" : ""} / ${String(duration_days).padStart(2, "0")} Day${duration_days !== 1 ? "s" : ""}`;

  const tourCode =
    item.tour_code?.trim().toUpperCase() ||
    (() => {
      const slug = item.slug?.trim();
      if (!slug) return "CUSTOM";
      const match = slug.match(/^([a-zA-Z]+\d+)/);
      return (match?.[1] ?? slug.split("-")[0] ?? "CUSTOM").toUpperCase();
    })();

  const locations = locationsFromDayPlans(days);
  if (!locations.length && item.destination?.trim()) {
    locations.push({ name: item.destination.trim(), nights: duration_nights || 1 });
  }

  return {
    id: item.id,
    tour_code: tourCode,
    title: item.package_name,
    duration_label,
    duration_nights,
    duration_days,
    locations,
    updated_at: (item.updated_at || item.created_at || "").slice(0, 10) || new Date().toISOString().slice(0, 10),
    buildTemplate: () => {
      const builderDays =
        days.length > 0
          ? days.map((d, i) => masterDayToBuilderDay(d, i))
          : emptyCustomItineraryDays();
      return applyCostToSnapshot(
        emptySnapshot({
          header: {
            title: item.package_name,
            subtitle: item.destination,
            tour_code: tourCode,
            duration_label,
            alternate_titles: item.alternate_titles ?? [],
          },
          days: builderDays,
          ...(item.inclusions?.length ? { inclusions: item.inclusions } : {}),
          ...(item.exclusions?.length ? { exclusions: item.exclusions } : {}),
          source_package_id: item.id,
        })
      );
    },
  };
}

export function catalogFromMasterItineraries(
  items: Itinerary[],
  opts?: { includeInactive?: boolean }
): PackageCatalogEntry[] {
  const list = opts?.includeInactive
    ? items
    : items.filter((i) => i.status !== "inactive");
  return list.map(masterItineraryToCatalogEntry);
}

export function listPackageCatalog(catalog: PackageCatalogEntry[]) {
  return [...catalog];
}

export function getPackageByTourCode(code: string, catalog: PackageCatalogEntry[]) {
  return catalog.find((p) => p.tour_code.toLowerCase() === code.toLowerCase()) ?? null;
}

export function getPackageById(id: string, catalog: PackageCatalogEntry[]) {
  return catalog.find((p) => p.id === id) ?? null;
}

/** Split codes like DR018 / WRT006 into prefix + numeric suffix. */
export function parseTourCodeParts(
  code: string | null | undefined
): { prefix: string; number: number; width: number } | null {
  const m = (code ?? "").trim().toUpperCase().match(/^([A-Z]+)(\d+)$/);
  if (!m) return null;
  return { prefix: m[1], number: Number(m[2]), width: m[2].length };
}

/**
 * Highest existing tour code for a letter prefix (e.g. WRT → WRT048).
 * Falls back to the highest numeric code of any prefix when none match.
 */
export function lastTourCodeAmong(
  existingCodes: Array<string | null | undefined>,
  preferredPrefix = "WRT"
): string | null {
  const prefix = preferredPrefix.trim().toUpperCase() || "WRT";
  let bestPreferred: { number: number; code: string } | null = null;
  let bestAny: { number: number; code: string } | null = null;
  for (const raw of existingCodes) {
    const parts = parseTourCodeParts(raw);
    if (!parts) continue;
    const code = `${parts.prefix}${String(parts.number).padStart(parts.width, "0")}`;
    if (!bestAny || parts.number > bestAny.number) {
      bestAny = { number: parts.number, code };
    }
    if (parts.prefix === prefix) {
      if (!bestPreferred || parts.number > bestPreferred.number) {
        bestPreferred = { number: parts.number, code };
      }
    }
  }
  return bestPreferred?.code ?? bestAny?.code ?? null;
}

/**
 * Next free tour code for a letter prefix (e.g. WRT → WRT049).
 * Used as a tip / when staff generate a code; package picks leave the field blank.
 */
export function nextTourCode(
  existingCodes: Array<string | null | undefined>,
  preferredPrefix = "WRT"
): string {
  const prefix = preferredPrefix.trim().toUpperCase() || "WRT";
  let max = 0;
  let width = 3;
  for (const code of existingCodes) {
    const parts = parseTourCodeParts(code);
    if (!parts || parts.prefix !== prefix) continue;
    if (parts.number > max) max = parts.number;
    if (parts.width > width) width = parts.width;
  }
  return `${prefix}${String(max + 1).padStart(width, "0")}`;
}

export function filterPackages(
  opts: {
    search?: string;
    durationNights?: number | "all";
    tourCode?: string;
  },
  catalog: PackageCatalogEntry[]
) {
  let list = listPackageCatalog(catalog);
  if (opts.durationNights && opts.durationNights !== "all") {
    list = list.filter((p) => p.duration_nights === opts.durationNights);
  }
  if (opts.tourCode?.trim()) {
    const q = opts.tourCode.trim().toLowerCase();
    list = list.filter((p) => p.tour_code.toLowerCase().includes(q));
  }
  if (opts.search?.trim()) {
    const q = opts.search.trim().toLowerCase();
    list = list.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.tour_code.toLowerCase().includes(q) ||
        p.locations.some((l) => l.name.toLowerCase().includes(q))
    );
  }
  return list;
}

export function uniqueDurations(catalog: PackageCatalogEntry[]) {
  const nights = new Set(catalog.map((p) => p.duration_nights));
  return [...nights].sort((a, b) => a - b);
}

/** Apply a hotel tier room category across all hotel nights for cost preview */
export function snapshotForCategoryPreview(
  snapshot: ItinerarySnapshot,
  roomCategory: string
): ItinerarySnapshot {
  const days = (snapshot.days ?? []).map((d) => ({
    ...d,
    room_category: d.hotel_name ? roomCategory : d.room_category,
  }));
  return applyCostToSnapshot({
    ...snapshot,
    days,
    header: {
      ...snapshot.header,
      duration_label: durationLabelFromDays(days),
    },
  });
}

export function buildCategoryPricing(
  snapshot: ItinerarySnapshot,
  selectedKeys: HotelCategoryKey[],
  discounts: Partial<Record<HotelCategoryKey, number | null>> = {},
  packageOverrides: Partial<Record<HotelCategoryKey, number | null>> = {}
): CategoryPricingTier[] {
  return selectedKeys.slice(0, 2).map((key) => {
    const opt = HOTEL_CATEGORY_OPTIONS.find((o) => o.key === key)!;
    const priced = snapshotForCategoryPreview(snapshot, opt.room_category);
    const autoPrice = priced.cost_sheet.grand_total;
    const override = packageOverrides[key];
    const package_price = override != null && override > 0 ? override : autoPrice;
    const discount_price = discounts[key] ?? null;
    const manual_override = override != null && override > 0 ? override : null;
    // package_price already includes override; pass manual_override null to avoid double-applying
    const { grand_total, booking_amount } = resolveCategoryTierPricing({
      package_price,
      discount_price,
      manual_override: null,
    });
    return {
      category_key: key,
      label: opt.label,
      room_category: opt.room_category,
      package_price,
      discount_price,
      booking_amount,
      grand_total,
      manual_override,
    };
  });
}
