import type { ClientItineraryRecord, ItineraryRevision } from "@/types/itinerary-builder";
import { isRealDataMode } from "@/lib/system/data-mode";
import {
  SEED_ITINERARY_RECORDS,
  SEED_REVISIONS,
} from "@/lib/data/itinerary-builder-mock";

const STORAGE_KEY = "travel-days-itinerary-builder-v1";

interface StoreState {
  records: ClientItineraryRecord[];
  revisions: Record<string, ItineraryRevision[]>;
}

function emptyState(): StoreState {
  return { records: [], revisions: {} };
}

function seedState(): StoreState {
  return {
    records: SEED_ITINERARY_RECORDS.map((r) => ({
      ...r,
      category_totals: r.category_totals ?? [],
      payment_status: r.payment_status ?? "unpaid",
      amount_paid: r.amount_paid ?? 0,
      deleted_at: r.deleted_at ?? null,
      source_package_id: r.source_package_id ?? null,
      lead_id: r.lead_id ?? null,
      lead_source: r.lead_source ?? null,
      customer_id: r.customer_id ?? null,
    })),
    revisions: { ...SEED_REVISIONS },
  };
}

export function readItineraryBuilderState(): StoreState {
  if (typeof window === "undefined") return emptyState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return isRealDataMode() ? emptyState() : seedState();
    const parsed = JSON.parse(raw) as StoreState;
    return {
      records: parsed.records ?? [],
      revisions: parsed.revisions ?? {},
    };
  } catch {
    return isRealDataMode() ? emptyState() : seedState();
  }
}

export function writeItineraryBuilderState(state: StoreState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function replaceItineraryBuilderState(
  records: ClientItineraryRecord[],
  revisions?: Record<string, ItineraryRevision[]>
) {
  const current = readItineraryBuilderState();
  writeItineraryBuilderState({
    records,
    revisions: revisions ?? current.revisions,
  });
}

export function mergeRevisionsForItinerary(itineraryId: string, revisions: ItineraryRevision[]) {
  const state = readItineraryBuilderState();
  state.revisions[itineraryId] = revisions;
  writeItineraryBuilderState(state);
}
