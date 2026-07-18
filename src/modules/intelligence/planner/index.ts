import type {
  ExtractedEntity,
  IntelligenceIntent,
  IntelligenceRequest,
  PlannerDecision,
  PlannerNeeds,
  TravelMemoryProfile,
} from "../types";
import { INTENT_CUES } from "../constants";

function cueMatches(haystack: string, cue: string): boolean {
  const c = cue.toLowerCase();
  // Short cues ("hi", "hey") must be whole words — "hi" must not match "which"
  if (c.length <= 3) {
    return new RegExp(`(?:^|[^a-z0-9])${c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:$|[^a-z0-9])`, "i").test(
      haystack
    );
  }
  return haystack.includes(c);
}

function detectIntent(text: string): { intent: IntelligenceIntent; confidence: number } {
  const lower = text.toLowerCase();

  // Conversational follow-ups about prior package results
  if (
    /\b(which of these|any of these|best for (a )?(family|couple|friends?|seniors?|solo))\b/i.test(
      lower
    ) ||
    (/\b(family|families|couple|couples|honeymoon|solo|senior|friends)\b/i.test(lower) &&
      /\b(best|better|recommend|suitable|good for)\b/i.test(lower))
  ) {
    if (/\bcompare|vs|versus|difference\b/i.test(lower)) {
      return { intent: "compare_packages", confidence: 0.85 };
    }
    return { intent: "package_recommend", confidence: 0.85 };
  }

  let best: IntelligenceIntent = "unknown";
  let score = 0;
  for (const [intent, cues] of Object.entries(INTENT_CUES)) {
    let hits = 0;
    for (const cue of cues) {
      if (cueMatches(lower, cue)) hits += 1;
    }
    if (hits > score) {
      score = hits;
      best = intent as IntelligenceIntent;
    }
  }
  if (score === 0) {
    if (lower.length < 24 && /^(hi|hey|hello|namaste)\b/i.test(lower.trim())) {
      return { intent: "greet", confidence: 0.4 };
    }
    if (lower.length < 18) return { intent: "greet", confidence: 0.35 };
    return { intent: "fallback_browse", confidence: 0.35 };
  }
  return { intent: best, confidence: Math.min(0.95, 0.45 + score * 0.15) };
}

function extractEntities(text: string, memory: TravelMemoryProfile | null): ExtractedEntity[] {
  const entities: ExtractedEntity[] = [];
  const lower = text.toLowerCase();

  const budget = text.match(/(?:₹|rs\.?|inr)?\s*(\d{3,7})\s*(?:-|to)?\s*(?:₹|rs\.?|inr)?\s*(\d{3,7})?/i);
  if (budget) {
    entities.push({
      kind: "budget",
      value: budget[2] ? `${budget[1]}-${budget[2]}` : budget[1],
      confidence: 0.7,
    });
  }

  const days = text.match(/(\d+)\s*-?\s*days?/i);
  if (days) {
    entities.push({ kind: "duration_days", value: days[1], confidence: 0.75 });
  } else {
    const nights = text.match(/(\d+)\s*-?\s*nights?/i);
    if (nights) {
      entities.push({
        kind: "duration_days",
        value: String(Number(nights[1]) + 1),
        confidence: 0.7,
      });
    }
  }

  const range = text.match(/(\d+)\s*(?:-|to|–|—)\s*(\d+)\s*-?\s*days?/i);
  if (range) {
    entities.push({
      kind: "duration_days",
      value: `${range[1]}-${range[2]}`,
      confidence: 0.8,
    });
  }

  const styles = [
    "luxury",
    "adventure",
    "family",
    "families",
    "couple",
    "couples",
    "honeymoon",
    "romantic",
    "group",
    "friends",
    "solo",
    "senior",
    "pilgrimage",
    "spiritual",
    "desert",
    "wildlife",
    "heritage",
    "vegetarian",
  ];
  for (const style of styles) {
    if (lower.includes(style)) {
      const normalized =
        style === "families"
          ? "family"
          : style === "couples"
            ? "couple"
            : style === "romantic" || style === "honeymoon"
              ? "couple"
              : style === "friends"
                ? "group"
                : style === "spiritual"
                  ? "pilgrimage"
                  : style === "desert" || style === "wildlife" || style === "heritage"
                    ? style === "heritage"
                      ? "luxury"
                      : "adventure"
                    : style === "senior"
                      ? "family"
                      : style === "solo"
                        ? "group"
                        : style;
      entities.push({
        kind:
          style === "vegetarian"
            ? "dietary"
            : normalized === "family" || normalized === "couple"
              ? "party"
              : "travel_style",
        value: normalized === "group" && style === "solo" ? "solo" : normalized,
        confidence: 0.8,
      });
    }
  }

  const months =
    "january|february|march|april|may|june|july|august|september|october|november|december".split(
      "|"
    );
  for (const month of months) {
    if (lower.includes(month)) {
      entities.push({ kind: "month", value: month, confidence: 0.85 });
    }
  }

  if (memory?.preferredDestinations?.length) {
    for (const dest of memory.preferredDestinations) {
      if (lower.includes(dest.toLowerCase())) {
        entities.push({ kind: "destination", value: dest, confidence: 0.9 });
      }
    }
  }

  const destCue = text.match(/\b(?:in|to|for)\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)?)/);
  if (destCue) {
    entities.push({ kind: "destination", value: destCue[1], confidence: 0.55 });
  }

  return entities;
}

/** Intents answered by Search → Knowledge → Renderer only (no LLM). */
const SEARCH_ONLY_INTENTS = new Set<IntelligenceIntent>([
  "greet",
  "package_recommend",
  "destination_recommend",
  "explain_destination",
  "faq",
  "fallback_browse",
]);

/** Intents that always use an LLM when available. */
const LLM_INTENTS = new Set<IntelligenceIntent>([
  "compare_packages",
  "travel_plan",
  "suggest_route",
  "optimize_plan",
  "summarize",
  "hotel_recommend",
  "quotation_assist",
]);

function mergeSearchQueryFromTurns(
  currentText: string,
  turns: IntelligenceRequest["conversationTurns"] | undefined,
  intent: IntelligenceIntent
): string {
  const current = currentText.trim();
  if (!turns?.length) return current;

  const priorUsers = turns
    .filter((t) => t.role === "user")
    .map((t) => t.text.trim())
    .filter(Boolean);
  if (!priorUsers.length) return current;

  const lastPrior = priorUsers[priorUsers.length - 1] ?? "";
  const lower = current.toLowerCase();
  const isRefine =
    intent === "package_recommend" &&
    (/\b(these|those|them|above|best|which|family|couple|friend|senior|solo|theme)\b/.test(lower) ||
      current.split(/\s+/).length <= 12);

  if (!isRefine) return current;
  if (!lastPrior || lastPrior.toLowerCase() === lower) return current;
  return `${lastPrior} ${current}`.trim();
}

function buildNeeds(
  intent: IntelligenceIntent,
  text: string,
  surface: IntelligenceRequest["surface"],
  conversationTurnCount: number,
  searchQueryText: string
): PlannerNeeds {
  const needs: PlannerNeeds = {
    needAi: true,
    needSearch: true,
    needKnowledgeViaSearch: true,
    needQuotation: false,
    needCustomerData: false,
    needTravelMemory: true,
    searchKinds: ["package", "destination", "knowledge"],
    searchQueryText,
    reason: `Intent ${intent} on surface ${surface}`,
  };

  switch (intent) {
    case "greet":
      needs.needAi = false;
      needs.needSearch = false;
      needs.needKnowledgeViaSearch = false;
      needs.reason = "Greeting — no retrieval required";
      break;
    case "package_recommend":
      needs.needAi = false;
      needs.searchKinds = ["package", "destination"];
      needs.reason = "Package search — Search + Renderer only";
      break;
    case "destination_recommend":
    case "explain_destination":
      needs.needAi = false;
      needs.searchKinds = ["destination", "knowledge"];
      needs.reason = "Destination details — Knowledge + Renderer only";
      break;
    case "faq":
      needs.needAi = false;
      needs.searchKinds = ["knowledge"];
      needs.reason = "FAQ — Knowledge Engine only";
      break;
    case "fallback_browse":
      needs.needAi = false;
      needs.searchKinds = ["package", "destination", "knowledge"];
      needs.reason = "Static browse — Search + Renderer only";
      break;
    case "compare_packages":
      needs.needAi = true;
      needs.searchKinds = ["package", "destination"];
      needs.reason = "Package comparison — LLM with grounded facts";
      break;
    case "hotel_recommend":
      needs.needAi = true;
      needs.searchKinds = ["knowledge", "package"];
      break;
    case "travel_plan":
    case "suggest_route":
    case "optimize_plan":
      needs.needAi = true;
      needs.searchKinds = ["package", "destination", "knowledge"];
      needs.reason = "Travel planning — LLM with grounded facts";
      break;
    case "quotation_assist":
      needs.needAi = true;
      needs.needQuotation = true;
      needs.searchKinds = ["quotation", "package"];
      break;
    case "crm_assist":
      needs.needAi = false;
      needs.needCustomerData = true;
      needs.searchKinds = ["customer", "lead"];
      break;
    case "summarize":
      needs.needAi = true;
      break;
    default:
      needs.needAi = LLM_INTENTS.has(intent) || !SEARCH_ONLY_INTENTS.has(intent);
      break;
  }

  // Conversational follow-ups use LLM except package/destination refinements
  // (those stay Search → Renderer with merged prior query context).
  if (
    conversationTurnCount > 0 &&
    intent !== "greet" &&
    intent !== "package_recommend" &&
    intent !== "destination_recommend" &&
    intent !== "explain_destination" &&
    intent !== "faq" &&
    intent !== "fallback_browse"
  ) {
    needs.needAi = true;
    needs.reason = `${needs.reason} · conversational follow-up`;
  }

  if (surface === "quotation") needs.needQuotation = true;
  if (surface === "crm") needs.needCustomerData = true;
  if (surface === "whatsapp" || surface === "customer_portal") needs.needTravelMemory = true;

  return needs;
}

/**
 * Decide needAi / needSearch / needQuotation / memory before any provider call.
 */
export function planIntelligence(
  request: IntelligenceRequest,
  memory: TravelMemoryProfile | null
): PlannerDecision {
  const { intent, confidence } = detectIntent(request.text);
  const entities = extractEntities(request.text, memory);
  const turnCount = request.conversationTurns?.length ?? 0;
  const searchQueryText = mergeSearchQueryFromTurns(
    request.text,
    request.conversationTurns,
    intent
  );
  // Also extract entities from merged query so places from prior turn apply
  const mergedEntities =
    searchQueryText !== request.text.trim()
      ? [
          ...entities,
          ...extractEntities(searchQueryText, memory).filter(
            (e) => !entities.some((x) => x.kind === e.kind && x.value === e.value)
          ),
        ]
      : entities;
  const needs = buildNeeds(intent, request.text, request.surface, turnCount, searchQueryText);
  return { intent, entities: mergedEntities, needs, confidence };
}

export const SUBMODULE = {
  parent: "intelligence" as const,
  id: "planner" as const,
  description: "Intent / entity / needAi routing (Search-only vs LLM)",
} as const;
