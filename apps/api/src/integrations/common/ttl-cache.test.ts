import { describe, expect, it, vi } from "vitest";
import { cacheKey, TtlCache } from "./ttl-cache.js";

describe("cacheKey", () => {
  it("ignores object key order and undefined values", () => {
    expect(cacheKey("pulls", "acme/api", { state: "open", limit: 30, x: undefined })).toBe(
      cacheKey("pulls", "acme/api", { limit: 30, state: "open" }),
    );
  });

  it("distinguishes parts and params", () => {
    expect(cacheKey("pulls", "acme/api", { state: "open" })).not.toBe(
      cacheKey("pulls", "acme/api", { state: "closed" }),
    );
    expect(cacheKey(1, "runs", "acme/api")).not.toBe(cacheKey(2, "runs", "acme/api"));
    expect(cacheKey("a/b", "c")).not.toBe(cacheKey("a", "b/c"));
  });

  it("sorts nested objects", () => {
    expect(cacheKey({ q: { b: 1, a: 2 } })).toBe(cacheKey({ q: { a: 2, b: 1 } }));
  });
});

describe("TtlCache", () => {
  it("memoizes and shares in-flight loads", async () => {
    const cache = new TtlCache({ ttlMs: 60_000, max: 10 });
    const load = vi.fn(async () => 42);
    const [a, b] = await Promise.all([cache.getOrLoad("k", load), cache.getOrLoad("k", load)]);
    expect([a, b, await cache.getOrLoad("k", load)]).toEqual([42, 42, 42]);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("does not cache failures", async () => {
    const cache = new TtlCache({ ttlMs: 60_000, max: 10 });
    await expect(cache.getOrLoad("k", () => Promise.reject(new Error("boom")))).rejects.toThrow("boom");
    await expect(cache.getOrLoad("k", async () => "ok")).resolves.toBe("ok");
  });

  it("expires entries after the ttl", async () => {
    const cache = new TtlCache({ ttlMs: 20, max: 10 });
    const load = vi.fn(async () => "value");
    await cache.getOrLoad("k", load);
    await new Promise((resolve) => setTimeout(resolve, 40));
    await cache.getOrLoad("k", load);
    expect(load).toHaveBeenCalledTimes(2);
  });
});
