/**
 * CRP event definitions — for Analytics, Notifications, AI Memory, WhatsApp, Email, Scheduler.
 * Listeners are intentionally not implemented in Task 08.
 */

export const CRP_EVENT_DEFINITIONS = [
  {
    type: "LeadCreated",
    description: "A new lead entered the platform",
    consumers: ["analytics", "notifications", "ai_memory"],
  },
  {
    type: "InquiryCreated",
    description: "A customer inquiry was recorded",
    consumers: ["analytics", "notifications", "ai_memory"],
  },
  {
    type: "CustomerCreated",
    description: "A customer profile was created or upserted",
    consumers: ["analytics", "crm_sync", "ai_memory"],
  },
  {
    type: "LeadAssigned",
    description: "A lead was assigned to a team member",
    consumers: ["notifications", "scheduler"],
  },
  {
    type: "LeadQualified",
    description: "Lead qualification status changed",
    consumers: ["analytics", "ai_memory"],
  },
  {
    type: "QuotationGenerated",
    description: "A quotation was generated for a customer/lead",
    consumers: ["analytics", "notifications", "ai_memory", "email", "whatsapp"],
  },
  {
    type: "QuotationViewed",
    description: "Customer viewed a quotation",
    consumers: ["analytics", "ai_memory", "followups"],
  },
  {
    type: "QuotationAccepted",
    description: "Customer accepted a quotation",
    consumers: ["analytics", "notifications", "ai_memory", "scheduler"],
  },
  {
    type: "BookingCreated",
    description: "Booking confirmed from an accepted quote",
    consumers: ["analytics", "notifications", "email", "whatsapp"],
  },
  {
    type: "TripCompleted",
    description: "Tour marked completed",
    consumers: ["analytics", "ai_memory", "reviews"],
  },
  {
    type: "ReviewSubmitted",
    description: "Customer submitted a review",
    consumers: ["analytics", "notifications", "ai_memory"],
  },
  {
    type: "CustomerReturned",
    description: "Repeat customer / returning inquiry",
    consumers: ["analytics", "ai_memory", "notifications"],
  },
  {
    type: "CommunicationLogged",
    description: "Email / WhatsApp / phone / chat logged",
    consumers: ["analytics", "ai_memory", "timeline"],
  },
  {
    type: "FollowUpScheduled",
    description: "Follow-up scheduled (scheduler-ready)",
    consumers: ["scheduler", "notifications"],
  },
  {
    type: "FollowUpCompleted",
    description: "Follow-up marked completed",
    consumers: ["analytics", "scheduler"],
  },
] as const;

export type CrpEventType = (typeof CRP_EVENT_DEFINITIONS)[number]["type"];

export type CrpEventDefinition = (typeof CRP_EVENT_DEFINITIONS)[number];

/** Lookup event definition by type. */
export function getCrpEventDefinition(type: CrpEventType): CrpEventDefinition | undefined {
  return CRP_EVENT_DEFINITIONS.find((e) => e.type === type);
}

/** List all CRP event definitions. */
export function listCrpEventDefinitions(): readonly CrpEventDefinition[] {
  return CRP_EVENT_DEFINITIONS;
}
