import { LRUCache } from "lru-cache";

/**
 * Deterministic cache key: object keys are sorted and `undefined` values are
 * dropped, so `{ a: 1, b: undefined }` and `{ a: 1 }` share an entry.
 */
export function cacheKey(...parts: unknown[]): string {
  return JSON.stringify(parts, (_key, value: unknown) =>
    value && typeof value === "object" && !Array.isArray(value)
      ? Object.fromEntries(
          Object.entries(value)
            .filter(([, v]) => v !== undefined)
            .sort(([a], [b]) => a.localeCompare(b)),
        )
      : value,
  );
}

/**
 * Short-lived memoization of upstream API responses. Concurrent lookups of a
 * missing key share one in-flight load; failed loads are not cached.
 */
export class TtlCache {
  private readonly entries: LRUCache<string, { value: unknown }>;
  private readonly inflight = new Map<string, Promise<unknown>>();

  constructor({ ttlMs, max }: { ttlMs: number; max: number }) {
    this.entries = new LRUCache({ ttl: ttlMs, max });
  }

  async getOrLoad<T>(key: string, load: () => Promise<T>): Promise<T> {
    const hit = this.entries.get(key);
    if (hit) return hit.value as T;
    const pending = this.inflight.get(key);
    if (pending) return pending as Promise<T>;

    const promise = load()
      .then((value) => {
        this.entries.set(key, { value });
        return value;
      })
      .finally(() => this.inflight.delete(key));
    this.inflight.set(key, promise);
    return promise;
  }
}
