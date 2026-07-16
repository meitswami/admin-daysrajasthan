import { INTELLIGENCE_CACHE_PREFIX } from "../constants";

export type IntelligenceCache = {
  get: <T>(key: string) => Promise<T | null> | T | null;
  set: <T>(key: string, value: T, ttlMs?: number) => Promise<void> | void;
};

const memory = new Map<string, { value: unknown; expiresAt: number | null }>();

export const PassthroughIntelligenceCache: IntelligenceCache = {
  get: () => null,
  set: () => undefined,
};

export const InMemoryIntelligenceCache: IntelligenceCache = {
  get: <T>(key: string) => {
    const hit = memory.get(key);
    if (!hit) return null;
    if (hit.expiresAt != null && Date.now() > hit.expiresAt) {
      memory.delete(key);
      return null;
    }
    return hit.value as T;
  },
  set: <T>(key: string, value: T, ttlMs?: number) => {
    memory.set(key, {
      value,
      expiresAt: ttlMs != null ? Date.now() + ttlMs : null,
    });
  },
};

let active: IntelligenceCache = InMemoryIntelligenceCache;

export function setIntelligenceCache(cache: IntelligenceCache): void {
  active = cache;
}

export function getIntelligenceCache(): IntelligenceCache {
  return active;
}

export function cacheKey(parts: string[]): string {
  return `${INTELLIGENCE_CACHE_PREFIX}${parts.join(":")}`;
}

export async function withIntelligenceCache<T>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T>
): Promise<T> {
  const cached = await active.get<T>(key);
  if (cached != null) return cached;
  const value = await loader();
  await active.set(key, value, ttlMs);
  return value;
}

export const SUBMODULE = {
  parent: "intelligence" as const,
  id: "cache" as const,
  description: "Cache coordination (future ai_cache)",
} as const;
