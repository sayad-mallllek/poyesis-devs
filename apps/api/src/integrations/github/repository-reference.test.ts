import { describe, expect, it } from "vitest";
import { parseRepositoryReference } from "./repository-reference.js";

const acme = { owner: "acme", name: "api" };

describe("parseRepositoryReference", () => {
  it.each([
    "acme/api",
    "  acme/api  ",
    "https://github.com/acme/api",
    "https://github.com/acme/api/",
    "https://github.com/acme/api.git",
    "http://www.github.com/acme/api",
    "https://github.com/acme/api/tree/main/src",
    "https://github.com/acme/api/pull/12?diff=split#top",
    "github.com/acme/api",
    "git@github.com:acme/api.git",
    "ssh://git@github.com/acme/api.git",
    "https://ghe.example.com/acme/api",
  ])("parses %s", (input) => {
    expect(parseRepositoryReference(input)).toEqual(acme);
  });

  it("keeps dots, dashes and underscores in names", () => {
    expect(parseRepositoryReference("my-org/web.app_v2")).toEqual({ owner: "my-org", name: "web.app_v2" });
    expect(parseRepositoryReference("acme/.github")).toEqual({ owner: "acme", name: ".github" });
  });

  it.each([
    "",
    "acme",
    "acme/",
    "/api",
    "https://github.com/acme",
    "-acme/api",
    "acme/..",
    "acme/api name",
    "https://",
    "acme_org/api",
  ])("rejects %j", (input) => {
    expect(parseRepositoryReference(input)).toBeNull();
  });
});
