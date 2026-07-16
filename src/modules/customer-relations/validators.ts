import { ModuleError } from "@/modules/shared";

import {
  convertLeadInputSchema,
  createAssignmentInputSchema,
  createFollowUpInputSchema,
  createNoteInputSchema,
  crpListFiltersSchema,
  logCommunicationInputSchema,
  qualifyLeadInputSchema,
} from "./schemas";
import type {
  ConvertLeadInput,
  CreateAssignmentInput,
  CreateFollowUpInput,
  CreateNoteInput,
  CrpListFilters,
  LogCommunicationInput,
  QualifyLeadInput,
} from "./types";

function fail(code: string, message: string): never {
  throw new ModuleError("customer-relations", code, message);
}

/** Validate CRP list filters. */
export function parseCrpListFilters(input: unknown): CrpListFilters {
  const result = crpListFiltersSchema.safeParse(input ?? {});
  if (!result.success) fail("INVALID_FILTERS", result.error.message);
  return result.data;
}

/** Validate lead qualification input. */
export function parseQualifyLeadInput(input: unknown): QualifyLeadInput {
  const result = qualifyLeadInputSchema.safeParse(input);
  if (!result.success) fail("INVALID_QUALIFY", result.error.message);
  return result.data;
}

/** Validate lead conversion input. */
export function parseConvertLeadInput(input: unknown): ConvertLeadInput {
  const result = convertLeadInputSchema.safeParse(input);
  if (!result.success) fail("INVALID_CONVERT", result.error.message);
  return result.data;
}

/** Validate communication log input. */
export function parseLogCommunicationInput(input: unknown): LogCommunicationInput {
  const result = logCommunicationInputSchema.safeParse(input);
  if (!result.success) fail("INVALID_COMMUNICATION", result.error.message);
  return result.data;
}

/** Validate assignment create input. */
export function parseCreateAssignmentInput(input: unknown): CreateAssignmentInput {
  const result = createAssignmentInputSchema.safeParse(input);
  if (!result.success) fail("INVALID_ASSIGNMENT", result.error.message);
  return result.data;
}

/** Validate follow-up create input. */
export function parseCreateFollowUpInput(input: unknown): CreateFollowUpInput {
  const result = createFollowUpInputSchema.safeParse(input);
  if (!result.success) fail("INVALID_FOLLOWUP", result.error.message);
  return result.data;
}

/** Validate note create input. */
export function parseCreateNoteInput(input: unknown): CreateNoteInput {
  const result = createNoteInputSchema.safeParse(input);
  if (!result.success) fail("INVALID_NOTE", result.error.message);
  return result.data;
}
