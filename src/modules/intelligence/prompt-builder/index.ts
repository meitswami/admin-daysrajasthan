import { AI_MAY, AI_MUST_NOT, MAX_PROMPT_FACT_CHARS } from "../constants";
import { describeSurface } from "../context-builder";
import type {
  IntelligenceContext,
  PlannerDecision,
  ProviderPrompt,
  RetrievedFacts,
} from "../types";

function serializeFacts(facts: RetrievedFacts): string {
  if (!facts.hits.length) {
    return "No retrieved catalog facts. Do not invent destinations, packages, hotels, or prices.";
  }
  const lines = facts.hits.map((hit, i) => {
    const bits = [
      `${i + 1}. [${hit.kind}] id=${hit.id}`,
      `title=${hit.title}`,
      hit.subtitle ? `subtitle=${hit.subtitle}` : null,
      hit.highlights.length ? `highlights=${hit.highlights.join(" | ")}` : null,
    ].filter(Boolean);
    return bits.join(" · ");
  });
  const joined = lines.join("\n");
  return joined.length > MAX_PROMPT_FACT_CHARS
    ? `${joined.slice(0, MAX_PROMPT_FACT_CHARS)}\n…(truncated)`
    : joined;
}

function serializeMemory(ctx: IntelligenceContext): string {
  if (!ctx.memory) return "Travel memory: none (optional).";
  const m = ctx.memory;
  return [
    "Travel memory (preferences only — not facts):",
    m.preferredBudget ? `budget=${JSON.stringify(m.preferredBudget)}` : null,
    m.preferredHotelCategory ? `hotelCategory=${m.preferredHotelCategory}` : null,
    m.preferredDestinations.length
      ? `destinations=${m.preferredDestinations.join(", ")}`
      : null,
    m.preferredTravelStyle ? `style=${m.preferredTravelStyle}` : null,
    m.children != null ? `children=${m.children}` : null,
    m.seniorCitizens != null ? `seniors=${m.seniorCitizens}` : null,
    m.adventure != null ? `adventure=${m.adventure}` : null,
    m.luxury != null ? `luxury=${m.luxury}` : null,
    m.vegetarian != null ? `vegetarian=${m.vegetarian}` : null,
    m.travelMonth ? `month=${m.travelMonth}` : null,
    m.preferredLanguage ? `language=${m.preferredLanguage}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Provider-neutral prompts from intent + entities + Search facts + memory + context.
 */
export function buildProviderPrompt(input: {
  userText: string;
  context: IntelligenceContext;
  plan: PlannerDecision;
  facts: RetrievedFacts;
}): ProviderPrompt {
  const { userText, context, plan, facts } = input;
  const system = [
    "You are the Travel Days Intelligence Engine.",
    `Surface: ${describeSurface(context.surface)}.`,
    "Return structured travel assistance as plain text suitable for JSON formatting.",
    "Never return HTML or Markdown fences as the product contract.",
    "",
    "You MAY:",
    ...AI_MAY.map((x) => `- ${x}`),
    "",
    "You MUST NEVER:",
    ...AI_MUST_NOT.map((x) => `- ${x}`),
    "",
    "All factual claims must come only from RETRIEVED FACTS below.",
    "If facts are missing, say so and suggest browsing retrieved candidates.",
  ].join("\n");

  const user = [
    `Intent: ${plan.intent} (confidence=${plan.confidence.toFixed(2)})`,
    `Entities: ${JSON.stringify(plan.entities)}`,
    serializeMemory(context),
    "",
    "RETRIEVED FACTS (from Search → Knowledge):",
    serializeFacts(facts),
    "",
    `User message: ${userText}`,
    "",
    "Respond with a concise travel assist narrative that only references retrieved ids/titles.",
  ].join("\n");

  return {
    messages: [
      { role: "system", content: system },
      ...context.conversationTurns.slice(-6).map((t) => ({
        role: t.role === "assistant" ? ("assistant" as const) : ("user" as const),
        content: t.text,
      })),
      { role: "user", content: user },
    ],
    temperature: 0.4,
    maxTokens: 1200,
    responseFormat: "json",
  };
}

export const SUBMODULE = {
  parent: "intelligence" as const,
  id: "prompt-builder" as const,
  description: "Builds provider-neutral prompts from intent, facts, and memory",
} as const;
