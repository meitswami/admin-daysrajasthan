/**
 * Persistence for Travel Memory + future ai_cache / ai_logs hooks.
 * Never queries tourism Supabase tables.
 */

import { EMPTY_TRAVEL_MEMORY } from "./constants";
import type { TravelMemoryProfile } from "./types";

const memoryStore = new Map<string, TravelMemoryProfile>();

function keyFor(customerId: string | null, sessionId: string | null): string | null {
  if (customerId) return `customer:${customerId}`;
  if (sessionId) return `session:${sessionId}`;
  return null;
}

export async function repoGetTravelMemory(input: {
  customerId?: string | null;
  sessionId?: string | null;
}): Promise<TravelMemoryProfile | null> {
  const key = keyFor(input.customerId ?? null, input.sessionId ?? null);
  if (!key) return null;
  return memoryStore.get(key) ?? null;
}

export async function repoSaveTravelMemory(
  profile: TravelMemoryProfile,
  sessionId?: string | null
): Promise<TravelMemoryProfile> {
  const key = keyFor(profile.customerId, sessionId ?? null);
  if (!key) {
    return { ...profile, updatedAt: new Date().toISOString() };
  }
  const next: TravelMemoryProfile = {
    ...EMPTY_TRAVEL_MEMORY(profile.customerId),
    ...profile,
    updatedAt: new Date().toISOString(),
  };
  memoryStore.set(key, next);
  return next;
}

export async function repoClearTravelMemory(input: {
  customerId?: string | null;
  sessionId?: string | null;
}): Promise<void> {
  const key = keyFor(input.customerId ?? null, input.sessionId ?? null);
  if (key) memoryStore.delete(key);
}

/** Future: ai_cache / ai_logs table adapters plug in here — not tourism facts. */
export type IntelligenceRepository = {
  getTravelMemory: typeof repoGetTravelMemory;
  saveTravelMemory: typeof repoSaveTravelMemory;
  clearTravelMemory: typeof repoClearTravelMemory;
};

export const defaultIntelligenceRepository: IntelligenceRepository = {
  getTravelMemory: repoGetTravelMemory,
  saveTravelMemory: repoSaveTravelMemory,
  clearTravelMemory: repoClearTravelMemory,
};
