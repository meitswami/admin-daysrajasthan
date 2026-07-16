import type { ProviderId, TravelMemoryProfile } from "./types";

export const INTELLIGENCE_MODULE_ID = "intelligence" as const;

export const DEFAULT_PROVIDER_ORDER: ProviderId[] = [
  "huggingface",
  "github-models",
  "openrouter",
  "openai",
  "anthropic",
  "azure",
  "local",
];

export const INTELLIGENCE_CACHE_PREFIX = "intelligence:v1:";

export const MAX_RETRIEVED_HITS = 12;
export const MAX_PROMPT_FACT_CHARS = 4000;

export const EMPTY_TRAVEL_MEMORY = (customerId: string | null = null): TravelMemoryProfile => ({
  customerId,
  preferredBudget: null,
  preferredHotelCategory: null,
  preferredDestinations: [],
  preferredTravelStyle: null,
  children: null,
  seniorCitizens: null,
  adventure: null,
  luxury: null,
  vegetarian: null,
  travelMonth: null,
  preferredLanguage: null,
  notes: [],
  updatedAt: null,
});

/** Soft cues for rule-based intent detection (not facts). */
export const INTENT_CUES: Record<string, string[]> = {
  greet: ["hello", "hi", "namaste", "hey"],
  package_recommend: ["package", "tour", "trip package", "recommend package"],
  destination_recommend: ["destination", "where to go", "place to visit", "city"],
  travel_plan: ["itinerary", "plan", "days", "schedule", "route"],
  compare_packages: ["compare", "vs", "versus", "difference between"],
  explain_destination: ["tell me about", "explain", "what is"],
  hotel_recommend: ["hotel", "stay", "resort", "accommodation"],
  optimize_plan: ["optimize", "improve", "better plan", "refine"],
  summarize: ["summarize", "summary", "brief"],
  quotation_assist: ["quote", "quotation", "price quote", "proposal"],
  crm_assist: ["lead", "follow up", "customer note", "crm"],
  faq: ["policy", "visa", "faq", "how do i"],
};

export const AI_MUST_NOT = [
  "Invent prices",
  "Invent package inclusions",
  "Invent destinations",
  "Invent hotels",
  "Invent weather",
  "Invent availability",
  "Invent policies",
  "Invent distances",
] as const;

export const AI_MAY = [
  "Generate itineraries from retrieved facts",
  "Compare packages from retrieved facts",
  "Explain destinations from retrieved facts",
  "Suggest routes from retrieved facts",
  "Recommend hotels from retrieved facts",
  "Optimize travel plans narratively",
  "Generate summaries",
  "Generate beautiful prose (non-factual)",
] as const;
