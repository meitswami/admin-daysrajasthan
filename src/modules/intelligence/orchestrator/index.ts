import { searchCustomers, searchForAiContext, searchQuotations } from "@/modules/search";

import { MAX_RETRIEVED_HITS } from "../constants";
import type { PlannerDecision, RetrievedFacts } from "../types";

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

  const base = {
    text: plan.needs.searchQueryText,
    filters: regionCode ? { regionCode } : undefined,
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
