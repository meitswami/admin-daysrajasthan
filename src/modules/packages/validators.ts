import { parseListFilters } from "@/modules/knowledge";

/**
 * Validate CMS package list filters (delegates to Knowledge validators).
 */
export function parseCmsPackageFilters(input: unknown) {
  return parseListFilters(input);
}
