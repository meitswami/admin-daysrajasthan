import { ModuleError } from "@/modules/shared";

import { knowledgeIdSchema, knowledgeListFiltersSchema, knowledgeSlugSchema } from "./schemas";
import type { KnowledgeListFilters } from "./types";

/**
 * Parse and validate list filters for Knowledge service methods.
 */
export function parseListFilters(input: unknown): KnowledgeListFilters {
  const result = knowledgeListFiltersSchema.safeParse(input ?? {});
  if (!result.success) {
    throw new ModuleError(
      "knowledge",
      "INVALID_FILTERS",
      result.error.issues.map((i) => i.message).join("; ")
    );
  }
  return result.data;
}

/**
 * Validate a knowledge entity id.
 */
export function parseKnowledgeId(value: unknown): string {
  const result = knowledgeIdSchema.safeParse(value);
  if (!result.success) {
    throw new ModuleError("knowledge", "INVALID_ID", `Invalid knowledge id: ${String(value)}`);
  }
  return result.data;
}

/**
 * Validate a knowledge slug.
 */
export function parseKnowledgeSlug(value: unknown): string {
  const result = knowledgeSlugSchema.safeParse(value);
  if (!result.success) {
    throw new ModuleError("knowledge", "INVALID_SLUG", `Invalid slug: ${String(value)}`);
  }
  return result.data;
}
