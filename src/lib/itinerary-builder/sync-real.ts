import { isRealDataMode, isSupabaseConfigured } from "@/lib/system/data-mode";
import {
  mergeRevisionsForItinerary,
  replaceItineraryBuilderState,
} from "@/lib/itinerary-builder/state-store";
import { listClientItineraries } from "@/lib/itinerary-builder/storage";
import type { ClientItineraryRecord, ItineraryRevision } from "@/types/itinerary-builder";

export async function syncRecordToSupabaseIfReal(
  record: ClientItineraryRecord,
  revision: ItineraryRevision
): Promise<void> {
  if (!isRealDataMode() || !isSupabaseConfigured()) return;
  try {
    const { upsertClientItineraryToSupabase } = await import(
      "@/lib/supabase/itinerary-builder-queries"
    );
    await upsertClientItineraryToSupabase(record, revision);
  } catch (e) {
    console.warn("[sync] Supabase upsert failed", e);
  }
}

export async function syncRecordMetaToSupabaseIfReal(record: ClientItineraryRecord): Promise<void> {
  if (!isRealDataMode() || !isSupabaseConfigured()) return;
  try {
    const { upsertClientItineraryRecordOnly } = await import(
      "@/lib/supabase/itinerary-builder-queries"
    );
    await upsertClientItineraryRecordOnly(record);
  } catch (e) {
    console.warn("[sync] Supabase record update failed", e);
  }
}

export async function pullRecordsFromSupabaseIfReal(): Promise<ClientItineraryRecord[] | null> {
  if (!isRealDataMode() || !isSupabaseConfigured()) return null;
  try {
    const { fetchClientItinerariesFromSupabase } = await import(
      "@/lib/supabase/itinerary-builder-queries"
    );
    return await fetchClientItinerariesFromSupabase();
  } catch (e) {
    console.warn("[sync] Supabase fetch failed", e);
    return null;
  }
}

/** Replace local itinerary builder cache with Supabase records (Real mode). */
export async function hydrateItineraryBuilderFromSupabaseIfReal(): Promise<ClientItineraryRecord[]> {
  const remote = await pullRecordsFromSupabaseIfReal();
  if (remote === null) return listClientItineraries();

  replaceItineraryBuilderState(remote);
  return remote;
}

export async function pullRevisionsFromSupabaseIfReal(
  itineraryId: string
): Promise<ItineraryRevision[] | null> {
  if (!isRealDataMode() || !isSupabaseConfigured()) return null;
  try {
    const { fetchRevisionsForItinerary } = await import(
      "@/lib/supabase/itinerary-builder-queries"
    );
    const revisions = await fetchRevisionsForItinerary(itineraryId);
    if (revisions.length > 0) {
      mergeRevisionsForItinerary(itineraryId, revisions);
    }
    return revisions;
  } catch (e) {
    console.warn("[sync] Supabase revisions fetch failed", e);
    return null;
  }
}
