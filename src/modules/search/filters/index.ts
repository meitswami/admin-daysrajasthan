/**
 * Filter helpers for TravelDays search (budget, duration, region, style, …).
 */

import type { PackageRecord } from "@/modules/knowledge";

import type { SearchFilters, SearchMatchMode } from "../types";

/** Known destination tokens used for AND-matching multi-city queries. */
export const PLACE_TOKENS = [
  "jaipur",
  "udaipur",
  "jodhpur",
  "jaisalmer",
  "pushkar",
  "ajmer",
  "bikaner",
  "mount",
  "abu",
  "ranthambore",
  "ranthambhore",
  "chittorgarh",
  "kumbhalgarh",
  "delhi",
  "agra",
  "nathdwara",
  "haldighati",
  "ranakpur",
  "salasar",
  "khatushyam",
] as const;

const QUERY_STOP = new Set([
  "a",
  "an",
  "the",
  "to",
  "for",
  "in",
  "on",
  "of",
  "and",
  "or",
  "want",
  "with",
  "from",
  "into",
  "about",
  "around",
  "explore",
  "looking",
  "please",
  "exactly",
  "exact",
  "days",
  "day",
  "nights",
  "night",
  "trip",
  "tour",
  "package",
  "packages",
  "rajasthan",
]);

export type QueryTokenParts = {
  places: string[];
  durationDigits: number[];
  other: string[];
};

/**
 * Split a natural-language query into place / duration / other tokens.
 */
export function extractQueryTokens(query: string): QueryTokenParts {
  const q = query.trim().toLowerCase();
  const raw = q.split(/[^a-z0-9]+/).filter(Boolean);
  const places: string[] = [];
  const durationDigits: number[] = [];
  const other: string[] = [];
  const placeSet = new Set<string>(PLACE_TOKENS);

  for (const p of raw) {
    if (QUERY_STOP.has(p)) continue;
    if (/^\d{1,2}$/.test(p)) {
      durationDigits.push(Number(p));
      continue;
    }
    if (placeSet.has(p)) {
      if (!places.includes(p)) places.push(p);
      continue;
    }
    if (p.length > 2) other.push(p);
  }

  // Lone "mount" is weak without abu
  if (places.includes("mount") && !places.includes("abu")) {
    const i = places.indexOf("mount");
    if (i >= 0) places.splice(i, 1);
  }

  return { places, durationDigits, other };
}

/**
 * Parse day count from catalog labels like "3 Days 2 Nights", "04 Night / 05 Days",
 * or package titles like "05 Days Jaipur Tour Package".
 */
export function parseDurationDays(label: string | null | undefined): number | null {
  if (!label) return null;
  const days = label.match(/(\d+)\s*Days?/i);
  if (days) return Number(days[1]);
  const nights = label.match(/(\d+)\s*Nights?/i);
  if (nights) return Number(nights[1]) + 1;
  return null;
}

/**
 * Extract requested trip length from natural-language search text.
 * Supports "5 days", "5-7 days", "05 Days", "4 nights" (→ 5 days).
 */
export function parseDurationDaysFromQuery(text: string): {
  min: number | null;
  max: number | null;
  exact: boolean;
} {
  const lower = text.toLowerCase();
  const exact = /\bexact(?:ly)?\b/.test(lower);

  const range = text.match(/(\d+)\s*(?:-|to|–|—)\s*(\d+)\s*-?\s*days?/i);
  if (range) {
    const a = Number(range[1]);
    const b = Number(range[2]);
    return { min: Math.min(a, b), max: Math.max(a, b), exact: false };
  }

  const days = text.match(/(\d+)\s*-?\s*days?/i);
  if (days) {
    const n = Number(days[1]);
    if (exact) return { min: n, max: n, exact: true };
    // "around / about N days" → soft ±1 window
    if (/\b(?:around|about|approx(?:imately)?|~)\b/.test(lower)) {
      return { min: Math.max(1, n - 1), max: n + 1, exact: false };
    }
    return { min: n, max: n, exact: true };
  }

  const nights = text.match(/(\d+)\s*-?\s*nights?/i);
  if (nights) {
    const n = Number(nights[1]) + 1;
    return exact ? { min: n, max: n, exact: true } : { min: n, max: n, exact: true };
  }

  return { min: null, max: null, exact: false };
}

/**
 * Apply travel-style heuristics from package type / name (deterministic).
 */
export function packageMatchesTravelStyle(
  pkg: PackageRecord,
  style: NonNullable<SearchFilters["travelStyle"]>
): boolean {
  const hay = `${pkg.name} ${pkg.packageType ?? ""}`.toLowerCase();
  switch (style) {
    case "family":
      return hay.includes("family") || hay.includes("kids");
    case "couple":
      return hay.includes("honeymoon") || hay.includes("couple") || hay.includes("romantic");
    case "group":
      return hay.includes("group") || hay.includes("friends");
    case "luxury":
      return hay.includes("luxury") || hay.includes("heritage");
    case "adventure":
      return hay.includes("safari") || hay.includes("trek") || hay.includes("wildlife");
    case "pilgrimage":
      return hay.includes("tirth") || hay.includes("yatra") || hay.includes("temple");
    default:
      return true;
  }
}

/**
 * Apply structured package filters.
 */
export function filterPackages(
  packages: PackageRecord[],
  filters: SearchFilters | undefined
): PackageRecord[] {
  if (!filters) return packages;
  return packages.filter((pkg) => {
    if (filters.regionCode && pkg.regionCode !== filters.regionCode) return false;
    if (
      filters.destination &&
      !(pkg.destination ?? "").toLowerCase().includes(filters.destination.toLowerCase())
    ) {
      return false;
    }
    if (filters.category && (pkg.packageType ?? "").toLowerCase() !== filters.category.toLowerCase()) {
      return false;
    }
    if (filters.travelStyle && !packageMatchesTravelStyle(pkg, filters.travelStyle)) return false;

    const days =
      parseDurationDays(pkg.duration) ?? parseDurationDays(pkg.name);
    if (filters.durationDaysMin != null) {
      if (days == null || days < filters.durationDaysMin) return false;
    }
    if (filters.durationDaysMax != null) {
      if (days == null || days > filters.durationDaysMax) return false;
    }
    // Budget filters reserved: PackageRecord has no price — no-op until Knowledge exposes list price
    return true;
  });
}

/**
 * How well a package covers requested place tokens (0–1).
 */
export function placeCoverage(haystack: string, places: string[]): number {
  if (!places.length) return 1;
  const hay = haystack.toLowerCase();
  const hits = places.filter((p) => hay.includes(p)).length;
  return hits / places.length;
}

/**
 * Package/destination text match:
 * - Place tokens use AND (all named cities should appear)
 * - Duration digits alone never match when places are present (duration is a structured filter)
 * - Without places, fall back to any meaningful token / duration digit
 */
export function textMatches(
  haystack: string,
  query: string,
  mode: SearchMatchMode = "contains"
): boolean {
  const hay = haystack.toLowerCase();
  const q = query.trim().toLowerCase();
  if (!q) return true;
  switch (mode) {
    case "exact":
      return hay === q;
    case "prefix":
      return hay.startsWith(q) || hay.split(/\s+/).some((w) => w.startsWith(q));
    case "keyword": {
      const parts = q.split(/\s+/).filter(Boolean);
      return parts.every((p) => hay.includes(p));
    }
    case "tag":
    case "category":
    case "region":
    case "contains":
    case "semantic_future":
    default: {
      if (hay.includes(q)) return true;
      const { places, durationDigits, other } = extractQueryTokens(q);

      if (places.length > 0) {
        // Multi-city / named destinations: require every place token.
        return places.every((p) => hay.includes(p));
      }

      if (other.length > 0) {
        return other.some((p) => hay.includes(p));
      }

      // Duration-only query (no places): match padded day labels in title/duration.
      if (durationDigits.length > 0) {
        return durationDigits.some((n) =>
          new RegExp(`\\b0?${n}\\s*days?\\b`, "i").test(hay)
        );
      }

      return false;
    }
  }
}

/**
 * Collect simple highlight snippets.
 */
export function extractHighlights(haystack: string, query: string): string[] {
  const q = query.trim();
  if (!q) return [];
  const idx = haystack.toLowerCase().indexOf(q.toLowerCase());
  if (idx < 0) return [];
  const start = Math.max(0, idx - 20);
  const end = Math.min(haystack.length, idx + q.length + 20);
  return [haystack.slice(start, end)];
}
