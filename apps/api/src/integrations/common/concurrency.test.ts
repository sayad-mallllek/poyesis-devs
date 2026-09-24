import type { Logger } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { collectAcross, mapWithConcurrency } from "./concurrency.js";

const logger = { warn: vi.fn() } as unknown as Logger;

describe("mapWithConcurrency", () => {
  it("caps in-flight calls and keeps order", async () => {
    let active = 0;
    let peak = 0;
    const result = await mapWithConcurrency([30, 10, 20, 5, 15], 2, async (ms) => {
      peak = Math.max(peak, ++active);
      await new Promise((resolve) => setTimeout(resolve, ms));
      active--;
      return ms * 2;
    });
    expect(result).toEqual([60, 20, 40, 10, 30]);
    expect(peak).toBe(2);
  });

  it("handles empty input", async () => {
    expect(await mapWithConcurrency([], 3, async () => 1)).toEqual([]);
  });
});

describe("collectAcross", () => {
  const options = { limit: 2, logger, describe: (s: string) => s };

  it("skips failing sources", async () => {
    const result = await collectAcross(["a", "bad", "c"], async (s) => {
      if (s === "bad") throw new Error("nope");
      return [s, s];
    }, options);
    expect(result).toEqual(["a", "a", "c", "c"]);
    expect(logger.warn).toHaveBeenCalled();
  });

  it("rethrows when every source fails", async () => {
    await expect(
      collectAcross(["a", "b"], async () => Promise.reject(new Error("revoked")), options),
    ).rejects.toThrow("revoked");
  });
});
