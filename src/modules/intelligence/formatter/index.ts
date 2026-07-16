import type { ParsedModelOutput } from "../parser";
import type { IntelligenceBlock, IntelligenceIntent, RetrievedFacts } from "../types";

function refsFromFacts(facts: RetrievedFacts) {
  return facts.hits.map((h) => ({ kind: h.kind, id: h.id, title: h.title }));
}

function packageBlocks(facts: RetrievedFacts): IntelligenceBlock[] {
  const packages = facts.hits.filter((h) => h.kind === "package");
  if (!packages.length) return [];
  return [
    {
      kind: "package_list",
      title: "Packages from catalog",
      body: null,
      refs: packages.map((h) => ({ kind: h.kind, id: h.id, title: h.title })),
      payload: {
        items: packages.map((h) => ({
          id: h.id,
          title: h.title,
          subtitle: h.subtitle,
          score: h.score,
          href: h.href,
        })),
      },
    },
  ];
}

function destinationBlocks(facts: RetrievedFacts): IntelligenceBlock[] {
  const destinations = facts.hits.filter((h) => h.kind === "destination");
  if (!destinations.length) return [];
  return [
    {
      kind: "destination_list",
      title: "Destinations from catalog",
      body: null,
      refs: destinations.map((h) => ({ kind: h.kind, id: h.id, title: h.title })),
      payload: {
        items: destinations.map((h) => ({
          id: h.id,
          title: h.title,
          subtitle: h.subtitle,
          score: h.score,
          href: h.href,
        })),
      },
    },
  ];
}

/**
 * Format Search facts (+ optional narrative) into Intelligence blocks (DTO only).
 */
export function formatIntelligenceBlocks(input: {
  intent: IntelligenceIntent;
  facts: RetrievedFacts;
  narrative: string | null;
  usedFallback: boolean;
}): IntelligenceBlock[] {
  const { intent, facts, narrative, usedFallback } = input;
  const blocks: IntelligenceBlock[] = [];

  if (narrative) {
    blocks.push({
      kind: usedFallback ? "fallback_browse" : intent === "summarize" ? "summary" : "message",
      title: null,
      body: narrative,
      refs: refsFromFacts(facts).slice(0, 8),
      payload: null,
    });
  }

  if (
    intent === "package_recommend" ||
    intent === "compare_packages" ||
    intent === "fallback_browse" ||
    intent === "travel_plan"
  ) {
    blocks.push(...packageBlocks(facts));
  }

  if (
    intent === "destination_recommend" ||
    intent === "explain_destination" ||
    intent === "fallback_browse" ||
    intent === "travel_plan"
  ) {
    blocks.push(...destinationBlocks(facts));
  }

  if (intent === "compare_packages" && facts.hits.filter((h) => h.kind === "package").length >= 2) {
    const pkgs = facts.hits.filter((h) => h.kind === "package").slice(0, 4);
    blocks.push({
      kind: "comparison",
      title: "Package comparison (catalog fields only)",
      body: null,
      refs: pkgs.map((h) => ({ kind: h.kind, id: h.id, title: h.title })),
      payload: {
        columns: ["id", "title", "subtitle", "score"],
        rows: pkgs.map((h) => ({
          id: h.id,
          title: h.title,
          subtitle: h.subtitle,
          score: h.score,
        })),
      },
    });
  }

  if (intent === "travel_plan" || intent === "suggest_route" || intent === "optimize_plan") {
    blocks.push({
      kind: "itinerary_outline",
      title: "Itinerary outline (from retrieved catalog only)",
      body: narrative,
      refs: refsFromFacts(facts),
      payload: {
        steps: facts.hits.slice(0, 6).map((h, i) => ({
          order: i + 1,
          refKind: h.kind,
          refId: h.id,
          title: h.title,
        })),
      },
    });
  }

  if (intent === "quotation_assist") {
    blocks.push({
      kind: "quotation_hint",
      title: "Quotation assist",
      body: "Use Quotation Engine for pricing — Intelligence never invents prices.",
      refs: facts.hits
        .filter((h) => h.kind === "quotation" || h.kind === "package")
        .map((h) => ({ kind: h.kind, id: h.id, title: h.title })),
      payload: { needQuotationEngine: true },
    });
  }

  if (intent === "crm_assist") {
    blocks.push({
      kind: "crm_hint",
      title: "CRM assist",
      body: "Use Customer Relationship Platform for lifecycle actions.",
      refs: facts.hits
        .filter((h) => h.kind === "customer" || h.kind === "lead")
        .map((h) => ({ kind: h.kind, id: h.id, title: h.title })),
      payload: { needCustomerRelations: true },
    });
  }

  if (intent === "greet") {
    blocks.push({
      kind: "message",
      title: null,
      body: "Welcome to Travel Days. Ask about packages, destinations, or a trip plan.",
      refs: [],
      payload: null,
    });
  }

  if (!blocks.length) {
    blocks.push({
      kind: "fallback_browse",
      title: "Catalog browse",
      body: "Here are grounded results from Search.",
      refs: refsFromFacts(facts),
      payload: null,
    });
    blocks.push(...packageBlocks(facts), ...destinationBlocks(facts));
  }

  return blocks;
}

export type { ParsedModelOutput };

export const SUBMODULE = {
  parent: "intelligence" as const,
  id: "formatter" as const,
  description: "Formats provider + Search facts into structured Intelligence blocks",
} as const;
