/**
 * Cache adapter for CRP reads — swap implementation later without service API changes.
 */

export type CrpCache = {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
};

export class PassthroughCrpCache implements CrpCache {
  async get<T>(_key: string): Promise<T | null> {
    return null;
  }
  async set<T>(_key: string, _value: T, _ttlSeconds?: number): Promise<void> {}
}

let active: CrpCache = new PassthroughCrpCache();

/** Inject CRP cache backend. */
export function setCrpCache(cache: CrpCache): void {
  active = cache;
}

/** Active CRP cache. */
export function getCrpCache(): CrpCache {
  return active;
}

/** Read-through helper. */
export async function withCrpCache<T>(
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
