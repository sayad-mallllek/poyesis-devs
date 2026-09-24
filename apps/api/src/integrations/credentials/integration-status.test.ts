import { describe, expect, it } from "vitest";
import { toStringRecord } from "./credential-store.js";
import { tokenHint, toIntegrationStatus } from "./integration-status.js";

describe("integration status", () => {
  it("describes an unconfigured provider", () => {
    expect(toIntegrationStatus("SENTRY", null)).toEqual({
      provider: "SENTRY",
      configured: false,
      config: {},
      tokenHint: null,
      lastVerifiedAt: null,
      lastError: null,
      updatedAt: null,
    });
  });

  it("exposes only non-secret fields", () => {
    const status = toIntegrationStatus("GITHUB", {
      tokenHint: tokenHint("ghp_abcdefghijklmnopqrstuvwxyz0123456789"),
      config: { apiBaseUrl: "https://api.github.com" },
      lastVerifiedAt: new Date("2026-09-24T09:00:00.000Z"),
      lastError: null,
      updatedAt: new Date("2026-09-24T09:00:00.000Z"),
    });
    expect(status).toEqual({
      provider: "GITHUB",
      configured: true,
      config: { apiBaseUrl: "https://api.github.com" },
      tokenHint: "6789",
      lastVerifiedAt: "2026-09-24T09:00:00.000Z",
      lastError: null,
      updatedAt: "2026-09-24T09:00:00.000Z",
    });
  });

  it("keeps only string config values", () => {
    expect(toStringRecord({ a: "x", b: 1, c: null, d: { e: "f" } })).toEqual({ a: "x" });
    expect(toStringRecord(null)).toEqual({});
    expect(toStringRecord(["a"])).toEqual({});
  });
});
