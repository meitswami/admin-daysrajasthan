import type { CustomerLifecycleStage, LeadQualificationStatus } from "./types";

export const CUSTOMER_LIFECYCLE_STAGES: readonly CustomerLifecycleStage[] = [
  "visitor",
  "lead",
  "inquiry",
  "qualified_lead",
  "quotation",
  "negotiation",
  "booking",
  "payment",
  "traveler",
  "completed_tour",
  "review",
  "repeat_customer",
] as const;

/** Qualification → default lifecycle mapping. */
export const QUALIFICATION_TO_LIFECYCLE: Record<
  LeadQualificationStatus,
  CustomerLifecycleStage
> = {
  new: "lead",
  contacted: "inquiry",
  qualified: "qualified_lead",
  disqualified: "lead",
  converted: "quotation",
  closed: "lead",
};

export const CRP_DEFAULT_LIST_LIMIT = 100;

export const CRP_CACHE_PREFIX = {
  leads: "crp:leads",
  customers: "crp:customers",
  timeline: "crp:timeline",
  inquiries: "crp:inquiries",
} as const;
