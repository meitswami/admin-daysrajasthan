import type { ItineraryShareLink, ItinerarySnapshot } from "@/types/itinerary-builder";
import { SEED_ITINERARY_RECORDS, SEED_REVISIONS } from "@/lib/data/itinerary-builder-mock";
import { newUuid } from "@/lib/itinerary-builder/defaults";

/** Demo share token — works without creating a link first */
export const DEMO_SHARE_TOKEN = "qrt807-demo-share";

type ShareStore = Map<string, ItineraryShareLink>;

const globalStore = globalThis as unknown as { __itineraryShareStore?: ShareStore };

function getStore(): ShareStore {
  if (!globalStore.__itineraryShareStore) {
    globalStore.__itineraryShareStore = new Map();
    seedDemoShare();
  }
  return globalStore.__itineraryShareStore;
}

function seedDemoShare() {
  const record = SEED_ITINERARY_RECORDS.find((r) => r.quote_id === "QRT807");
  if (!record) return;
  const revs = SEED_REVISIONS[record.id];
  const rev = revs?.[revs.length - 1] ?? revs?.[0];
  if (!rev) return;

  globalStore.__itineraryShareStore!.set(DEMO_SHARE_TOKEN, {
    token: DEMO_SHARE_TOKEN,
    itinerary_id: record.id,
    revision_id: rev.id,
    quote_id: record.quote_id,
    version_number: rev.version_number,
    snapshot: rev.snapshot,
    client_name: record.client_name,
    pin: null,
    expires_at: null,
    created_at: rev.created_at,
    created_by: "Admin",
    view_count: 0,
    accepted_at: null,
    accepted_by_name: null,
  });
}

export function createShareLink(input: {
  itinerary_id: string;
  revision_id: string;
  quote_id: string;
  version_number: number;
  snapshot: ItinerarySnapshot;
  client_name: string;
  pin?: string | null;
  expires_at?: string | null;
  created_by?: string;
}): ItineraryShareLink {
  const token = newUuid().replace(/-/g, "").slice(0, 16);
  const link: ItineraryShareLink = {
    token,
    itinerary_id: input.itinerary_id,
    revision_id: input.revision_id,
    quote_id: input.quote_id,
    version_number: input.version_number,
    snapshot: input.snapshot,
    client_name: input.client_name,
    pin: input.pin ?? null,
    expires_at: input.expires_at ?? null,
    created_at: new Date().toISOString(),
    created_by: input.created_by ?? "Admin",
    view_count: 0,
    accepted_at: null,
    accepted_by_name: null,
  };
  getStore().set(token, link);
  return link;
}

export function getShareLink(token: string): ItineraryShareLink | null {
  return getStore().get(token) ?? null;
}

export function recordShareView(token: string): ItineraryShareLink | null {
  const link = getStore().get(token);
  if (!link) return null;
  link.view_count += 1;
  getStore().set(token, link);
  return link;
}

export function acceptShareLink(
  token: string,
  acceptedByName: string
): ItineraryShareLink | null {
  const link = getStore().get(token);
  if (!link) return null;
  link.accepted_at = new Date().toISOString();
  link.accepted_by_name = acceptedByName;
  getStore().set(token, link);
  return link;
}

export function verifySharePin(link: ItineraryShareLink, pin: string | null): boolean {
  if (!link.pin) return true;
  return pin === link.pin;
}

export function isShareExpired(link: ItineraryShareLink): boolean {
  if (!link.expires_at) return false;
  return new Date(link.expires_at).getTime() < Date.now();
}
