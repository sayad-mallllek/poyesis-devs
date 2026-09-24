import { HttpStatus } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import { toUpstreamHttpError } from "./upstream-error.js";

const now = new Date("2026-09-24T10:00:00.000Z");

describe("toUpstreamHttpError", () => {
  it("maps bad credentials to 424", () => {
    const error = toUpstreamHttpError("GitHub", { status: 401, message: "Bad credentials" }, undefined, now);
    expect(error.getStatus()).toBe(HttpStatus.FAILED_DEPENDENCY);
    expect(error.message).toBe("GitHub token is invalid or lacks access");
  });

  it("maps a primary rate limit with its reset time", () => {
    const error = toUpstreamHttpError(
      "GitHub",
      {
        status: 403,
        message: "API rate limit exceeded for user ID 1.",
        headers: { "x-ratelimit-remaining": "0", "x-ratelimit-reset": "1790244000" },
      },
      undefined,
      now,
    );
    expect(error.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
    expect(error.message).toBe(`GitHub API rate limit exceeded; retry after ${new Date(1790244000 * 1000).toISOString()}`);
  });

  it("maps a secondary rate limit using retry-after", () => {
    const error = toUpstreamHttpError(
      "GitHub",
      { status: 403, message: "You have exceeded a secondary rate limit", headers: { "retry-after": "60" } },
      undefined,
      now,
    );
    expect(error.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
    expect(error.message).toContain("2026-09-24T10:01:00.000Z");
  });

  it("maps Sentry 429 without headers", () => {
    const error = toUpstreamHttpError("Sentry", { status: 429, message: "Too Many Requests" }, undefined, now);
    expect(error.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
    expect(error.message).toBe("Sentry API rate limit exceeded");
  });

  it("treats a plain 403 as missing access", () => {
    const error = toUpstreamHttpError("Sentry", { status: 403, message: "Forbidden" }, undefined, now);
    expect(error.getStatus()).toBe(HttpStatus.FAILED_DEPENDENCY);
  });

  it("uses the caller's not-found message", () => {
    const error = toUpstreamHttpError("GitHub", { status: 404, message: "Not Found" }, "Repository acme/x was not found");
    expect(error.getStatus()).toBe(HttpStatus.NOT_FOUND);
    expect(error.message).toBe("Repository acme/x was not found");
  });

  it("maps network failures and server errors to 502", () => {
    expect(toUpstreamHttpError("GitHub", { message: "fetch failed" }).getStatus()).toBe(HttpStatus.BAD_GATEWAY);
    const error = toUpstreamHttpError("Sentry", { status: 500, message: "Internal Error" });
    expect(error.getStatus()).toBe(HttpStatus.BAD_GATEWAY);
    expect(error.message).toBe("Sentry request failed (500): Internal Error");
  });
});
