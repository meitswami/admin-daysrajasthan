import type {
  CategoryPricingTier,
  ClientDetails,
  ClientItineraryRecord,
  HotelCategoryKey,
  ItineraryDay,
  ItineraryRevision,
  ItinerarySnapshot,
  PaymentStatus,
  PriceBasis,
  RevisionSaveType,
  WorkflowStatus,
} from "@/types/itinerary-builder";
import {
  SEED_ITINERARY_RECORDS,
  SEED_REVISIONS,
  nextQuoteId,
} from "@/lib/data/itinerary-builder-mock";
import {
  applyCostToSnapshot,
  categoryTotalsFromSnapshot,
  durationLabelFromDays,
  primaryGrandTotal,
} from "@/lib/itinerary-builder/cost-engine";
import { emptySnapshot, newUuid } from "@/lib/itinerary-builder/defaults";
import {
  buildCategoryPricing,
  resolveTourCodeOnSave,
} from "@/lib/itinerary-builder/package-catalog";
import { clampAdvancePercent } from "@/lib/itinerary-builder/payment-details";
import { logPricingChange } from "@/lib/itinerary-builder/pricing-log";
import { cloneSnapshot, createRevision } from "@/lib/itinerary-builder/revisions";
import { loadSiteSettings } from "@/lib/site-settings/storage";
import {
  ItineraryStorageQuotaError,
  readItineraryBuilderState,
  writeItineraryBuilderState,
} from "@/lib/itinerary-builder/state-store";

export { ItineraryStorageQuotaError };

/** Cap local revision history so localStorage stays under browser quota. */
const MAX_REVISIONS_PER_ITINERARY = 8;
import {
  normalizeRecord,
  normalizeRevision,
  normalizeSnapshot,
} from "@/lib/itinerary-builder/normalize";
import { getCurrentTeamMember } from "@/lib/rbac/current-user";

function resolveActorName(explicit?: string | null): string {
  const trimmed = explicit?.trim();
  if (trimmed && trimmed !== "System") return trimmed;
  try {
    const name = getCurrentTeamMember().name?.trim();
    if (name && name !== "System") return name;
  } catch {
    // SSR / unavailable
  }
  return "Staff";
}

export { normalizeSnapshot, normalizeRecord };

function loadState() {
  const state = readItineraryBuilderState();
  return {
    records: state.records.map(normalizeRecord),
    revisions: state.revisions,
  };
}

function saveState(state: ReturnType<typeof readItineraryBuilderState>) {
  writeItineraryBuilderState(state);
}

function syncRecordFromSnapshot(
  record: ClientItineraryRecord,
  snapshot: ItinerarySnapshot,
  revision: ItineraryRevision
): ClientItineraryRecord {
  const normalized = normalizeSnapshot(snapshot);
  const category_totals = categoryTotalsFromSnapshot(normalized);
  return {
    ...record,
    title: normalized.header.title,
    tour_code: normalized.header.tour_code,
    current_revision_id: revision.id,
    current_version: revision.version_number,
    updated_at: revision.created_at,
    client_name: normalized.client.client_name,
    client_email: normalized.client.email,
    client_phone: normalized.client.phone,
    travel_date: normalized.client.travel_date,
    adults: normalized.client.adults ?? 0,
    children: (normalized.client.children_5_12 ?? 0) + (normalized.client.children_below_5 ?? 0),
    rooms: normalized.client.rooms ?? 0,
    grand_total: primaryGrandTotal(normalized),
    category_totals,
    margin_pct: normalized.cost_sheet.margin_pct,
    source_package_id: normalized.source_package_id,
  };
}

function peekMasterTourCodes(): Array<string | null> {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("td-master-itineraries-v1");
    if (!raw) return [];
    const items = JSON.parse(raw) as Array<{ tour_code?: string | null }>;
    return Array.isArray(items) ? items.map((i) => i.tour_code ?? null) : [];
  } catch {
    return [];
  }
}

function existingTourCodes(excludeId?: string): Array<string | null> {
  const fromQuotes = loadState()
    .records.filter((r) => r.type === "client_itinerary" && r.id !== excludeId)
    .map((r) => r.tour_code);
  return [...fromQuotes, ...peekMasterTourCodes()];
}

export function listClientItineraries(opts?: {
  includeDeleted?: boolean;
  confirmedOnly?: boolean;
  pendingOnly?: boolean;
}): ClientItineraryRecord[] {
  const { records } = loadState();
  let list = [...records].filter((r) => r.type === "client_itinerary");
  if (!opts?.includeDeleted) {
    list = list.filter((r) => !r.deleted_at);
  }
  if (opts?.confirmedOnly) {
    list = list.filter(isConfirmedBooking);
  } else if (opts?.pendingOnly) {
    list = list.filter(isPendingQuote);
  }
  // Catalog rows mistakenly stored as quotes (client_name "Website Package")
  list = list.filter((r) => {
    const name = (r.client_name ?? "").trim().toLowerCase();
    return name !== "website package";
  });
  return list.sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );
}

export function getClientItinerary(id: string): ClientItineraryRecord | null {
  return loadState().records.find((r) => r.id === id) ?? null;
}

export function getRevisions(itineraryId: string): ItineraryRevision[] {
  const { revisions } = loadState();
  return [...(revisions[itineraryId] ?? [])]
    .map(normalizeRevision)
    .sort((a, b) => b.version_number - a.version_number);
}

export function getCurrentSnapshot(itineraryId: string): ItinerarySnapshot | null {
  const record = getClientItinerary(itineraryId);
  if (!record) return null;
  const revs = getRevisions(itineraryId);
  const current = revs.find((r) => r.id === record.current_revision_id) ?? revs[0];
  return current?.snapshot ? normalizeSnapshot(current.snapshot) : null;
}

function buildRecordFromSnapshot(
  id: string,
  quote_id: string,
  snapshot: ItinerarySnapshot,
  revision: ItineraryRevision,
  extras?: Partial<ClientItineraryRecord>
): ClientItineraryRecord {
  const normalized = applyCostToSnapshot(normalizeSnapshot(snapshot));
  const base: ClientItineraryRecord = {
    id,
    quote_id,
    type: "client_itinerary",
    title: normalized.header.title,
    tour_code: normalized.header.tour_code,
    workflow_status: "draft",
    current_revision_id: revision.id,
    current_version: revision.version_number,
    created_by: resolveActorName(),
    owner_name: resolveActorName(),
    created_at: revision.created_at,
    updated_at: revision.created_at,
    client_name: normalized.client.client_name,
    client_email: normalized.client.email,
    client_phone: normalized.client.phone,
    travel_date: normalized.client.travel_date,
    adults: normalized.client.adults ?? 0,
    children: (normalized.client.children_5_12 ?? 0) + (normalized.client.children_below_5 ?? 0),
    rooms: normalized.client.rooms ?? 0,
    grand_total: primaryGrandTotal(normalized),
    category_totals: categoryTotalsFromSnapshot(normalized),
    currency: "INR",
    margin_pct: normalized.cost_sheet.margin_pct,
    payment_status: "unpaid",
    amount_paid: 0,
    deleted_at: null,
    source_package_id: normalized.source_package_id,
    lead_id: null,
    lead_source: null,
    customer_id: null,
    ...extras,
  };
  return base;
}

export function createClientItinerary(clientName: string): ClientItineraryRecord {
  return createClientItineraryFromWizard({
    client: { client_name: clientName, title: "Mr" },
    packageId: null,
    categoryKeys: [],
  });
}

export type WizardCreateInput = {
  client: Partial<ClientDetails> & { client_name: string };
  packageId: string | null;
  categoryKeys: HotelCategoryKey[];
  categoryDiscounts?: Partial<Record<HotelCategoryKey, number | null>>;
  packagePriceOverrides?: Partial<Record<HotelCategoryKey, number | null>>;
  title?: string;
  tourCode?: string | null;
  alternateTitles?: string[];
  days?: ItineraryDay[];
  vehicle_type?: string | null;
  price_basis?: PriceBasis;
  final_price?: number | null;
  optional_inclusion_keys?: string[];
  inclusions?: string[];
  internal_notes?: string;
  public_notes?: string;
  category_pricing?: CategoryPricingTier[];
  lead_id?: string | null;
  lead_source?: ClientItineraryRecord["lead_source"];
  customer_id?: string | null;
  created_by?: string | null;
  owner_name?: string | null;
};

export function createClientItineraryFromWizard(input: WizardCreateInput): ClientItineraryRecord {
  const state = loadState();
  const id = newUuid();
  const quote_id = nextQuoteId(state.records);
  const actorName = resolveActorName(input.owner_name ?? input.created_by);

  // Templates come from Master Data (caller passes days); no demo catalog.
  let snapshot: ItinerarySnapshot = emptySnapshot();
  if (input.packageId && input.days?.length) {
    snapshot = emptySnapshot({
      days: input.days,
      source_package_id: input.packageId,
    });
  }

  const primaryTitle =
    input.title?.trim() ||
    snapshot.header.title ||
    `Quote for ${input.client.client_name}`;

  const defaultAdvance = clampAdvancePercent(
    loadSiteSettings().adminGeneral.default_advance_percent
  );

  const tourCode = resolveTourCodeOnSave(
    input.tourCode !== undefined ? input.tourCode : snapshot.header.tour_code,
    existingTourCodes()
  );

  snapshot = normalizeSnapshot({
    ...snapshot,
    header: {
      ...snapshot.header,
      title: primaryTitle,
      tour_code: tourCode,
      alternate_titles: input.alternateTitles ?? [],
    },
    client: {
      ...snapshot.client,
      ...input.client,
      client_name: input.client.client_name,
    },
    days: input.days ?? snapshot.days,
    category_pricing:
      input.category_pricing ??
      (input.categoryKeys.length > 0
        ? buildCategoryPricing(
            { ...snapshot, days: input.days ?? snapshot.days },
            input.categoryKeys,
            input.categoryDiscounts,
            input.packagePriceOverrides
          )
        : []),
    source_package_id: input.packageId,
    vehicle_type: input.vehicle_type !== undefined ? input.vehicle_type : snapshot.vehicle_type,
    price_basis: input.price_basis ?? snapshot.price_basis ?? "whole_group",
    final_price: input.final_price !== undefined ? input.final_price : snapshot.final_price,
    optional_inclusion_keys:
      input.optional_inclusion_keys ?? snapshot.optional_inclusion_keys ?? [],
    inclusions: input.inclusions ?? snapshot.inclusions,
    internal_notes: input.internal_notes ?? snapshot.internal_notes,
    public_notes: input.public_notes ?? snapshot.public_notes,
    advance_percent: defaultAdvance,
  });

  snapshot = applyCostToSnapshot({
    ...snapshot,
    header: {
      ...snapshot.header,
      duration_label: durationLabelFromDays(snapshot.days),
    },
  });

  const revision = createRevision({
    itinerary_id: id,
    version_number: 1,
    parent_revision_id: null,
    snapshot,
    save_type: "manual",
    milestone_label: input.packageId ? "Created from catalog" : "Draft 1",
    created_by: actorName,
  });

  const record = buildRecordFromSnapshot(id, quote_id, snapshot, revision, {
    lead_id: input.lead_id ?? null,
    lead_source: input.lead_source ?? null,
    customer_id: input.customer_id ?? null,
    created_by: actorName,
    owner_name: actorName,
  });
  state.records.unshift(record);
  state.revisions[id] = [revision];
  saveState(state);

  void import("@/lib/itinerary-builder/sync-real").then(({ syncRecordToSupabaseIfReal }) =>
    syncRecordToSupabaseIfReal(record, revision)
  );
  void import("@/lib/system/activity-log").then(({ logActivity }) =>
    logActivity({
      action: "quote_create",
      module: "itinerary_builder",
      entity_type: "quote",
      entity_id: id,
      summary: `Created ${record.quote_id} for ${record.client_name}`,
    })
  );

  return record;
}

/** Persist a fully built wizard/preview snapshot as a new list itinerary. */
export function createClientItineraryFromSnapshot(
  snapshotInput: ItinerarySnapshot,
  meta?: {
    created_by?: string | null;
    owner_name?: string | null;
    lead_id?: string | null;
    lead_source?: ClientItineraryRecord["lead_source"];
    customer_id?: string | null;
  }
): ClientItineraryRecord {
  const state = loadState();
  const id = newUuid();
  const quote_id = nextQuoteId(state.records);
  const actorName = resolveActorName(meta?.owner_name ?? meta?.created_by);

  const tourCode = resolveTourCodeOnSave(
    snapshotInput.header.tour_code,
    existingTourCodes()
  );

  const snapshot = applyCostToSnapshot(
    normalizeSnapshot({
      ...snapshotInput,
      header: {
        ...snapshotInput.header,
        tour_code: tourCode,
        duration_label: durationLabelFromDays(snapshotInput.days),
      },
    })
  );

  const revision = createRevision({
    itinerary_id: id,
    version_number: 1,
    parent_revision_id: null,
    snapshot,
    save_type: "manual",
    milestone_label: snapshot.source_package_id ? "Created from catalog" : "Draft 1",
    created_by: actorName,
  });

  const record = buildRecordFromSnapshot(id, quote_id, snapshot, revision, {
    lead_id: meta?.lead_id ?? null,
    lead_source: meta?.lead_source ?? null,
    customer_id: meta?.customer_id ?? null,
    created_by: actorName,
    owner_name: actorName,
  });
  state.records.unshift(record);
  state.revisions[id] = [revision];
  saveState(state);

  void import("@/lib/itinerary-builder/sync-real").then(({ syncRecordToSupabaseIfReal }) =>
    syncRecordToSupabaseIfReal(record, revision)
  );
  void import("@/lib/system/activity-log").then(({ logActivity }) =>
    logActivity({
      action: "quote_create",
      module: "itinerary_builder",
      entity_type: "quote",
      entity_id: id,
      summary: `Created ${record.quote_id} for ${record.client_name}`,
    })
  );

  return record;
}

export function saveSnapshotRevision(
  itineraryId: string,
  snapshot: ItinerarySnapshot,
  options: {
    save_type?: RevisionSaveType;
    milestone_label?: string | null;
  } = {}
): { record: ClientItineraryRecord; revision: ItineraryRevision } | null {
  const state = loadState();
  const idx = state.records.findIndex((r) => r.id === itineraryId);
  if (idx < 0) return null;

  const record = state.records[idx];
  const prevRevs = state.revisions[itineraryId] ?? [];
  const prevRev = prevRevs.find((r) => r.id === record.current_revision_id) ?? prevRevs[0];
  const prevSnapshot = prevRev?.snapshot ? normalizeSnapshot(prevRev.snapshot) : null;
  const nextVersion = (prevRev?.version_number ?? 0) + 1;

  const tourCode = resolveTourCodeOnSave(
    snapshot.header.tour_code,
    existingTourCodes(itineraryId)
  );

  const normalized = applyCostToSnapshot(
    normalizeSnapshot({
      ...snapshot,
      header: {
        ...snapshot.header,
        tour_code: tourCode,
        duration_label: durationLabelFromDays(snapshot.days),
      },
    })
  );

  if (prevSnapshot) {
    for (const tier of normalized.category_pricing) {
      const prevTier = prevSnapshot.category_pricing.find((t) => t.category_key === tier.category_key);
      if (!prevTier) continue;

      const checks: { field: string; oldV: number | null; newV: number | null }[] = [
        {
          field: `${tier.category_key}.package_price`,
          oldV: prevTier.package_price,
          newV: tier.package_price,
        },
        {
          field: `${tier.category_key}.discount_price`,
          oldV: prevTier.discount_price,
          newV: tier.discount_price,
        },
        {
          field: `${tier.category_key}.manual_override`,
          oldV: prevTier.manual_override,
          newV: tier.manual_override,
        },
        {
          field: `${tier.category_key}.grand_total`,
          oldV: prevTier.grand_total,
          newV: tier.grand_total,
        },
      ];

      for (const c of checks) {
        if (c.oldV !== c.newV && (c.oldV != null || c.newV != null)) {
          logPricingChange(record, c.field, c.oldV, c.newV, {
            category_key: tier.category_key,
            revision_id: prevRev?.id ?? null,
          });
        }
      }
    }
  }

  const revision = createRevision({
    itinerary_id: itineraryId,
    version_number: nextVersion,
    parent_revision_id: prevRev?.id ?? null,
    snapshot: normalized,
    save_type: options.save_type ?? "manual",
    milestone_label: options.milestone_label ?? null,
    created_by: resolveActorName(),
    previous_snapshot: prevRev?.snapshot ?? null,
  });

  const nextRevs = [...prevRevs, revision];
  state.revisions[itineraryId] =
    nextRevs.length > MAX_REVISIONS_PER_ITINERARY
      ? nextRevs.slice(-MAX_REVISIONS_PER_ITINERARY)
      : nextRevs;
  state.records[idx] = syncRecordFromSnapshot(record, normalized, revision);
  saveState(state);

  // Production: require cloud sync — local-only success is not enough.
  void import("@/lib/itinerary-builder/sync-real").then(async ({ syncRecordToSupabaseIfReal }) => {
    const result = await syncRecordToSupabaseIfReal(state.records[idx], revision);
    if (!result.ok) {
      console.error("[itinerary] Supabase sync failed after save:", result.error);
    }
  });
  void import("@/lib/system/activity-log").then(({ logActivity }) =>
    logActivity({
      action: "quote_update",
      module: "itinerary_builder",
      entity_type: "quote",
      entity_id: itineraryId,
      summary: `${state.records[idx].quote_id} saved v${revision.version_number}`,
    })
  );

  return { record: state.records[idx], revision };
}

export function updateCategoryPricing(
  itineraryId: string,
  tiers: CategoryPricingTier[]
): ClientItineraryRecord | null {
  const snapshot = getCurrentSnapshot(itineraryId);
  if (!snapshot) return null;
  const updated = applyCostToSnapshot({ ...snapshot, category_pricing: tiers });
  const result = saveSnapshotRevision(itineraryId, updated, {
    save_type: "manual",
    milestone_label: "Pricing updated",
  });
  return result?.record ?? null;
}

export function rollbackToRevision(
  itineraryId: string,
  sourceRevisionId: string
): { record: ClientItineraryRecord; revision: ItineraryRevision } | null {
  const state = loadState();
  const revs = state.revisions[itineraryId] ?? [];
  const source = revs.find((r) => r.id === sourceRevisionId);
  if (!source) return null;

  const cloned = cloneSnapshot(normalizeSnapshot(source.snapshot));
  return saveSnapshotRevision(itineraryId, cloned, {
    save_type: "rollback",
    milestone_label: `Restored from v${source.version_number}`,
  });
}

export function updateWorkflowStatus(
  itineraryId: string,
  status: WorkflowStatus
): ClientItineraryRecord | null {
  const state = loadState();
  const idx = state.records.findIndex((r) => r.id === itineraryId);
  if (idx < 0) return null;
  state.records[idx] = {
    ...state.records[idx],
    workflow_status: status,
    updated_at: new Date().toISOString(),
  };
  saveState(state);
  void import("@/lib/itinerary-builder/sync-real").then(({ syncRecordMetaToSupabaseIfReal }) =>
    syncRecordMetaToSupabaseIfReal(state.records[idx])
  );
  void import("@/lib/system/activity-log").then(({ logActivity }) =>
    logActivity({
      action: "workflow_change",
      module: "itinerary_builder",
      entity_type: "quote",
      entity_id: itineraryId,
      summary: `${state.records[idx].quote_id} workflow → ${status}`,
      metadata: { workflow_status: status },
    })
  );
  return state.records[idx];
}

export function updatePaymentStatus(
  itineraryId: string,
  payment_status: PaymentStatus,
  amount_paid: number
): ClientItineraryRecord | null {
  const state = loadState();
  const idx = state.records.findIndex((r) => r.id === itineraryId);
  if (idx < 0) return null;
  const prev = state.records[idx];
  const paid = Number(amount_paid) || 0;
  const nextWorkflow =
    paid > 0 && isPendingStatus(prev.workflow_status)
      ? ("booking_confirmed" as WorkflowStatus)
      : prev.workflow_status;
  state.records[idx] = {
    ...prev,
    payment_status,
    amount_paid: paid,
    workflow_status: nextWorkflow,
    updated_at: new Date().toISOString(),
  };
  saveState(state);
  void import("@/lib/itinerary-builder/sync-real").then(({ syncRecordMetaToSupabaseIfReal }) =>
    syncRecordMetaToSupabaseIfReal(state.records[idx])
  );
  void import("@/lib/system/activity-log").then(({ logActivity }) =>
    logActivity({
      action: "payment_update",
      module: "itinerary_builder",
      entity_type: "quote",
      entity_id: itineraryId,
      summary: `${state.records[idx].quote_id} payment → ${payment_status} (₹${paid})`,
      metadata: { payment_status, amount_paid: paid, workflow_status: nextWorkflow },
    })
  );
  return state.records[idx];
}

export function softDeleteClientItinerary(id: string): boolean {
  const state = loadState();
  const idx = state.records.findIndex((r) => r.id === id);
  if (idx < 0) return false;
  state.records[idx] = {
    ...state.records[idx],
    deleted_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  saveState(state);
  void import("@/lib/itinerary-builder/sync-real").then(({ syncRecordMetaToSupabaseIfReal }) =>
    syncRecordMetaToSupabaseIfReal(state.records[idx])
  );
  void import("@/lib/system/activity-log").then(({ logActivity }) =>
    logActivity({
      action: "quote_delete",
      module: "itinerary_builder",
      entity_type: "quote",
      entity_id: id,
      summary: `${state.records[idx].quote_id} moved to trash`,
    })
  );
  return true;
}

export function restoreClientItinerary(id: string): boolean {
  const state = loadState();
  const idx = state.records.findIndex((r) => r.id === id);
  if (idx < 0) return false;
  state.records[idx] = {
    ...state.records[idx],
    deleted_at: null,
    updated_at: new Date().toISOString(),
  };
  saveState(state);
  void import("@/lib/itinerary-builder/sync-real").then(({ syncRecordMetaToSupabaseIfReal }) =>
    syncRecordMetaToSupabaseIfReal(state.records[idx])
  );
  return true;
}

export function deleteClientItinerary(id: string): boolean {
  return softDeleteClientItinerary(id);
}

export function cloneClientItinerary(id: string): ClientItineraryRecord | null {
  const state = loadState();
  const source = state.records.find((r) => r.id === id);
  const revs = state.revisions[id];
  if (!source || !revs?.length) return null;

  const current = revs.find((r) => r.id === source.current_revision_id) ?? revs[0];
  const newId = newUuid();
  const quote_id = nextQuoteId(state.records);
  const clonedSnap = cloneSnapshot(normalizeSnapshot(current.snapshot));
  clonedSnap.client = {
    ...clonedSnap.client,
    client_name: `${clonedSnap.client.client_name} (copy)`,
  };

  const revision = createRevision({
    itinerary_id: newId,
    version_number: 1,
    parent_revision_id: null,
    snapshot: applyCostToSnapshot(clonedSnap),
    save_type: "duplicate",
    milestone_label: `Cloned from ${source.quote_id}`,
    created_by: resolveActorName(),
  });

  const record = buildRecordFromSnapshot(newId, quote_id, clonedSnap, revision, {
    workflow_status: "draft",
  });
  state.records.unshift(record);
  state.revisions[newId] = [revision];
  saveState(state);
  void import("@/lib/itinerary-builder/sync-real").then(({ syncRecordToSupabaseIfReal }) =>
    syncRecordToSupabaseIfReal(record, revision)
  );
  void import("@/lib/system/activity-log").then(({ logActivity }) =>
    logActivity({
      action: "quote_create",
      module: "itinerary_builder",
      entity_type: "quote",
      entity_id: newId,
      summary: `Cloned ${record.quote_id} from ${source.quote_id}`,
    })
  );
  return record;
}

/** Server-side seed for RSC pages */
export function getServerItineraryBuilderSeed() {
  return {
    records: SEED_ITINERARY_RECORDS.map(normalizeRecord),
    revisions: SEED_REVISIONS,
  };
}

export function isPendingStatus(status: WorkflowStatus): boolean {
  return !["booking_confirmed", "completed", "archived"].includes(status);
}

/** Confirmed booking = client has paid some advance (or fully paid). */
export function hasAdvancePayment(record: Pick<ClientItineraryRecord, "amount_paid" | "payment_status">): boolean {
  if (Number(record.amount_paid) > 0) return true;
  return record.payment_status === "partial" || record.payment_status === "paid";
}

/** Pending quote = no advance yet (and not archived). */
export function isPendingQuote(record: ClientItineraryRecord): boolean {
  if (record.workflow_status === "archived") return false;
  return !hasAdvancePayment(record);
}

/** Confirmed booking list = advance received, or workflow already confirmed/completed. */
export function isConfirmedBooking(record: ClientItineraryRecord): boolean {
  if (record.workflow_status === "archived") return false;
  if (hasAdvancePayment(record)) return true;
  return record.workflow_status === "booking_confirmed" || record.workflow_status === "completed";
}
