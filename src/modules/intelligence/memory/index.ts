import { EMPTY_TRAVEL_MEMORY } from "../constants";
import {
  repoClearTravelMemory,
  repoGetTravelMemory,
  repoSaveTravelMemory,
} from "../repository";
import type { TravelMemoryProfile } from "../types";

/**
 * Travel Memory — preferences for repeat recommendations.
 * Not ChatGPT-style unbounded chat memory.
 */
export async function loadTravelMemory(input: {
  customerId?: string | null;
  sessionId?: string | null;
  inline?: TravelMemoryProfile | null;
}): Promise<TravelMemoryProfile | null> {
  if (input.inline) return input.inline;
  return repoGetTravelMemory({
    customerId: input.customerId,
    sessionId: input.sessionId,
  });
}

export async function upsertTravelMemory(
  patch: Partial<TravelMemoryProfile> & { customerId: string | null },
  sessionId?: string | null
): Promise<TravelMemoryProfile> {
  const existing =
    (await repoGetTravelMemory({
      customerId: patch.customerId,
      sessionId,
    })) ?? EMPTY_TRAVEL_MEMORY(patch.customerId);

  const merged: TravelMemoryProfile = {
    ...existing,
    ...patch,
    preferredDestinations:
      patch.preferredDestinations ?? existing.preferredDestinations,
    notes: patch.notes ?? existing.notes,
  };
  return repoSaveTravelMemory(merged, sessionId);
}

export async function clearTravelMemory(input: {
  customerId?: string | null;
  sessionId?: string | null;
}): Promise<void> {
  await repoClearTravelMemory(input);
}

export const SUBMODULE = {
  parent: "intelligence" as const,
  id: "memory" as const,
  description: "Optional Travel Memory (budget, style, party, language, etc.)",
} as const;
