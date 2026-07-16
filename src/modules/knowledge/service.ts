/**
 * Knowledge service — business logic over repository DTOs.
 * Caching is applied via `withKnowledgeCache` without changing public method signatures.
 */

import { withKnowledgeCache } from "./cache";
import { KNOWLEDGE_CACHE_PREFIX, KNOWLEDGE_DEFAULT_LIST_LIMIT } from "./constants";
import {
  repoGetDestinationById,
  repoGetDestinationBySlug,
  repoGetPackageById,
  repoGetPackageBySlug,
  repoListBlogs,
  repoListDestinations,
  repoListEmptyDomain,
  repoListFaqs,
  repoListHotels,
  repoListPackages,
} from "./repository";
import type {
  ActivityRecord,
  BlogRecord,
  CultureRecord,
  DestinationRecord,
  FaqRecord,
  FoodRecord,
  HotelRecord,
  KnowledgeContextPacket,
  KnowledgeListFilters,
  PackageRecord,
  PlaceRecord,
  ShoppingRecord,
  TravelTipRecord,
  WeatherRecord,
} from "./types";
import { parseKnowledgeId, parseKnowledgeSlug, parseListFilters } from "./validators";

function cacheKey(prefix: string, filters?: KnowledgeListFilters, extra?: string): string {
  const parts = [prefix, extra ?? "", JSON.stringify(filters ?? {})];
  return parts.join(":");
}

function applyTextFilter<T extends { name?: string; title?: string; destination?: string | null }>(
  rows: T[],
  query?: string
): T[] {
  if (!query?.trim()) return rows;
  const q = query.trim().toLowerCase();
  return rows.filter((row) => {
    const hay = [row.name, row.title, row.destination].filter(Boolean).join(" ").toLowerCase();
    return hay.includes(q);
  });
}

function filterByRegion<T extends { regionCode?: string | null }>(
  rows: T[],
  regionCode?: string
): T[] {
  if (!regionCode) return rows;
  return rows.filter((r) => r.regionCode === regionCode);
}

function applyPackageFilters(rows: PackageRecord[], filters: KnowledgeListFilters): PackageRecord[] {
  let next = rows;
  next = filterByRegion(next, filters.regionCode);
  if (filters.showOnWebsiteOnly) next = next.filter((p) => p.showOnWebsite);
  if (filters.trendingOnly) next = next.filter((p) => p.isTrending);
  if (filters.status) next = next.filter((p) => p.status === filters.status);
  next = applyTextFilter(next, filters.query);
  const limit = filters.limit ?? KNOWLEDGE_DEFAULT_LIST_LIMIT;
  return next.slice(0, limit);
}

function applyDestinationFilters(
  rows: DestinationRecord[],
  filters: KnowledgeListFilters
): DestinationRecord[] {
  let next = filterByRegion(rows, filters.regionCode);
  if (filters.showOnWebsiteOnly) next = next.filter((d) => d.showOnWebsite);
  if (filters.trendingOnly) next = next.filter((d) => d.isTrending);
  next = applyTextFilter(next, filters.query);
  return next.slice(0, filters.limit ?? KNOWLEDGE_DEFAULT_LIST_LIMIT);
}

/**
 * List tourism packages (backed by `itineraries`). Region-agnostic filters.
 */
export async function listPackages(filters: KnowledgeListFilters = {}): Promise<PackageRecord[]> {
  const parsed = parseListFilters(filters);
  return withKnowledgeCache(cacheKey(KNOWLEDGE_CACHE_PREFIX.packages, parsed), async () => {
    const rows = await repoListPackages();
    return applyPackageFilters(rows, parsed);
  });
}

/**
 * Get a single package by id.
 */
export async function getPackage(id: string): Promise<PackageRecord | null> {
  const parsedId = parseKnowledgeId(id);
  return withKnowledgeCache(`${KNOWLEDGE_CACHE_PREFIX.packageById}:${parsedId}`, () =>
    repoGetPackageById(parsedId)
  );
}

/**
 * Get a single package by slug.
 */
export async function getPackageBySlug(slug: string): Promise<PackageRecord | null> {
  const parsedSlug = parseKnowledgeSlug(slug);
  return withKnowledgeCache(`${KNOWLEDGE_CACHE_PREFIX.packageBySlug}:${parsedSlug}`, () =>
    repoGetPackageBySlug(parsedSlug)
  );
}

/**
 * List destinations (backed by `website_destinations`).
 */
export async function listDestinations(
  filters: KnowledgeListFilters = {}
): Promise<DestinationRecord[]> {
  const parsed = parseListFilters(filters);
  return withKnowledgeCache(cacheKey(KNOWLEDGE_CACHE_PREFIX.destinations, parsed), async () => {
    const rows = await repoListDestinations();
    return applyDestinationFilters(rows, parsed);
  });
}

/**
 * Get a destination by id.
 */
export async function getDestination(id: string): Promise<DestinationRecord | null> {
  const parsedId = parseKnowledgeId(id);
  return withKnowledgeCache(`${KNOWLEDGE_CACHE_PREFIX.destinationById}:${parsedId}`, () =>
    repoGetDestinationById(parsedId)
  );
}

/**
 * Get a destination by slug.
 */
export async function getDestinationBySlug(slug: string): Promise<DestinationRecord | null> {
  const parsedSlug = parseKnowledgeSlug(slug);
  return withKnowledgeCache(`${KNOWLEDGE_CACHE_PREFIX.destinationBySlug}:${parsedSlug}`, () =>
    repoGetDestinationBySlug(parsedSlug)
  );
}

/**
 * List hotels (backed by `website_hotels`).
 */
export async function listHotels(filters: KnowledgeListFilters = {}): Promise<HotelRecord[]> {
  const parsed = parseListFilters(filters);
  return withKnowledgeCache(cacheKey(KNOWLEDGE_CACHE_PREFIX.hotels, parsed), async () => {
    let rows = await repoListHotels();
    rows = filterByRegion(rows, parsed.regionCode);
    if (parsed.showOnWebsiteOnly) rows = rows.filter((h) => h.showOnWebsite);
    rows = applyTextFilter(rows, parsed.query);
    return rows.slice(0, parsed.limit ?? KNOWLEDGE_DEFAULT_LIST_LIMIT);
  });
}

/**
 * Get a hotel by id.
 */
export async function getHotel(id: string): Promise<HotelRecord | null> {
  const parsedId = parseKnowledgeId(id);
  const hotels = await listHotels();
  return hotels.find((h) => h.id === parsedId) ?? null;
}

/**
 * List blogs (backed by `blogs`).
 */
export async function listBlogs(filters: KnowledgeListFilters = {}): Promise<BlogRecord[]> {
  const parsed = parseListFilters(filters);
  return withKnowledgeCache(cacheKey(KNOWLEDGE_CACHE_PREFIX.blogs, parsed), async () => {
    let rows = await repoListBlogs();
    rows = filterByRegion(rows, parsed.regionCode);
    if (parsed.query?.trim()) {
      const q = parsed.query.trim().toLowerCase();
      rows = rows.filter(
        (b) =>
          b.title.toLowerCase().includes(q) ||
          (b.excerpt?.toLowerCase().includes(q) ?? false)
      );
    }
    return rows.slice(0, parsed.limit ?? KNOWLEDGE_DEFAULT_LIST_LIMIT);
  });
}

/**
 * Get a blog by slug.
 */
export async function getBlogBySlug(slug: string): Promise<BlogRecord | null> {
  const parsedSlug = parseKnowledgeSlug(slug);
  const blogs = await listBlogs();
  return blogs.find((b) => b.slug === parsedSlug) ?? null;
}

/**
 * List FAQ entries (from FAQ web pages).
 */
export async function listFaqs(filters: KnowledgeListFilters = {}): Promise<FaqRecord[]> {
  const parsed = parseListFilters(filters);
  return withKnowledgeCache(cacheKey(KNOWLEDGE_CACHE_PREFIX.faqs, parsed), async () => {
    let rows = await repoListFaqs();
    rows = filterByRegion(rows, parsed.regionCode);
    return rows.slice(0, parsed.limit ?? KNOWLEDGE_DEFAULT_LIST_LIMIT);
  });
}

/**
 * Places — table not yet created; returns [] (API stable for future).
 */
export async function listPlaces(_filters: KnowledgeListFilters = {}): Promise<PlaceRecord[]> {
  return repoListEmptyDomain();
}

/**
 * Activities — table not yet created; returns [] .
 */
export async function listActivities(
  _filters: KnowledgeListFilters = {}
): Promise<ActivityRecord[]> {
  return repoListEmptyDomain();
}

/**
 * Foods — table not yet created; returns [] .
 */
export async function listFoods(_filters: KnowledgeListFilters = {}): Promise<FoodRecord[]> {
  return repoListEmptyDomain();
}

/**
 * Weather — table not yet created; returns [] .
 */
export async function listWeather(_filters: KnowledgeListFilters = {}): Promise<WeatherRecord[]> {
  return repoListEmptyDomain();
}

/**
 * Culture — table not yet created; returns [] .
 */
export async function listCulture(_filters: KnowledgeListFilters = {}): Promise<CultureRecord[]> {
  return repoListEmptyDomain();
}

/**
 * Shopping — table not yet created; returns [] .
 */
export async function listShopping(_filters: KnowledgeListFilters = {}): Promise<ShoppingRecord[]> {
  return repoListEmptyDomain();
}

/**
 * Travel tips — table not yet created; returns [] .
 */
export async function listTravelTips(
  _filters: KnowledgeListFilters = {}
): Promise<TravelTipRecord[]> {
  return repoListEmptyDomain();
}

/**
 * Assemble a grounded context packet for Intelligence (facts only).
 */
export async function buildContextPacket(
  query: string,
  filters: KnowledgeListFilters = {}
): Promise<KnowledgeContextPacket> {
  const parsed = parseListFilters({ ...filters, query });
  return withKnowledgeCache(cacheKey(KNOWLEDGE_CACHE_PREFIX.context, parsed, query), async () => {
    const [
      destinations,
      packages,
      places,
      activities,
      foods,
      hotels,
      weather,
      culture,
      shopping,
      travelTips,
      faqs,
      blogs,
    ] = await Promise.all([
      listDestinations(parsed),
      listPackages(parsed),
      listPlaces(parsed),
      listActivities(parsed),
      listFoods(parsed),
      listHotels(parsed),
      listWeather(parsed),
      listCulture(parsed),
      listShopping(parsed),
      listTravelTips(parsed),
      listFaqs(parsed),
      listBlogs(parsed),
    ]);

    return {
      query,
      regionCode: parsed.regionCode ?? null,
      destinations,
      packages,
      places,
      activities,
      foods,
      hotels,
      weather,
      culture,
      shopping,
      travelTips,
      faqs,
      blogs,
      retrievedAt: new Date().toISOString(),
    };
  });
}
