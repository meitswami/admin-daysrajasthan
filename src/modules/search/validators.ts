import { ModuleError } from "@/modules/shared";

import { searchQuerySchema } from "./schemas";
import type { SearchQuery } from "./types";

/**
 * Validate a search query payload.
 */
export function parseSearchQuery(input: unknown): SearchQuery {
  const result = searchQuerySchema.safeParse(input);
  if (!result.success) {
    throw new ModuleError("search", "INVALID_QUERY", result.error.message);
  }
  return result.data;
}
