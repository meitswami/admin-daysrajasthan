/**
 * Quotation repository — persistence via existing client_itineraries / revisions store.
 * Never exposes raw rows through the public quotation API (mappers convert to DTOs).
 */

import { emptySnapshot } from "@/lib/itinerary-builder/defaults";
import {
  createClientItineraryFromWizard,
  getClientItinerary,
  getCurrentSnapshot,
  getRevisions,
  listClientItineraries,
  saveSnapshotRevision,
  updateWorkflowStatus,
} from "@/lib/itinerary-builder/storage";
import type { ItinerarySnapshot } from "@/types/itinerary-builder";

import { STATUS_TO_WORKFLOW } from "./constants";
import { mapRecordToQuotation, mapRevisionToQuotationRevision } from "./mappers";
import { priceSnapshot } from "./pricing";
import type {
  CreateDraftInput,
  QuotationRecord,
  QuotationRevision,
  QuotationSnapshot,
  QuotationStatus,
} from "./types";

/**
 * List quotations from storage as DTOs.
 */
export async function repoListQuotations(): Promise<QuotationRecord[]> {
  return listClientItineraries().map((r) => mapRecordToQuotation(r));
}

/**
 * Get quotation by id.
 */
export async function repoGetQuotation(id: string): Promise<QuotationRecord | null> {
  const record = getClientItinerary(id);
  return record ? mapRecordToQuotation(record) : null;
}

/**
 * List revisions for a quotation.
 */
export async function repoListRevisions(quotationId: string): Promise<QuotationRevision[]> {
  return getRevisions(quotationId).map(mapRevisionToQuotationRevision);
}

/**
 * Get current revision snapshot.
 */
export async function repoGetCurrentSnapshot(
  quotationId: string
): Promise<QuotationSnapshot | null> {
  return getCurrentSnapshot(quotationId);
}

/**
 * Create a draft quotation record.
 */
export async function repoCreateDraft(input: CreateDraftInput): Promise<QuotationRecord> {
  const record = createClientItineraryFromWizard({
    client: {
      client_name: input.clientName,
      email: input.clientEmail ?? null,
      phone: input.clientPhone ?? null,
      title: "Mr",
    },
    packageId: input.knowledgePackageId ?? null,
    categoryKeys: [],
    title: input.title ?? `Quote for ${input.clientName}`,
    created_by: input.createdBy,
    owner_name: input.createdBy,
  });

  const mapped = mapRecordToQuotation(record, {
    source: input.source ?? (input.knowledgePackageId ? "knowledge" : "manual"),
    knowledgePackageId: input.knowledgePackageId ?? null,
    regionCode: input.regionCode ?? null,
    createdBy: input.createdBy ?? record.created_by,
  });
  return mapped;
}

/**
 * Persist a new priced revision.
 */
export async function repoSaveRevision(
  quotationId: string,
  snapshot: QuotationSnapshot,
  _createdBy: string
): Promise<QuotationRevision | null> {
  const priced = priceSnapshot(snapshot);
  const result = saveSnapshotRevision(quotationId, priced, {
    save_type: "manual",
  });
  return result ? mapRevisionToQuotationRevision(result.revision) : null;
}

/**
 * Persist commercial status via mapped workflow_status.
 */
export async function repoUpdateStatus(
  quotationId: string,
  status: QuotationStatus
): Promise<QuotationRecord | null> {
  const workflow = STATUS_TO_WORKFLOW[status];
  const updated = updateWorkflowStatus(quotationId, workflow);
  if (!updated) return null;
  return mapRecordToQuotation(updated, { status });
}

/**
 * Build an empty priced snapshot shell for drafts.
 */
export function repoEmptyPricedSnapshot(
  partial?: Partial<ItinerarySnapshot>
): QuotationSnapshot {
  return priceSnapshot(emptySnapshot(partial));
}
