/**
 * Knowledge repository — sole access to tourism catalog storage.
 * Returns DTOs only (mapped). Never export raw rows from this module's public API.
 */

import { DATA_SOURCE } from "@/lib/data";
import * as mock from "@/lib/data/mock-data";
import { DEFAULT_SITE_SETTINGS } from "@/lib/data/default-site-settings";
import {
  destinations as mockDestinations,
  hotels as mockHotels,
} from "@/lib/data/website-content";
import * as queries from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import type { WebsiteContentItem } from "@/types/database";

import {
  mapBlogToRecord,
  mapItineraryToPackage,
  mapWebPageToFaq,
  mapWebsiteItemToDestination,
  mapWebsiteItemToHotel,
} from "./mappers";
import type {
  BlogRecord,
  DestinationRecord,
  FaqRecord,
  HotelRecord,
  PackageRecord,
} from "./types";

function useSupabase(): boolean {
  return DATA_SOURCE === "supabase";
}

async function fetchWebsiteRows(table: string): Promise<WebsiteContentItem[]> {
  if (!useSupabase()) {
    if (table === "website_destinations") return mockDestinations;
    if (table === "website_hotels") return mockHotels;
    return [];
  }
  const supabase = await createClient();
  const { data, error } = await supabase.from(table).select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return (data as WebsiteContentItem[]) ?? [];
}

/**
 * Load all package records from `itineraries` (or mock).
 */
export async function repoListPackages(): Promise<PackageRecord[]> {
  const rows = useSupabase() ? await queries.fetchItineraries() : mock.itineraries;
  return rows.map(mapItineraryToPackage);
}

/**
 * Load a single package by id.
 */
export async function repoGetPackageById(id: string): Promise<PackageRecord | null> {
  if (!useSupabase()) {
    const row = mock.itineraries.find((i) => i.id === id);
    return row ? mapItineraryToPackage(row) : null;
  }
  const supabase = await createClient();
  const { data, error } = await supabase.from("itineraries").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? mapItineraryToPackage(data) : null;
}

/**
 * Load a single package by slug.
 */
export async function repoGetPackageBySlug(slug: string): Promise<PackageRecord | null> {
  if (!useSupabase()) {
    const row = mock.itineraries.find((i) => i.slug === slug);
    return row ? mapItineraryToPackage(row) : null;
  }
  const supabase = await createClient();
  const { data, error } = await supabase.from("itineraries").select("*").eq("slug", slug).maybeSingle();
  if (error) throw error;
  return data ? mapItineraryToPackage(data) : null;
}

/**
 * Load destination records from `website_destinations`.
 */
export async function repoListDestinations(): Promise<DestinationRecord[]> {
  const rows = await fetchWebsiteRows("website_destinations");
  return rows.map(mapWebsiteItemToDestination);
}

/**
 * Load destination by id.
 */
export async function repoGetDestinationById(id: string): Promise<DestinationRecord | null> {
  const all = await repoListDestinations();
  return all.find((d) => d.id === id) ?? null;
}

/**
 * Load destination by slug.
 */
export async function repoGetDestinationBySlug(slug: string): Promise<DestinationRecord | null> {
  const all = await repoListDestinations();
  return all.find((d) => d.slug === slug) ?? null;
}

/**
 * Load hotel records from `website_hotels`.
 */
export async function repoListHotels(): Promise<HotelRecord[]> {
  const rows = await fetchWebsiteRows("website_hotels");
  return rows.map(mapWebsiteItemToHotel);
}

/**
 * Load blog records from `blogs`.
 */
export async function repoListBlogs(): Promise<BlogRecord[]> {
  const rows = useSupabase() ? await queries.fetchBlogs() : mock.blogs;
  return rows.map(mapBlogToRecord);
}

/**
 * Load FAQ records derived from FAQ web pages (`web_pages` / site settings).
 */
export async function repoListFaqs(): Promise<FaqRecord[]> {
  if (!useSupabase()) {
    return DEFAULT_SITE_SETTINGS.webPages
      .map(mapWebPageToFaq)
      .filter((f): f is FaqRecord => f !== null);
  }
  const supabase = await createClient();
  const { data, error } = await supabase.from("web_pages").select("*");
  if (error) throw error;
  return (data ?? [])
    .map((row) =>
      mapWebPageToFaq({
        id: row.id,
        slug: row.slug,
        label: row.label ?? row.title,
        title: row.title,
        content_html: row.content_html ?? "",
        is_published: row.is_published ?? true,
      })
    )
    .filter((f): f is FaqRecord => f !== null);
}

/**
 * Domains without tables yet — repository returns empty lists (ready for future migrations).
 */
export async function repoListEmptyDomain(): Promise<never[]> {
  return [];
}
