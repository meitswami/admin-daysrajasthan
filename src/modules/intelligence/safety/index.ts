import { AI_MUST_NOT } from "../constants";
import type { IntelligenceBlock, RetrievedFacts } from "../types";

const PRICE_INVENTION =
  /\b(approx(?:imately)?|around|roughly)\s*(₹|rs\.?|inr|usd|\$)\s*\d+/i;

/**
 * Safety rails — strip invented pricing cues when no quotation/price facts exist.
 */
export function applySafetyRails(
  blocks: IntelligenceBlock[],
  facts: RetrievedFacts
): { blocks: IntelligenceBlock[]; warnings: string[] } {
  const warnings: string[] = [];
  const hasPriceFact = facts.hits.some(
    (h) =>
      h.kind === "quotation" ||
      (h.facets && ("price" in h.facets || "amount" in h.facets || "total" in h.facets))
  );

  const next = blocks.map((block) => {
    if (!block.body) return block;
    if (!hasPriceFact && PRICE_INVENTION.test(block.body)) {
      warnings.push("Removed unverified price language (AI must never invent prices)");
      return {
        ...block,
        body: `${block.body.replace(PRICE_INVENTION, "[price unavailable]")}\n\nPricing must come from Quotation Engine.`,
      };
    }
    return block;
  });

  return { blocks: next, warnings };
}

export function safetyPolicySummary(): string[] {
  return [...AI_MUST_NOT];
}

export const SUBMODULE = {
  parent: "intelligence" as const,
  id: "safety" as const,
  description: "Hard rails against inventing prices and ungrounded facts",
} as const;
