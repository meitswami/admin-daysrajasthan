/**
 * Quotation Workflow Engine — reusable service for Website, Team, Customer, CRM, AI.
 * Pricing is always deterministic via `./pricing`. AI never invents totals.
 */

import { ModuleError } from "@/modules/shared";
import { getPackage } from "@/modules/knowledge";

import {
  DEFAULT_QUOTATION_EXPIRY_DAYS,
  QUOTATION_DEFAULT_LIST_LIMIT,
} from "./constants";
import { emitQuotationEvent, listQuotationEvents } from "./events";
import { listPriceLines, priceSnapshot, summarizePricing } from "./pricing";
import {
  repoCreateDraft,
  repoEmptyPricedSnapshot,
  repoGetCurrentSnapshot,
  repoGetQuotation,
  repoListQuotations,
  repoListRevisions,
  repoSaveRevision,
  repoUpdateStatus,
} from "./repository";
import type {
  CreateDraftInput,
  CreateRevisionInput,
  GenerateFromKnowledgeInput,
  QuotationListFilters,
  QuotationRecord,
  QuotationRenderPayload,
  QuotationRevision,
  QuotationStatus,
  TransitionInput,
} from "./types";
import {
  assertTransitionAllowed,
  parseCreateDraftInput,
  parseCreateRevisionInput,
  parseGenerateFromKnowledgeInput,
  parseQuotationListFilters,
  parseTransitionInput,
} from "./validators";

function refineStatus(record: QuotationRecord): QuotationStatus {
  const events = listQuotationEvents(record.id);
  for (let i = events.length - 1; i >= 0; i -= 1) {
    const type = events[i].type;
    if (type === "quotation.viewed") return "viewed";
    if (type === "quotation.rejected") return "rejected";
    if (type === "quotation.expired") return "expired";
    if (type === "quotation.cancelled") return "cancelled";
    if (type === "quotation.accepted") return "accepted";
    if (type === "quotation.sent") return "sent";
    if (type === "quotation.generated") return "generated";
  }
  return record.status;
}

function withRefinedStatus(record: QuotationRecord): QuotationRecord {
  return { ...record, status: refineStatus(record) };
}

function addExpiry(record: QuotationRecord): QuotationRecord {
  if (record.expiresAt) return record;
  const base = new Date(record.updatedAt);
  base.setDate(base.getDate() + DEFAULT_QUOTATION_EXPIRY_DAYS);
  return { ...record, expiresAt: base.toISOString() };
}

/**
 * List quotations for any consumer portal.
 */
export async function listQuotations(
  filters: QuotationListFilters = {}
): Promise<QuotationRecord[]> {
  const parsed = parseQuotationListFilters(filters);
  let rows = (await repoListQuotations()).map(withRefinedStatus);
  if (parsed.status) rows = rows.filter((r) => r.status === parsed.status);
  if (parsed.source) rows = rows.filter((r) => r.source === parsed.source);
  if (parsed.query?.trim()) {
    const q = parsed.query.trim().toLowerCase();
    rows = rows.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.quoteCode.toLowerCase().includes(q) ||
        r.client.name.toLowerCase().includes(q)
    );
  }
  return rows.slice(0, parsed.limit ?? QUOTATION_DEFAULT_LIST_LIMIT);
}

/**
 * Get a quotation by id.
 */
export async function getQuotation(id: string): Promise<QuotationRecord | null> {
  const record = await repoGetQuotation(id);
  return record ? withRefinedStatus(record) : null;
}

/**
 * List versioned revisions for a quotation.
 */
export async function listQuotationRevisions(
  quotationId: string
): Promise<QuotationRevision[]> {
  return repoListRevisions(quotationId);
}

/**
 * Create a draft quotation (manual or pre-linked to Knowledge).
 */
export async function createDraftQuotation(input: CreateDraftInput): Promise<QuotationRecord> {
  const parsed = parseCreateDraftInput(input);
  const created = await repoCreateDraft(parsed);
  return withRefinedStatus(created);
}

/**
 * Generate a quotation from a Knowledge package (facts from Knowledge; price from pricing service).
 * Ready for AI-assisted drafts: AI may propose narrative later, never totals.
 */
export async function generateQuotationFromKnowledge(
  input: GenerateFromKnowledgeInput
): Promise<QuotationRecord> {
  const parsed = parseGenerateFromKnowledgeInput(input);
  const pkg = await getPackage(parsed.packageId);
  if (!pkg) {
    throw new ModuleError(
      "quotation",
      "PACKAGE_NOT_FOUND",
      `Knowledge package not found: ${parsed.packageId}`
    );
  }

  const draft = await repoCreateDraft({
    clientName: parsed.clientName,
    clientEmail: parsed.clientEmail,
    clientPhone: parsed.clientPhone,
    title: pkg.name,
    knowledgePackageId: pkg.id,
    regionCode: pkg.regionCode,
    source: "knowledge",
    createdBy: parsed.createdBy,
  });

  const snapshot = repoEmptyPricedSnapshot({
    header: {
      title: pkg.name,
      subtitle: pkg.destination,
      tour_code: pkg.slug.toUpperCase().slice(0, 12),
      duration_label: pkg.duration,
      alternate_titles: [],
    },
    client: {
      title: "Mr",
      client_name: parsed.clientName,
      email: parsed.clientEmail ?? null,
      email2: null,
      phone: parsed.clientPhone ?? null,
      adults: parsed.adults ?? 2,
      children_5_12: parsed.children ?? 0,
      children_below_5: 0,
      rooms: parsed.rooms ?? 1,
      extra_beds: 0,
      travel_date: parsed.travelDate ?? null,
      food_preference: null,
      special_requests: null,
    },
    source_package_id: pkg.id,
  });

  const priced = priceSnapshot(snapshot);
  await repoSaveRevision(draft.id, priced, parsed.createdBy ?? draft.createdBy);

  const generated = await repoUpdateStatus(draft.id, "generated");
  if (!generated) {
    throw new ModuleError("quotation", "GENERATE_FAILED", "Failed to mark quotation generated");
  }

  const result = addExpiry(withRefinedStatus({ ...generated, source: "knowledge", knowledgePackageId: pkg.id, regionCode: pkg.regionCode }));

  await emitQuotationEvent(
    "quotation.generated",
    result.id,
    {
      quoteCode: result.quoteCode,
      knowledgePackageId: pkg.id,
      grandTotal: result.grandTotal,
      source: "knowledge",
    },
    parsed.createdBy ?? null
  );

  return result;
}

/**
 * Create a new priced revision (versioning).
 */
export async function createQuotationRevision(
  input: CreateRevisionInput
): Promise<QuotationRevision> {
  const parsed = parseCreateRevisionInput(input);
  const existing = await getQuotation(parsed.quotationId);
  if (!existing) {
    throw new ModuleError("quotation", "NOT_FOUND", `Quotation not found: ${parsed.quotationId}`);
  }

  const priced = priceSnapshot(parsed.snapshot);
  const revision = await repoSaveRevision(
    parsed.quotationId,
    priced,
    parsed.createdBy
  );
  if (!revision) {
    throw new ModuleError("quotation", "REVISION_FAILED", "Could not save revision");
  }

  await emitQuotationEvent(
    "quotation.revised",
    parsed.quotationId,
    {
      revisionId: revision.id,
      versionNumber: revision.versionNumber,
      grandTotal: summarizePricing(priced).grandTotal,
      changeSummary: parsed.changeSummary ?? revision.changeSummary,
    },
    parsed.createdBy
  );

  return {
    ...revision,
    changeSummary: parsed.changeSummary ?? revision.changeSummary,
  };
}

/**
 * Transition quotation commercial status with lifecycle validation + events.
 */
export async function transitionQuotationStatus(
  input: TransitionInput
): Promise<QuotationRecord> {
  const parsed = parseTransitionInput(input);
  const current = await getQuotation(parsed.quotationId);
  if (!current) {
    throw new ModuleError("quotation", "NOT_FOUND", `Quotation not found: ${parsed.quotationId}`);
  }

  assertTransitionAllowed(current.status, parsed.toStatus);
  const updated = await repoUpdateStatus(parsed.quotationId, parsed.toStatus);
  if (!updated) {
    throw new ModuleError("quotation", "TRANSITION_FAILED", "Persistence failed");
  }

  let result = withRefinedStatus({ ...updated, status: parsed.toStatus });
  if (parsed.toStatus === "generated" || parsed.toStatus === "sent") {
    result = addExpiry(result);
  }

  await emitQuotationEvent(
    "quotation.status_changed",
    result.id,
    { from: current.status, to: parsed.toStatus, reason: parsed.reason ?? null },
    parsed.actor ?? null
  );

  const typedEvent =
    parsed.toStatus === "generated"
      ? "quotation.generated"
      : parsed.toStatus === "sent"
        ? "quotation.sent"
        : parsed.toStatus === "viewed"
          ? "quotation.viewed"
          : parsed.toStatus === "accepted"
            ? "quotation.accepted"
            : parsed.toStatus === "rejected"
              ? "quotation.rejected"
              : parsed.toStatus === "expired"
                ? "quotation.expired"
                : parsed.toStatus === "cancelled"
                  ? "quotation.cancelled"
                  : null;

  if (typedEvent) {
    await emitQuotationEvent(
      typedEvent,
      result.id,
      { quoteCode: result.quoteCode, grandTotal: result.grandTotal },
      parsed.actor ?? null
    );
  }

  return result;
}

/**
 * Convenience: mark quotation sent.
 */
export async function markQuotationSent(quotationId: string, actor?: string) {
  return transitionQuotationStatus({ quotationId, toStatus: "sent", actor });
}

/**
 * Convenience: mark quotation viewed (customer portal).
 */
export async function markQuotationViewed(quotationId: string, actor?: string) {
  return transitionQuotationStatus({ quotationId, toStatus: "viewed", actor });
}

/**
 * Convenience: accept quotation.
 */
export async function acceptQuotation(quotationId: string, actor?: string) {
  return transitionQuotationStatus({ quotationId, toStatus: "accepted", actor });
}

/**
 * Convenience: reject quotation.
 */
export async function rejectQuotation(quotationId: string, actor?: string, reason?: string) {
  return transitionQuotationStatus({ quotationId, toStatus: "rejected", actor, reason });
}

/**
 * Build Renderer-ready payload (JSON only — presentation stays in renderer module).
 */
export async function buildQuotationRenderPayload(
  quotationId: string
): Promise<QuotationRenderPayload | null> {
  const quotation = await getQuotation(quotationId);
  if (!quotation) return null;
  const revisions = await listQuotationRevisions(quotationId);
  const revision =
    revisions.find((r) => r.id === quotation.currentRevisionId) ?? revisions[0] ?? null;
  const snapshot = (await repoGetCurrentSnapshot(quotationId)) ?? revision?.snapshot;
  if (!snapshot) {
    return {
      quotation,
      revision,
      pricing: {
        currency: quotation.currency,
        subtotal: 0,
        markupTotal: 0,
        discountTotal: 0,
        taxTotal: 0,
        grandTotal: quotation.grandTotal,
        marginPct: quotation.marginPct,
        adjustments: {
          taxes: 0,
          discounts: 0,
          coupons: 0,
          promotions: 0,
          upgrades: 0,
          seasonal: 0,
        },
      },
      lineItems: [],
    };
  }

  const priced = priceSnapshot(snapshot);
  return {
    quotation,
    revision,
    pricing: summarizePricing(priced),
    lineItems: listPriceLines(priced),
  };
}
