import type { IntelligenceContext, IntelligenceRequest, IntelligenceSurface, TravelMemoryProfile } from "../types";

/**
 * One builder for Website, CRM, Quotation, Customer Portal, WhatsApp, etc.
 */
export function buildIntelligenceContext(
  request: IntelligenceRequest,
  memory: TravelMemoryProfile | null
): IntelligenceContext {
  return {
    surface: request.surface,
    sessionId: request.sessionId ?? null,
    customerId: request.customerId ?? null,
    locale: request.locale ?? null,
    regionCode: request.regionCode ?? null,
    conversationTurns: request.conversationTurns ?? [],
    memory,
    extras: request.extras ?? {},
  };
}

export function describeSurface(surface: IntelligenceSurface): string {
  switch (surface) {
    case "website":
      return "Public website travel assistant";
    case "admin":
      return "Admin operations assistant";
    case "customer_portal":
      return "Authenticated customer portal assistant";
    case "team_portal":
      return "Internal team assistant";
    case "crm":
      return "CRM / lead assist";
    case "quotation":
      return "Quotation assist (never invent prices)";
    case "whatsapp":
      return "WhatsApp channel assistant";
    case "voice":
      return "Voice channel assistant";
    case "mobile":
      return "Mobile app assistant";
    case "public_api":
      return "Public API consumer";
    default:
      return "Travel assistant";
  }
}

export const SUBMODULE = {
  parent: "intelligence" as const,
  id: "context-builder" as const,
  description: "Reusable context objects for every consumer surface",
} as const;
