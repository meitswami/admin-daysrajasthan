import { createClient } from "@/lib/supabase/client";
import type { ClientItineraryRecord, ItineraryRevision } from "@/types/itinerary-builder";

export async function fetchClientItinerariesFromSupabase(): Promise<ClientItineraryRecord[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("client_itineraries")
    .select("*")
    .eq("type", "client_itinerary")
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    quote_id: row.quote_id,
    type: "client_itinerary" as const,
    title: row.title,
    tour_code: row.tour_code,
    workflow_status: row.workflow_status,
    current_revision_id: row.current_revision_id ?? "",
    current_version: row.current_version ?? 1,
    created_by: row.owner_id ?? "System",
    owner_name: row.owner_id ?? "System",
    created_at: row.created_at,
    updated_at: row.updated_at,
    client_name: row.client_name,
    client_email: row.client_email,
    client_phone: row.client_phone,
    travel_date: row.travel_date,
    adults: row.adults ?? 2,
    children: row.children ?? 0,
    rooms: row.rooms ?? 1,
    grand_total: Number(row.grand_total ?? 0),
    category_totals: (row.category_totals as ClientItineraryRecord["category_totals"]) ?? [],
    currency: row.currency ?? "INR",
    margin_pct: Number(row.margin_pct ?? 0),
    payment_status: row.payment_status ?? "unpaid",
    amount_paid: Number(row.amount_paid ?? 0),
    deleted_at: row.deleted_at,
    source_package_id: row.source_package_id,
    lead_id: row.lead_id,
    lead_source: row.lead_source,
    customer_id: row.customer_id ?? null,
  }));
}

export async function fetchRevisionsForItinerary(itineraryId: string): Promise<ItineraryRevision[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("itinerary_revisions")
    .select("*")
    .eq("itinerary_id", itineraryId)
    .order("version_number", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    itinerary_id: row.itinerary_id,
    version_number: row.version_number,
    parent_revision_id: row.parent_revision_id,
    milestone_label: row.milestone_label,
    change_summary: row.change_summary,
    save_type: row.save_type,
    snapshot: row.snapshot,
    created_by: row.created_by ?? "System",
    created_at: row.created_at,
  }));
}

function recordPayload(
  record: ClientItineraryRecord,
  currentRevisionId: string | null
) {
  return {
    id: record.id,
    quote_id: record.quote_id,
    type: record.type,
    title: record.title,
    tour_code: record.tour_code,
    workflow_status: record.workflow_status,
    current_revision_id: currentRevisionId,
    current_version: record.current_version,
    client_name: record.client_name,
    client_email: record.client_email,
    client_phone: record.client_phone,
    travel_date: record.travel_date,
    adults: record.adults,
    children: record.children,
    rooms: record.rooms,
    grand_total: record.grand_total,
    category_totals: record.category_totals,
    currency: record.currency,
    margin_pct: record.margin_pct,
    payment_status: record.payment_status,
    amount_paid: record.amount_paid,
    deleted_at: record.deleted_at,
    source_package_id: record.source_package_id,
    lead_id: record.lead_id,
    lead_source: record.lead_source,
    customer_id: record.customer_id,
    updated_at: record.updated_at,
  };
}

/**
 * Persist itinerary + revision(s). Ordered to satisfy fk_current_revision:
 * record (null pointer) → revisions (version order) → record pointer update.
 */
export async function upsertClientItineraryToSupabase(
  record: ClientItineraryRecord,
  revision: ItineraryRevision,
  allRevisions: ItineraryRevision[] = [revision]
): Promise<void> {
  const supabase = createClient();

  const { error: recError } = await supabase
    .from("client_itineraries")
    .upsert(recordPayload(record, null));

  if (recError) throw recError;

  const byVersion = [...allRevisions].sort(
    (a, b) => a.version_number - b.version_number
  );
  const knownIds = new Set(byVersion.map((r) => r.id));
  if (!knownIds.has(revision.id)) {
    byVersion.push(revision);
    byVersion.sort((a, b) => a.version_number - b.version_number);
    knownIds.add(revision.id);
  }

  for (const rev of byVersion) {
    const parentId =
      rev.parent_revision_id && knownIds.has(rev.parent_revision_id)
        ? rev.parent_revision_id
        : null;

    const { error: revError } = await supabase.from("itinerary_revisions").upsert({
      id: rev.id,
      itinerary_id: record.id,
      version_number: rev.version_number,
      parent_revision_id: parentId,
      milestone_label: rev.milestone_label,
      change_summary: rev.change_summary,
      save_type: rev.save_type,
      snapshot: rev.snapshot,
      created_at: rev.created_at,
    });

    if (revError) throw revError;
  }

  const { error: pointerError } = await supabase
    .from("client_itineraries")
    .update({
      current_revision_id: revision.id,
      current_version: record.current_version,
      updated_at: record.updated_at,
    })
    .eq("id", record.id);

  if (pointerError) throw pointerError;
}

export async function upsertClientItineraryRecordOnly(record: ClientItineraryRecord): Promise<void> {
  const supabase = createClient();

  // Avoid fk_current_revision failures when the revision row is not remote yet:
  // update fields only if the row exists; otherwise upsert with a null pointer.
  const { data: existing, error: existingError } = await supabase
    .from("client_itineraries")
    .select("id, current_revision_id")
    .eq("id", record.id)
    .maybeSingle();

  if (existingError) throw existingError;

  if (existing) {
    const { error } = await supabase
      .from("client_itineraries")
      .update({
        quote_id: record.quote_id,
        type: record.type,
        title: record.title,
        tour_code: record.tour_code,
        workflow_status: record.workflow_status,
        current_version: record.current_version,
        client_name: record.client_name,
        client_email: record.client_email,
        client_phone: record.client_phone,
        travel_date: record.travel_date,
        adults: record.adults,
        children: record.children,
        rooms: record.rooms,
        grand_total: record.grand_total,
        category_totals: record.category_totals,
        currency: record.currency,
        margin_pct: record.margin_pct,
        payment_status: record.payment_status,
        amount_paid: record.amount_paid,
        deleted_at: record.deleted_at,
        source_package_id: record.source_package_id,
        lead_id: record.lead_id,
        lead_source: record.lead_source,
        customer_id: record.customer_id,
        updated_at: record.updated_at,
      })
      .eq("id", record.id);
    if (error) throw error;
    return;
  }

  const { error } = await supabase
    .from("client_itineraries")
    .upsert(recordPayload(record, null));

  if (error) throw error;
}

export async function fetchSystemDataMode(): Promise<"dummy" | "real" | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("td_system_settings")
    .select("value")
    .eq("key", "data_mode")
    .maybeSingle();

  if (error || !data) return null;
  const val = data.value;
  if (val === "real" || val === '"real"') return "real";
  if (typeof val === "string" && val.includes("real")) return "real";
  return "dummy";
}

export async function setSystemDataMode(mode: "dummy" | "real"): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("td_system_settings").upsert({
    key: "data_mode",
    value: mode,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}
