import type { CategoryTotalSummary, ItinerarySnapshot } from "@/types/itinerary-builder";

export type PublicQuotationPayload = {
  itinerary_id: string;
  quote_id: string;
  version_number: number;
  revision_id: string;
  client_name: string;
  snapshot: ItinerarySnapshot;
  category_totals: CategoryTotalSummary[];
  published_at: string;
};

type Store = Map<string, PublicQuotationPayload>;

const globalStore = globalThis as unknown as { __publicQuotationStore?: Store };

function getStore(): Store {
  if (!globalStore.__publicQuotationStore) {
    globalStore.__publicQuotationStore = new Map();
  }
  return globalStore.__publicQuotationStore;
}

export function publishPublicQuotation(payload: PublicQuotationPayload): PublicQuotationPayload {
  const next = { ...payload, published_at: new Date().toISOString() };
  getStore().set(payload.itinerary_id, next);
  return next;
}

export function getPublicQuotation(itineraryId: string): PublicQuotationPayload | null {
  return getStore().get(itineraryId) ?? null;
}
