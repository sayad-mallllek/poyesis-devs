import { describe, expect, it } from "vitest";
import { parseNextCursor, sentryConfig, sentryPath } from "./sentry-api.js";

describe("parseNextCursor", () => {
  it("returns the next cursor when more results exist", () => {
    const link =
      '<https://sentry.io/api/0/organizations/acme/projects/?&cursor=1726000000000:0:1>; rel="previous"; results="false"; cursor="1726000000000:0:1", ' +
      '<https://sentry.io/api/0/organizations/acme/projects/?&cursor=1726000000000:100:0>; rel="next"; results="true"; cursor="1726000000000:100:0"';
    expect(parseNextCursor(link)).toBe("1726000000000:100:0");
  });

  it("returns null on the last page", () => {
    const link =
      '<https://sentry.io/api/0/x/?&cursor=0:0:1>; rel="previous"; results="true"; cursor="0:0:1", ' +
      '<https://sentry.io/api/0/x/?&cursor=0:100:0>; rel="next"; results="false"; cursor="0:100:0"';
    expect(parseNextCursor(link)).toBeNull();
  });

  it("handles a missing header", () => {
    expect(parseNextCursor(null)).toBeNull();
    expect(parseNextCursor("")).toBeNull();
  });
});

describe("sentryPath", () => {
  it("encodes interpolated segments only", () => {
    expect(sentryPath`/projects/${"acme"}/${"web app/../x"}/issues/`).toBe("/projects/acme/web%20app%2F..%2Fx/issues/");
  });
});

describe("sentryConfig", () => {
  it("defaults to sentry.io and trims trailing slashes", () => {
    expect(sentryConfig({ organizationSlug: "acme" })).toEqual({ baseUrl: "https://sentry.io", organizationSlug: "acme" });
    expect(sentryConfig({ organizationSlug: "acme", baseUrl: "https://de.sentry.io//" }).baseUrl).toBe("https://de.sentry.io");
  });
});
