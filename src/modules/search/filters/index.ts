/**
 * Filter helpers for TravelDays search (budget, duration, region, style, …).
 */

import type { PackageRecord } from "@/modules/knowledge";

import type { SearchFilters, SearchMatchMode } from "../types";

/**
 * Parse approximate night/day count from duration labels like "3 Days 2 Nights".
 */
export function parseDurationDays(label: string | null | undefined): number | null {
  if (!label) return null;
  const m = label.match(/(\d+)\s*Days?/i);
  return m ? Number(m[1]) : null;
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

    const days = parseDurationDays(pkg.duration);
    if (filters.durationDaysMin != null && days != null && days < filters.durationDaysMin) {
      return false;
    }
    if (filters.durationDaysMax != null && days != null && days > filters.durationDaysMax) {
      return false;
    }
    // Budget filters reserved: PackageRecord has no price — no-op until Knowledge exposes list price
    return true;
  });
}

/**
 * Text match against a haystack using the requested mode.
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
      // Natural-language queries: match if any meaningful token appears
      // (full-string includes fails for "explore rajasthan" vs "Jaipur Heritage Tour").
      if (hay.includes(q)) return true;
      const stop = new Set([
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
        "explore",
        "looking",
        "please",
        "days",
        "day",
        "nights",
        "night",
        "trip",
        "tour",
        "package",
        "packages",
      ]);
      const parts = q.split(/[^a-z0-9]+/).filter((p) => p.length > 2 && !stop.has(p));
      if (!parts.length) return false;
      return parts.some((p) => hay.includes(p));
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
