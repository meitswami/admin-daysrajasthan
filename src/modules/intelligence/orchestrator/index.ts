import {
  parseDurationDaysFromQuery,
  searchCustomers,
  searchForAiContext,
  searchQuotations,
  type SearchFilters,
} from "@/modules/search";

import { MAX_RETRIEVED_HITS } from "../constants";
import type { PlannerDecision, RetrievedFacts } from "../types";

function buildSearchFilters(
  plan: PlannerDecision,
  regionCode?: string | null
): SearchFilters | undefined {
  const filters: SearchFilters = {};
  if (regionCode) filters.regionCode = regionCode;

  const durationEntity = plan.entities.find((e) => e.kind === "duration_days");
  const fromQuery = parseDurationDaysFromQuery(plan.needs.searchQueryText);
  const fromEntity = durationEntity ? Number(durationEntity.value) : null;

  if (fromQuery.min != null || fromQuery.max != null) {
    if (fromQuery.min != null) filters.durationDaysMin = fromQuery.min;
    if (fromQuery.max != null) filters.durationDaysMax = fromQuery.max;
  } else if (fromEntity && Number.isFinite(fromEntity) && fromEntity > 0) {
    filters.durationDaysMin = fromEntity;
    filters.durationDaysMax = fromEntity;
  }

  const styleEntity = plan.entities.find(
    (e) => e.kind === "party" || e.kind === "travel_style"
  );
  if (styleEntity) {
    const v = styleEntity.value.toLowerCase();
    if (v === "family" || v === "families") filters.travelStyle = "family";
    else if (v === "couple" || v === "couples" || v === "honeymoon") filters.travelStyle = "couple";
    else if (v === "group" || v === "friends" || v === "solo") filters.travelStyle = "group";
    else if (v === "luxury" || v === "heritage") filters.travelStyle = "luxury";
    else if (v === "adventure" || v === "desert" || v === "wildlife") filters.travelStyle = "adventure";
    else if (v === "pilgrimage" || v === "spiritual") filters.travelStyle = "pilgrimage";
    else if (v === "senior") filters.travelStyle = "family";
  }

  return Object.keys(filters).length ? filters : undefined;
}

/**
 * Orchestrates Search only. Never calls Knowledge or Supabase.
 */
export async function retrieveViaSearch(input: {
  plan: PlannerDecision;
  regionCode?: string | null;
}): Promise<RetrievedFacts> {
  const { plan, regionCode } = input;
  const retrievedAt = new Date().toISOString();

  if (!plan.needs.needSearch) {
    return { search: null, hits: [], retrievedAt };
  }

  const filters = buildSearchFilters(plan, regionCode);

  const base = {
    text: plan.needs.searchQueryText,
    filters,
    limit: MAX_RETRIEVED_HITS,
    kinds: plan.needs.searchKinds,
  };

  let search = await searchForAiContext(base);

  if (plan.needs.needCustomerData) {
    const customers = await searchCustomers({
      text: plan.needs.searchQueryText,
      limit: 5,
      kinds: ["customer", "lead"],
    });
    search = {
      ...search,
      hits: [...customers.hits, ...search.hits].slice(0, MAX_RETRIEVED_HITS),
      total: customers.total + search.total,
    };
  }

  if (plan.needs.needQuotation) {
    const quotations = await searchQuotations({
      text: plan.needs.searchQueryText,
      limit: 5,
      kinds: ["quotation"],
    });
    search = {
      ...search,
      hits: [...quotations.hits, ...search.hits].slice(0, MAX_RETRIEVED_HITS),
      total: quotations.total + search.total,
    };
  }

  return {
    search,
    hits: search.hits,
    retrievedAt,
  };
}

export const SUBMODULE = {
  parent: "intelligence" as const,
  id: "orchestrator" as const,
  description: "Runs planner decisions against Search (never Knowledge-direct)",
} as const;
