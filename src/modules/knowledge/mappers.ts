/**
 * Internal mappers: storage / mock shapes → Knowledge DTOs.
 * Not part of the public module API.
 */

import type { Blog, Itinerary } from "@/types/database";
import type { WebsiteContentItem } from "@/types/database";
import type { WebPageSetting } from "@/types/site-settings";

import type {
  BlogRecord,
  DestinationRecord,
  FaqRecord,
  HotelRecord,
  PackageRecord,
} from "./types";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Infer a soft region name from free text without locking APIs to one state. */
function inferRegionName(text: string | null | undefined): string | null {
  if (!text) return null;
  const t = text.toLowerCase();
  if (t.includes("rajasthan") || /(jaipur|udaipur|jodhpur|jaisalmer|pushkar|mount abu|ranthambore)/.test(t)) {
    return "Rajasthan";
  }
  if (t.includes("himachal") || /(manali|shimla|dharamshala)/.test(t)) return "Himachal Pradesh";
  if (t.includes("goa")) return "Goa";
  if (t.includes("kashmir") || t.includes("srinagar")) return "Jammu & Kashmir";
  if (t.includes("uttarakhand") || /(rishikesh|nainital|mussoorie)/.test(t)) return "Uttarakhand";
  return null;
}

function regionCodeFromName(name: string | null): string | null {
  if (!name) return null;
  const map: Record<string, string> = {
    Rajasthan: "IN-RJ",
    "Himachal Pradesh": "IN-HP",
    Goa: "IN-GA",
    "Jammu & Kashmir": "IN-JK",
    Uttarakhand: "IN-UK",
  };
  return map[name] ?? null;
}

/**
 * Map an `itineraries` row (or mock Itinerary) to PackageRecord.
 */
export function mapItineraryToPackage(row: Itinerary): PackageRecord {
  const regionName = inferRegionName(row.destination);
  return {
    id: row.id,
    name: row.package_name,
    slug: row.slug ?? slugify(row.package_name),
    destination: row.destination,
    regionCode: regionCodeFromName(regionName),
    duration: row.package_duration,
    packageType: row.package_type,
    coverImageUrl: row.cover_image_url,
    pdfUrl: row.pdf_url,
    status: row.status,
    displayMode: row.display_mode,
    downloadCount: row.download_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    showOnWebsite: row.show_on_website,
    isTrending: row.is_trending,
  };
}

/**
 * Map a website destination content item to DestinationRecord.
 */
export function mapWebsiteItemToDestination(row: WebsiteContentItem): DestinationRecord {
  const regionName = inferRegionName(row.subtitle) ?? inferRegionName(row.country);
  return {
    id: row.id,
    name: row.name,
    slug: slugify(row.name),
    subtitle: row.subtitle ?? null,
    country: row.country ?? null,
    regionCode: regionCodeFromName(regionName),
    regionName,
    imageUrl: row.image_url ?? null,
    summary: row.subtitle ?? null,
    showOnWebsite: row.show_on_website,
    isTrending: row.is_trending ?? false,
  };
}

/**
 * Map a website hotel content item to HotelRecord.
 */
export function mapWebsiteItemToHotel(row: WebsiteContentItem): HotelRecord {
  const regionName = inferRegionName(row.subtitle) ?? inferRegionName(row.country);
  return {
    id: row.id,
    name: row.name,
    slug: slugify(row.name),
    destinationId: null,
    destinationName: row.subtitle?.split("·")[0]?.trim() ?? null,
    regionCode: regionCodeFromName(regionName),
    category: row.subtitle ?? null,
    imageUrl: row.image_url ?? null,
    showOnWebsite: row.show_on_website,
    isTrending: row.is_trending ?? false,
  };
}

/**
 * Map a blogs row to BlogRecord.
 */
export function mapBlogToRecord(row: Blog): BlogRecord {
  const regionName = inferRegionName(row.title) ?? inferRegionName(row.meta_description);
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    excerpt: row.meta_description,
    contentHtml: row.content_html,
    featuredImageUrl: row.featured_image_url,
    status: row.status,
    publishDate: row.publish_date,
    metaTitle: row.meta_title,
    metaDescription: row.meta_description,
    regionCode: regionCodeFromName(regionName),
  };
}

/**
 * Map FAQ-like web pages (slug contains faq) to FaqRecord list (one page → one FAQ block).
 */
export function mapWebPageToFaq(page: WebPageSetting): FaqRecord | null {
  if (!page.slug.toLowerCase().includes("faq")) return null;
  return {
    id: page.id,
    question: page.title,
    answer: page.content_html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
    slug: page.slug,
    category: "website",
    regionCode: null,
  };
}

/**
 * CMS adapter: PackageRecord → legacy Itinerary view model (presentational CMS only).
 */
export function mapPackageToItineraryView(pkg: PackageRecord): Itinerary {
  return {
    id: pkg.id,
    package_name: pkg.name,
    destination: pkg.destination,
    slug: pkg.slug,
    pdf_url: pkg.pdfUrl,
    cover_image_url: pkg.coverImageUrl,
    package_type: (pkg.packageType as Itinerary["package_type"]) ?? null,
    package_duration: pkg.duration,
    show_on_website: pkg.showOnWebsite,
    is_trending: pkg.isTrending ?? false,
    display_mode: pkg.displayMode,
    status: pkg.status,
    download_count: pkg.downloadCount,
    created_at: pkg.createdAt,
    updated_at: pkg.updatedAt,
  };
}
