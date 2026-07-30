import { isRealDataMode, isSupabaseConfigured } from "@/lib/system/data-mode";
import {
  readItineraryBuilderState,
  replaceItineraryBuilderState,
  mergeRevisionsForItinerary,
} from "@/lib/itinerary-builder/state-store";
import { listClientItineraries } from "@/lib/itinerary-builder/storage";
import type { ClientItineraryRecord, ItineraryRevision } from "@/types/itinerary-builder";

export type SyncResult = { ok: true } | { ok: false; error: string };

function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  return "Unknown sync error";
}

export async function syncRecordToSupabaseIfReal(
  record: ClientItineraryRecord,
  revision: ItineraryRevision
): Promise<SyncResult> {
  if (!isRealDataMode() || !isSupabaseConfigured()) return { ok: true };
  try {
    const { upsertClientItineraryToSupabase } = await import(
      "@/lib/supabase/itinerary-builder-queries"
    );
    const state = readItineraryBuilderState();
    const allRevisions = state.revisions[record.id] ?? [revision];
    await upsertClientItineraryToSupabase(record, revision, allRevisions);
    return { ok: true };
  } catch (e) {
    console.warn("[sync] Supabase upsert failed", e);
    return { ok: false, error: errorMessage(e) };
  }
}

export async function syncRecordMetaToSupabaseIfReal(record: ClientItineraryRecord): Promise<SyncResult> {
  if (!isRealDataMode() || !isSupabaseConfigured()) return { ok: true };
  try {
    const { upsertClientItineraryRecordOnly } = await import(
      "@/lib/supabase/itinerary-builder-queries"
    );
    await upsertClientItineraryRecordOnly(record);
    return { ok: true };
  } catch (e) {
    console.warn("[sync] Supabase record update failed", e);
    return { ok: false, error: errorMessage(e) };
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

/**
 * Merge remote client itineraries into local cache without dropping
 * unsynced local quotes (hydrate used to hard-replace and wipe them).
 */
export async function hydrateItineraryBuilderFromSupabaseIfReal(): Promise<ClientItineraryRecord[]> {
  const remote = await pullRecordsFromSupabaseIfReal();
  if (remote === null) return listClientItineraries();

  const localState = readItineraryBuilderState();
  const remoteById = new Map(remote.map((r) => [r.id, r]));
  const mergedById = new Map(remote.map((r) => [r.id, r]));

  for (const loc of localState.records) {
    if (loc.type !== "client_itinerary") continue;
    const rem = remoteById.get(loc.id);
    if (!rem) {
      // Pending cloud sync — keep local so Save results stay visible
      mergedById.set(loc.id, loc);
      continue;
    }
    // Prefer local when it has a real creator name and remote still does not
    const remOwner = (rem.owner_name ?? "").trim();
    const locOwner = (loc.owner_name ?? "").trim();
    const remoteMissingOwner = !remOwner || remOwner === "—" || remOwner === "System";
    const localHasOwner = Boolean(locOwner && locOwner !== "—" && locOwner !== "System");
    if (remoteMissingOwner && localHasOwner) {
      mergedById.set(loc.id, {
        ...rem,
        owner_name: loc.owner_name,
        created_by: loc.created_by || loc.owner_name,
      });
      continue;
    }
    if (new Date(loc.updated_at).getTime() > new Date(rem.updated_at).getTime()) {
      mergedById.set(loc.id, loc);
    }
  }

  const merged = [...mergedById.values()].sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );

  replaceItineraryBuilderState(merged, localState.revisions);
  return listClientItineraries();
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
