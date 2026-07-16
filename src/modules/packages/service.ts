/**
 * Packages CMS facade — admin workflows consume Knowledge Engine packages.
 * Do not query `itineraries` from this module; Knowledge owns catalog reads.
 */

import type { Itinerary } from "@/types/database";

import {
  getPackage,
  getPackageBySlug,
  listPackages,
  mapPackageToItineraryView,
  type KnowledgeListFilters,
  type PackageRecord,
} from "@/modules/knowledge";

/**
 * List packages as Knowledge DTOs (preferred for new code).
 */
export async function listPackageRecords(
  filters: KnowledgeListFilters = {}
): Promise<PackageRecord[]> {
  return listPackages(filters);
}

/**
 * List packages as legacy Itinerary view models for existing CMS UI.
 */
export async function listCmsPackages(
  filters: KnowledgeListFilters = {}
): Promise<Itinerary[]> {
  const records = await listPackages(filters);
  return records.map(mapPackageToItineraryView);
}

/**
 * Get one CMS package view model by id.
 */
export async function getCmsPackage(id: string): Promise<Itinerary | null> {
  const record = await getPackage(id);
  return record ? mapPackageToItineraryView(record) : null;
}

/**
 * Get one CMS package view model by slug.
 */
export async function getCmsPackageBySlug(slug: string): Promise<Itinerary | null> {
  const record = await getPackageBySlug(slug);
  return record ? mapPackageToItineraryView(record) : null;
}
