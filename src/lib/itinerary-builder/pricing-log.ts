import type { ClientItineraryRecord } from "@/types/itinerary-builder";

export type PricingChangeLogEntry = {
  id: string;
  quote_id: string;
  itinerary_id: string;
  revision_id: string | null;
  category_key: string | null;
  field: string;
  old_value: number | null;
  new_value: number | null;
  changed_by: string;
  changed_at: string;
  note: string | null;
};

const LOG_KEY = "travel-days-pricing-change-log-v1";

function createLogId(): string {
  return `pcl-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Dedupe ids so React list keys stay unique (older logs used Date.now() only). */
function uniquifyLogIds(entries: PricingChangeLogEntry[]): PricingChangeLogEntry[] {
  const seen = new Set<string>();
  let dirty = false;
  const next = entries.map((entry) => {
    if (!seen.has(entry.id)) {
      seen.add(entry.id);
      return entry;
    }
    dirty = true;
    const id = createLogId();
    seen.add(id);
    return { ...entry, id };
  });
  if (dirty) saveLogs(next);
  return next;
}

function loadLogs(): PricingChangeLogEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOG_KEY);
    const parsed = raw ? (JSON.parse(raw) as PricingChangeLogEntry[]) : [];
    return uniquifyLogIds(parsed);
  } catch {
    return [];
  }
}

function saveLogs(entries: PricingChangeLogEntry[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LOG_KEY, JSON.stringify(entries.slice(0, 500)));
}

export function logPricingChange(
  record: ClientItineraryRecord,
  field: string,
  oldValue: number | null,
  newValue: number | null,
  options?: {
    note?: string | null;
    category_key?: string | null;
    revision_id?: string | null;
  }
) {
  if (oldValue === newValue) return;
  const entry: PricingChangeLogEntry = {
    id: createLogId(),
    quote_id: record.quote_id,
    itinerary_id: record.id,
    revision_id: options?.revision_id ?? null,
    category_key: options?.category_key ?? null,
    field,
    old_value: oldValue,
    new_value: newValue,
    changed_by: record.owner_name,
    changed_at: new Date().toISOString(),
    note: options?.note ?? null,
  };
  saveLogs([entry, ...loadLogs()]);

  import("@/lib/system/activity-log").then(({ logActivity }) => {
    logActivity({
      action: "pricing_change",
      module: "itinerary_builder",
      entity_type: "quote",
      entity_id: record.id,
      summary: `${record.quote_id}: ${field} ${oldValue ?? "—"} → ${newValue ?? "—"}`,
      metadata: { category_key: options?.category_key, note: options?.note },
    });
  });
}

export function getPricingLogsForItinerary(itineraryId: string) {
  return loadLogs().filter((e) => e.itinerary_id === itineraryId);
}

export function getPricingLogsForQuote(quoteId: string) {
  return loadLogs().filter((e) => e.quote_id === quoteId);
}

export function listAllPricingLogs(limit = 100) {
  return loadLogs().slice(0, limit);
}
