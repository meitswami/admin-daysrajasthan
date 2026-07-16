/**
 * Cache adapter contract — services always call through this.
 * Swap PassthroughKnowledgeCache for Redis/memory later without changing service signatures.
 */

export type KnowledgeCache = {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  delete?(key: string): Promise<void>;
};

/** No-op cache used until a real store is configured. */
export class PassthroughKnowledgeCache implements KnowledgeCache {
  async get<T>(_key: string): Promise<T | null> {
    return null;
  }

  async set<T>(_key: string, _value: T, _ttlSeconds?: number): Promise<void> {
    // intentionally empty — ready for Redis/memory later
  }
}

let activeCache: KnowledgeCache = new PassthroughKnowledgeCache();

/**
 * Replace the active Knowledge cache implementation (tests / future wiring).
 */
export function setKnowledgeCache(cache: KnowledgeCache): void {
  activeCache = cache;
}

/**
 * Returns the active Knowledge cache adapter.
 */
export function getKnowledgeCache(): KnowledgeCache {
  return activeCache;
}

/**
 * Read-through helper used by services.
 */
export async function withKnowledgeCache<T>(
  key: string,
  loader: () => Promise<T>,
  ttlSeconds?: number
): Promise<T> {
  const cache = getKnowledgeCache();
  const hit = await cache.get<T>(key);
  if (hit !== null) return hit;
  const value = await loader();
  await cache.set(key, value, ttlSeconds);
  return value;
}
