import { INTENT_CUES } from "../constants";
import type {
  ExtractedEntity,
  IntelligenceIntent,
  IntelligenceRequest,
  PlannerDecision,
  PlannerNeeds,
  TravelMemoryProfile,
} from "../types";

function detectIntent(text: string): { intent: IntelligenceIntent; confidence: number } {
  const lower = text.toLowerCase();
  let best: IntelligenceIntent = "unknown";
  let score = 0;
  for (const [intent, cues] of Object.entries(INTENT_CUES)) {
    let hits = 0;
    for (const cue of cues) {
      if (lower.includes(cue)) hits += 1;
    }
    if (hits > score) {
      score = hits;
      best = intent as IntelligenceIntent;
    }
  }
  if (score === 0) {
    if (lower.length < 24) return { intent: "greet", confidence: 0.4 };
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
  }

  const styles = ["luxury", "adventure", "family", "couple", "group", "pilgrimage", "vegetarian"];
  for (const style of styles) {
    if (lower.includes(style)) {
      entities.push({
        kind: style === "vegetarian" ? "dietary" : style === "family" || style === "couple" ? "party" : "travel_style",
        value: style,
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

function buildNeeds(
  intent: IntelligenceIntent,
  text: string,
  surface: IntelligenceRequest["surface"]
): PlannerNeeds {
  const baseQuery = text.trim();
  const needs: PlannerNeeds = {
    needAi: true,
    needSearch: true,
    needKnowledgeViaSearch: true,
    needQuotation: false,
    needCustomerData: false,
    needTravelMemory: true,
    searchKinds: ["package", "destination", "knowledge"],
    searchQueryText: baseQuery,
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
    case "compare_packages":
      needs.searchKinds = ["package", "destination"];
      break;
    case "destination_recommend":
    case "explain_destination":
      needs.searchKinds = ["destination", "knowledge"];
      break;
    case "hotel_recommend":
      needs.searchKinds = ["knowledge", "package"];
      break;
    case "travel_plan":
    case "suggest_route":
    case "optimize_plan":
      needs.searchKinds = ["package", "destination", "knowledge"];
      break;
    case "quotation_assist":
      needs.needQuotation = true;
      needs.searchKinds = ["quotation", "package"];
      break;
    case "crm_assist":
      needs.needCustomerData = true;
      needs.searchKinds = ["customer", "lead"];
      break;
    case "faq":
      needs.searchKinds = ["knowledge"];
      break;
    case "fallback_browse":
      needs.needAi = true;
      needs.searchKinds = ["package", "destination", "knowledge"];
      break;
    default:
      break;
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
  const needs = buildNeeds(intent, request.text, request.surface);
  return { intent, entities, needs, confidence };
}

export const SUBMODULE = {
  parent: "intelligence" as const,
  id: "planner" as const,
  description: "Decides AI / Search / Quotation / Memory needs before providers run",
} as const;
