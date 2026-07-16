/**
 * Quotation Workflow Engine — DTOs independent of storage row shapes.
 * Pricing is never owned by AI; AI may only explain priced results.
 */

import type { ItinerarySnapshot } from "@/types/itinerary-builder";

/** Commercial lifecycle (product status). Stored via mapped persistence. */
export type QuotationStatus =
  | "draft"
  | "generated"
  | "sent"
  | "viewed"
  | "accepted"
  | "rejected"
  | "expired"
  | "cancelled";

export type QuotationSource = "manual" | "knowledge" | "ai_assisted";

export type QuotationId = string;
export type QuotationRevisionId = string;

export type QuotationClient = {
  name: string;
  email: string | null;
  phone: string | null;
  adults: number;
  children: number;
  rooms: number;
  travelDate: string | null;
};

/**
 * Snapshot body reuses the proven itinerary snapshot shape.
 * Quotation engine owns lifecycle; content structure is shared for builder compatibility.
 */
export type QuotationSnapshot = ItinerarySnapshot;

export type QuotationRevision = {
  id: QuotationRevisionId;
  quotationId: QuotationId;
  versionNumber: number;
  parentRevisionId: QuotationRevisionId | null;
  changeSummary: string | null;
  snapshot: QuotationSnapshot;
  createdBy: string;
  createdAt: string;
};

export type QuotationRecord = {
  id: QuotationId;
  quoteCode: string;
  title: string;
  status: QuotationStatus;
  version: number;
  currentRevisionId: QuotationRevisionId;
  client: QuotationClient;
  currency: string;
  grandTotal: number;
  marginPct: number;
  source: QuotationSource;
  /** Knowledge package id when sourced from catalog */
  knowledgePackageId: string | null;
  regionCode: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
};

export type QuotationListFilters = {
  status?: QuotationStatus;
  source?: QuotationSource;
  query?: string;
  limit?: number;
};

export type CreateDraftInput = {
  clientName: string;
  clientEmail?: string | null;
  clientPhone?: string | null;
  title?: string;
  knowledgePackageId?: string | null;
  regionCode?: string | null;
  source?: QuotationSource;
  createdBy?: string;
};

export type GenerateFromKnowledgeInput = {
  packageId: string;
  clientName: string;
  clientEmail?: string | null;
  clientPhone?: string | null;
  adults?: number;
  children?: number;
  rooms?: number;
  travelDate?: string | null;
  createdBy?: string;
};

export type TransitionInput = {
  quotationId: QuotationId;
  toStatus: QuotationStatus;
  actor?: string;
  reason?: string;
};

export type CreateRevisionInput = {
  quotationId: QuotationId;
  snapshot: QuotationSnapshot;
  createdBy: string;
  changeSummary?: string | null;
};

/** JSON payload for Renderer / portals — no React. */
export type QuotationRenderPayload = {
  quotation: QuotationRecord;
  revision: QuotationRevision | null;
  pricing: QuotationPricingSummary;
  lineItems: QuotationPriceLine[];
};

export type QuotationPriceLine = {
  id: string;
  category: string;
  description: string;
  quantity: number;
  unitCost: number;
  total: number;
  dayNumber: number | null;
};

export type QuotationPricingSummary = {
  currency: string;
  subtotal: number;
  markupTotal: number;
  discountTotal: number;
  taxTotal: number;
  grandTotal: number;
  marginPct: number;
  /** Extensibility placeholders for future pricing features */
  adjustments: {
    taxes: number;
    discounts: number;
    coupons: number;
    promotions: number;
    upgrades: number;
    seasonal: number;
  };
};

export type QuotationEventType =
  | "quotation.generated"
  | "quotation.sent"
  | "quotation.viewed"
  | "quotation.accepted"
  | "quotation.rejected"
  | "quotation.expired"
  | "quotation.cancelled"
  | "quotation.revised"
  | "quotation.status_changed";

export type QuotationEvent = {
  id: string;
  type: QuotationEventType;
  quotationId: QuotationId;
  occurredAt: string;
  actor: string | null;
  payload: Record<string, unknown>;
};

export type QuotationEventHandler = (event: QuotationEvent) => void | Promise<void>;
