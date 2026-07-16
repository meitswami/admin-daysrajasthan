import type { KnowledgeDomain } from "./types";

/** Maps domain → primary Travel Days table (null = not created yet; services return []). */
export const KNOWLEDGE_DOMAIN_TABLES: Record<KnowledgeDomain, string | null> = {
  destinations: "website_destinations",
  packages: "itineraries",
  places: null,
  activities: null,
  foods: null,
  hotels: "website_hotels",
  weather: null,
  culture: null,
  shopping: null,
  "travel-tips": null,
  faq: "web_pages",
  blogs: "blogs",
};

/** Default list limit when callers omit `limit`. */
export const KNOWLEDGE_DEFAULT_LIST_LIMIT = 100;

/** Cache key prefixes — stable for future Redis/memory adapters. */
export const KNOWLEDGE_CACHE_PREFIX = {
  packages: "knowledge:packages",
  packageById: "knowledge:package:id",
  packageBySlug: "knowledge:package:slug",
  destinations: "knowledge:destinations",
  destinationById: "knowledge:destination:id",
  destinationBySlug: "knowledge:destination:slug",
  hotels: "knowledge:hotels",
  blogs: "knowledge:blogs",
  faqs: "knowledge:faqs",
  context: "knowledge:context",
} as const;

/** Suggested future region codes (documentation only — not hardcoded into APIs). */
export const EXAMPLE_REGION_CODES = [
  "IN-RJ", // Rajasthan
  "IN-HP", // Himachal
  "IN-GA", // Goa
  "IN-JK", // Jammu & Kashmir
  "IN-UK", // Uttarakhand
] as const;
