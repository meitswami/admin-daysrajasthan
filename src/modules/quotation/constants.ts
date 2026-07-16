import type { QuotationStatus } from "./types";

export const QUOTATION_STATUSES: readonly QuotationStatus[] = [
  "draft",
  "generated",
  "sent",
  "viewed",
  "accepted",
  "rejected",
  "expired",
  "cancelled",
] as const;

/**
 * Allowed transitions for the commercial lifecycle.
 * Approval workflow is encoded as generated → sent → viewed → accepted|rejected.
 */
export const QUOTATION_TRANSITIONS: Record<QuotationStatus, readonly QuotationStatus[]> = {
  draft: ["generated", "cancelled"],
  generated: ["sent", "draft", "cancelled"],
  sent: ["viewed", "accepted", "rejected", "expired", "cancelled"],
  viewed: ["accepted", "rejected", "expired", "cancelled"],
  accepted: ["cancelled"],
  rejected: ["draft", "cancelled"],
  expired: ["draft", "cancelled"],
  cancelled: [],
};

export const DEFAULT_QUOTATION_CURRENCY = "INR";
export const DEFAULT_QUOTATION_EXPIRY_DAYS = 14;
export const QUOTATION_DEFAULT_LIST_LIMIT = 100;

/** Maps product status → existing builder workflow_status for persistence reuse. */
export const STATUS_TO_WORKFLOW: Record<
  QuotationStatus,
  | "draft"
  | "sales_review"
  | "client_shared"
  | "client_approved"
  | "archived"
> = {
  draft: "draft",
  generated: "sales_review",
  sent: "client_shared",
  viewed: "client_shared",
  accepted: "client_approved",
  rejected: "archived",
  expired: "archived",
  cancelled: "archived",
};
