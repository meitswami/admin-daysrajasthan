import type {
  ClientItineraryRecord,
  ItineraryRevision,
  ItinerarySnapshot,
} from "@/types/itinerary-builder";
import { isRealDataMode } from "@/lib/system/data-mode";
import {
  SEED_ITINERARY_RECORDS,
  SEED_REVISIONS,
} from "@/lib/data/itinerary-builder-mock";

const STORAGE_KEY = "travel-days-itinerary-builder-v1";

/** Keep enough history for the version timeline without blowing localStorage. */
const MAX_REVISIONS_PER_ITINERARY = 8;
const MAX_REVISIONS_ON_QUOTA = 2;
const MAX_RECORDS_ON_QUOTA = 40;

interface StoreState {
  records: ClientItineraryRecord[];
  revisions: Record<string, ItineraryRevision[]>;
}

export class ItineraryStorageQuotaError extends Error {
  constructor(message = "Browser storage is full. Clear old drafts or trash, then try again.") {
    super(message);
    this.name = "ItineraryStorageQuotaError";
  }
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

function isQuotaError(error: unknown): boolean {
  if (error instanceof DOMException) {
    return (
      error.name === "QuotaExceededError" ||
      error.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
      error.code === 22
    );
  }
  return error instanceof Error && /quotaexceeded|quota/i.test(error.message);
}

/** data: URLs (dummy-mode uploads) are megabytes each and must not be persisted. */
function stripHeavyImages(snapshot: ItinerarySnapshot): ItinerarySnapshot {
  return {
    ...snapshot,
    days: (snapshot.days ?? []).map((day) => ({
      ...day,
      images: (day.images ?? []).filter(
        (url) => typeof url === "string" && url.length > 0 && !url.startsWith("data:")
      ),
    })),
  };
}

function slimRevision(revision: ItineraryRevision): ItineraryRevision {
  return {
    ...revision,
    snapshot: stripHeavyImages(revision.snapshot),
  };
}

function keepRevisionsForRecord(
  record: ClientItineraryRecord,
  list: ItineraryRevision[] | undefined,
  max: number
): ItineraryRevision[] {
  const sorted = [...(list ?? [])]
    .map(slimRevision)
    .sort((a, b) => b.version_number - a.version_number);

  const kept: ItineraryRevision[] = [];
  const seen = new Set<string>();

  const current = sorted.find((r) => r.id === record.current_revision_id);
  if (current) {
    kept.push(current);
    seen.add(current.id);
  }

  for (const rev of sorted) {
    if (kept.length >= max) break;
    if (seen.has(rev.id)) continue;
    kept.push(rev);
    seen.add(rev.id);
  }

  return kept.sort((a, b) => a.version_number - b.version_number);
}

function pruneState(
  state: StoreState,
  options: {
    maxRevisions: number;
    dropSoftDeleted: boolean;
    maxRecords: number | null;
  }
): StoreState {
  let records = [...state.records];

  if (options.dropSoftDeleted) {
    records = records.filter((r) => !r.deleted_at);
  }

  if (options.maxRecords != null && records.length > options.maxRecords) {
    records = [...records]
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, options.maxRecords);
  }

  const revisions: Record<string, ItineraryRevision[]> = {};

  for (const record of records) {
    revisions[record.id] = keepRevisionsForRecord(
      record,
      state.revisions[record.id],
      options.maxRevisions
    );
  }

  return { records, revisions };
}

function trySetItem(serialized: string): void {
  localStorage.setItem(STORAGE_KEY, serialized);
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

  const attempts: StoreState[] = [
    pruneState(state, {
      maxRevisions: MAX_REVISIONS_PER_ITINERARY,
      dropSoftDeleted: false,
      maxRecords: null,
    }),
    pruneState(state, {
      maxRevisions: MAX_REVISIONS_ON_QUOTA,
      dropSoftDeleted: true,
      maxRecords: null,
    }),
    pruneState(state, {
      maxRevisions: 1,
      dropSoftDeleted: true,
      maxRecords: MAX_RECORDS_ON_QUOTA,
    }),
  ];

  let lastError: unknown;
  let clearedKey = false;

  for (const attempt of attempts) {
    try {
      trySetItem(JSON.stringify(attempt));
      return;
    } catch (error) {
      if (!isQuotaError(error)) throw error;
      lastError = error;
      // Free the oversized blob before retrying a compacted write.
      if (!clearedKey) {
        try {
          localStorage.removeItem(STORAGE_KEY);
          clearedKey = true;
        } catch {
          // ignore
        }
      }
    }
  }

  // Last resort: keep only the newest active quote so Preview can still proceed.
  const newest = pruneState(state, {
    maxRevisions: 1,
    dropSoftDeleted: true,
    maxRecords: 1,
  });

  try {
    if (!clearedKey) {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        // ignore
      }
    }
    trySetItem(JSON.stringify(newest));
    return;
  } catch (error) {
    if (!isQuotaError(error)) throw error;
    lastError = error;
  }

  throw new ItineraryStorageQuotaError(
    lastError instanceof Error ? lastError.message : undefined
  );
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
