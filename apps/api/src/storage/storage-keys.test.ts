import { describe, expect, it } from "vitest";
import { createStorageKey, isValidStorageKey, resolveStoragePath } from "./storage-keys.js";

describe("storage keys", () => {
  it("creates unique keys under a scope", () => {
    const a = createStorageKey("projects", "clx123");
    const b = createStorageKey("projects", "clx123");
    expect(a).toMatch(/^projects\/clx123\/[0-9a-f-]{36}$/);
    expect(a).not.toBe(b);
  });

  it("refuses unsafe scope segments", () => {
    expect(() => createStorageKey("..", "x")).toThrow();
    expect(() => createStorageKey("projects/../../etc")).toThrow();
    expect(() => createStorageKey("")).toThrow();
  });

  it.each([
    "../etc/passwd",
    "projects/../../secret",
    "/etc/passwd",
    "projects//x",
    "projects/.hidden",
    "projects\\..\\x",
    "projects/x y",
    "projects/%2e%2e",
    "",
  ])("rejects %j", (key) => {
    expect(isValidStorageKey(key)).toBe(false);
    expect(() => resolveStoragePath("/srv/storage", key)).toThrow();
  });

  it("resolves valid keys inside the root", () => {
    expect(resolveStoragePath("/srv/storage", "projects/p1/abc")).toBe("/srv/storage/projects/p1/abc");
    expect(resolveStoragePath("/srv/storage/", "a")).toBe("/srv/storage/a");
  });
});
