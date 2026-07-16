import type {
  ClientItineraryRecord,
  ItineraryRevision,
  WorkflowStatus,
} from "@/types/itinerary-builder";

import type { QuotationRecord, QuotationRevision, QuotationSource, QuotationStatus } from "./types";

/**
 * Map builder workflow_status → quotation commercial status.
 */
export function workflowToQuotationStatus(workflow: WorkflowStatus): QuotationStatus {
  switch (workflow) {
    case "draft":
      return "draft";
    case "sales_review":
    case "manager_approval":
    case "accounts":
    case "operations":
      return "generated";
    case "client_shared":
      return "sent";
    case "client_approved":
    case "booking_confirmed":
    case "completed":
      return "accepted";
    case "archived":
      return "cancelled";
    default:
      return "draft";
  }
}

/**
 * Infer source from stored fields.
 */
export function inferQuotationSource(record: ClientItineraryRecord): QuotationSource {
  if (record.source_package_id) return "knowledge";
  return "manual";
}

/**
 * Map persisted client itinerary → QuotationRecord DTO.
 */
export function mapRecordToQuotation(
  record: ClientItineraryRecord,
  overrides?: Partial<QuotationRecord>
): QuotationRecord {
  return {
    id: record.id,
    quoteCode: record.quote_id,
    title: record.title,
    status: workflowToQuotationStatus(record.workflow_status),
    version: record.current_version,
    currentRevisionId: record.current_revision_id,
    client: {
      name: record.client_name,
      email: record.client_email,
      phone: record.client_phone,
      adults: record.adults,
      children: record.children,
      rooms: record.rooms,
      travelDate: record.travel_date,
    },
    currency: record.currency,
    grandTotal: record.grand_total,
    marginPct: record.margin_pct,
    source: inferQuotationSource(record),
    knowledgePackageId: record.source_package_id,
    regionCode: null,
    expiresAt: null,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
    createdBy: record.created_by,
    ...overrides,
  };
}

/**
 * Map itinerary revision → QuotationRevision DTO.
 */
export function mapRevisionToQuotationRevision(rev: ItineraryRevision): QuotationRevision {
  return {
    id: rev.id,
    quotationId: rev.itinerary_id,
    versionNumber: rev.version_number,
    parentRevisionId: rev.parent_revision_id,
    changeSummary: rev.change_summary,
    snapshot: rev.snapshot,
    createdBy: rev.created_by,
    createdAt: rev.created_at,
  };
}
