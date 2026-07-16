import { ModuleError } from "@/modules/shared";

import { QUOTATION_TRANSITIONS } from "./constants";
import {
  createDraftInputSchema,
  createRevisionInputSchema,
  generateFromKnowledgeInputSchema,
  quotationListFiltersSchema,
  transitionInputSchema,
} from "./schemas";
import type {
  CreateDraftInput,
  CreateRevisionInput,
  GenerateFromKnowledgeInput,
  QuotationListFilters,
  QuotationStatus,
  TransitionInput,
} from "./types";

/**
 * Validate list filters.
 */
export function parseQuotationListFilters(input: unknown): QuotationListFilters {
  const result = quotationListFiltersSchema.safeParse(input ?? {});
  if (!result.success) {
    throw new ModuleError("quotation", "INVALID_FILTERS", result.error.message);
  }
  return result.data;
}

/**
 * Validate create-draft payload.
 */
export function parseCreateDraftInput(input: unknown): CreateDraftInput {
  const result = createDraftInputSchema.safeParse(input);
  if (!result.success) {
    throw new ModuleError("quotation", "INVALID_DRAFT", result.error.message);
  }
  return result.data;
}

/**
 * Validate generate-from-knowledge payload.
 */
export function parseGenerateFromKnowledgeInput(input: unknown): GenerateFromKnowledgeInput {
  const result = generateFromKnowledgeInputSchema.safeParse(input);
  if (!result.success) {
    throw new ModuleError("quotation", "INVALID_GENERATE", result.error.message);
  }
  return result.data;
}

/**
 * Validate status transition payload.
 */
export function parseTransitionInput(input: unknown): TransitionInput {
  const result = transitionInputSchema.safeParse(input);
  if (!result.success) {
    throw new ModuleError("quotation", "INVALID_TRANSITION", result.error.message);
  }
  return result.data;
}

/**
 * Validate revision create payload (snapshot validated structurally at service boundary).
 */
export function parseCreateRevisionInput(input: unknown): CreateRevisionInput {
  const result = createRevisionInputSchema.safeParse(input);
  if (!result.success) {
    throw new ModuleError("quotation", "INVALID_REVISION", result.error.message);
  }
  return {
    quotationId: result.data.quotationId,
    createdBy: result.data.createdBy,
    changeSummary: result.data.changeSummary ?? null,
    snapshot: result.data.snapshot as unknown as CreateRevisionInput["snapshot"],
  };
}

/**
 * Ensure a status transition is allowed by the lifecycle graph.
 */
export function assertTransitionAllowed(from: QuotationStatus, to: QuotationStatus): void {
  const allowed = QUOTATION_TRANSITIONS[from];
  if (!allowed.includes(to)) {
    throw new ModuleError(
      "quotation",
      "TRANSITION_DENIED",
      `Cannot transition quotation from "${from}" to "${to}"`
    );
  }
}
