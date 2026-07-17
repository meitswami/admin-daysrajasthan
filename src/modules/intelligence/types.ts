/**
 * Travel Intelligence Engine — structured DTOs only.
 * Never HTML / Markdown. Presentation belongs to Renderer.
 */

import type { SearchHit, SearchResult } from "@/modules/search";

export type IntelligenceSurface =
  | "website"
  | "admin"
  | "customer_portal"
  | "team_portal"
  | "crm"
  | "quotation"
  | "whatsapp"
  | "voice"
  | "mobile"
  | "public_api";

export type IntelligenceIntent =
  | "unknown"
  | "greet"
  | "package_recommend"
  | "destination_recommend"
  | "travel_plan"
  | "compare_packages"
  | "explain_destination"
  | "suggest_route"
  | "hotel_recommend"
  | "optimize_plan"
  | "summarize"
  | "quotation_assist"
  | "crm_assist"
  | "faq"
  | "fallback_browse";

export type ExtractedEntityKind =
  | "destination"
  | "package"
  | "budget"
  | "duration_days"
  | "traveler_count"
  | "hotel_category"
  | "travel_style"
  | "month"
  | "language"
  | "dietary"
  | "party";

export type ExtractedEntity = {
  kind: ExtractedEntityKind;
  value: string;
  confidence: number;
};

export type TravelMemoryProfile = {
  customerId: string | null;
  preferredBudget: { min?: number; max?: number; currency?: string } | null;
  preferredHotelCategory: string | null;
  preferredDestinations: string[];
  preferredTravelStyle: string | null;
  children: boolean | null;
  seniorCitizens: boolean | null;
  adventure: boolean | null;
  luxury: boolean | null;
  vegetarian: boolean | null;
  travelMonth: string | null;
  preferredLanguage: string | null;
  notes: string[];
  updatedAt: string | null;
};

export type IntelligenceContext = {
  surface: IntelligenceSurface;
  sessionId: string | null;
  customerId: string | null;
  locale: string | null;
  regionCode: string | null;
  conversationTurns: { role: "user" | "assistant" | "system"; text: string }[];
  memory: TravelMemoryProfile | null;
  extras: Record<string, unknown>;
};

export type PlannerNeeds = {
  needAi: boolean;
  needSearch: boolean;
  needKnowledgeViaSearch: boolean;
  needQuotation: boolean;
  needCustomerData: boolean;
  needTravelMemory: boolean;
  searchKinds: Array<"package" | "destination" | "knowledge" | "customer" | "lead" | "quotation" | "global">;
  searchQueryText: string;
  reason: string;
};

export type PlannerDecision = {
  intent: IntelligenceIntent;
  entities: ExtractedEntity[];
  needs: PlannerNeeds;
  confidence: number;
};

export type ProviderId =
  | "huggingface"
  | "github-models"
  | "groq"
  | "openrouter"
  | "local"
  | "azure"
  | "openai"
  | "anthropic"
  | "none";

export type ProviderMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type ProviderPrompt = {
  messages: ProviderMessage[];
  temperature?: number;
  maxTokens?: number;
  responseFormat?: "json";
};

export type ProviderResult = {
  providerId: ProviderId;
  rawText: string;
  usage?: { promptTokens?: number; completionTokens?: number };
  latencyMs: number;
};

export type ProviderAdapter = {
  id: ProviderId;
  isAvailable: () => Promise<boolean> | boolean;
  complete: (prompt: ProviderPrompt) => Promise<ProviderResult>;
};

/** Grounded facts from Search only — no invented rows. */
export type RetrievedFacts = {
  search: SearchResult | null;
  hits: SearchHit[];
  retrievedAt: string;
};

export type IntelligenceBlockKind =
  | "message"
  | "package_list"
  | "destination_list"
  | "itinerary_outline"
  | "comparison"
  | "summary"
  | "suggestion"
  | "fallback_browse"
  | "quotation_hint"
  | "crm_hint";

export type IntelligenceBlock = {
  kind: IntelligenceBlockKind;
  title: string | null;
  body: string | null;
  refs: { kind: string; id: string; title: string }[];
  payload: Record<string, unknown> | null;
};

/**
 * Sole product contract for AI output — DTO only.
 */
export type IntelligenceResult = {
  success: boolean;
  intent: IntelligenceIntent;
  entities: ExtractedEntity[];
  blocks: IntelligenceBlock[];
  facts: RetrievedFacts;
  plan: PlannerDecision;
  provider: ProviderId;
  usedFallback: boolean;
  warnings: string[];
  traceId: string;
  durationMs: number;
  timestamp: string;
};

export type IntelligenceRequest = {
  text: string;
  surface: IntelligenceSurface;
  sessionId?: string | null;
  customerId?: string | null;
  locale?: string | null;
  regionCode?: string | null;
  conversationTurns?: IntelligenceContext["conversationTurns"];
  memory?: TravelMemoryProfile | null;
  /** Prefer a provider; engine may still fall back. */
  preferredProvider?: ProviderId;
  extras?: Record<string, unknown>;
  traceId?: string;
};

export type GroundingIssue = {
  code: string;
  message: string;
  field?: string;
};

export type IntelligenceLogRecord = {
  level: "debug" | "info" | "warn" | "error";
  message: string;
  traceId: string;
  surface?: IntelligenceSurface;
  intent?: IntelligenceIntent;
  provider?: ProviderId;
  durationMs?: number;
  meta?: Record<string, unknown>;
};

export type IntelligenceMetricSample = {
  surface: IntelligenceSurface;
  intent: IntelligenceIntent;
  provider: ProviderId;
  usedFallback: boolean;
  durationMs: number;
  success: boolean;
};
