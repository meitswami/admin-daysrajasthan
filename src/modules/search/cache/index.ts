/**
 * Search cache abstraction — Redis/compatible later without API changes.
 */

export type SearchCache = {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
};

export class PassthroughSearchCache implements SearchCache {
  async get<T>(_key: string): Promise<T | null> {
    return null;
  }
  async set<T>(_key: string, _value: T, _ttlSeconds?: number): Promise<void> {}
}

let active: SearchCache = new PassthroughSearchCache();

/** Inject search cache backend. */
export function setSearchCache(cache: SearchCache): void {
  active = cache;
}

/** Active search cache. */
export function getSearchCache(): SearchCache {
  return active;
}

/** Read-through cache helper. */
export async function withSearchCache<T>(
  key: string,
  loader: () => Promise<T>,
  ttlSeconds?: number
): Promise<T> {
  const hit = await active.get<T>(key);
  if (hit !== null) return hit;
  const value = await loader();
  await active.set(key, value, ttlSeconds);
  return value;
}
