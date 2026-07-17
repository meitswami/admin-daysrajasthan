import { z } from "zod";

export const intelligenceSurfaceSchema = z.enum([
  "website",
  "admin",
  "customer_portal",
  "team_portal",
  "crm",
  "quotation",
  "whatsapp",
  "voice",
  "mobile",
  "public_api",
]);

export const intelligenceIntentSchema = z.enum([
  "unknown",
  "greet",
  "package_recommend",
  "destination_recommend",
  "travel_plan",
  "compare_packages",
  "explain_destination",
  "suggest_route",
  "hotel_recommend",
  "optimize_plan",
  "summarize",
  "quotation_assist",
  "crm_assist",
  "faq",
  "fallback_browse",
]);

export const providerIdSchema = z.enum([
  "huggingface",
  "github-models",
  "groq",
  "openrouter",
  "local",
  "azure",
  "openai",
  "anthropic",
  "none",
]);

export const extractedEntitySchema = z.object({
  kind: z.enum([
    "destination",
    "package",
    "budget",
    "duration_days",
    "traveler_count",
    "hotel_category",
    "travel_style",
    "month",
    "language",
    "dietary",
    "party",
  ]),
  value: z.string().min(1),
  confidence: z.number().min(0).max(1),
});

export const travelMemoryProfileSchema = z.object({
  customerId: z.string().nullable(),
  preferredBudget: z
    .object({
      min: z.number().optional(),
      max: z.number().optional(),
      currency: z.string().optional(),
    })
    .nullable(),
  preferredHotelCategory: z.string().nullable(),
  preferredDestinations: z.array(z.string()),
  preferredTravelStyle: z.string().nullable(),
  children: z.boolean().nullable(),
  seniorCitizens: z.boolean().nullable(),
  adventure: z.boolean().nullable(),
  luxury: z.boolean().nullable(),
  vegetarian: z.boolean().nullable(),
  travelMonth: z.string().nullable(),
  preferredLanguage: z.string().nullable(),
  notes: z.array(z.string()),
  updatedAt: z.string().nullable(),
});

export const conversationTurnSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  text: z.string(),
});

export const intelligenceRequestSchema = z.object({
  text: z.string().min(1).max(8000),
  surface: intelligenceSurfaceSchema,
  sessionId: z.string().nullable().optional(),
  customerId: z.string().nullable().optional(),
  locale: z.string().nullable().optional(),
  regionCode: z.string().nullable().optional(),
  conversationTurns: z.array(conversationTurnSchema).optional(),
  memory: travelMemoryProfileSchema.nullable().optional(),
  preferredProvider: providerIdSchema.optional(),
  extras: z.record(z.string(), z.unknown()).optional(),
  traceId: z.string().optional(),
});

export const intelligenceBlockSchema = z.object({
  kind: z.enum([
    "message",
    "package_list",
    "destination_list",
    "itinerary_outline",
    "comparison",
    "summary",
    "suggestion",
    "fallback_browse",
    "quotation_hint",
    "crm_hint",
  ]),
  title: z.string().nullable(),
  body: z.string().nullable(),
  refs: z.array(
    z.object({
      kind: z.string(),
      id: z.string(),
      title: z.string(),
    })
  ),
  payload: z.record(z.string(), z.unknown()).nullable(),
});
