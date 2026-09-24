import { describe, expect, it } from "vitest";
import { baseCodeFromName, codeCandidate, codeSearchPrefix, nextAvailableCode } from "./project-code.js";

const CONTRACT_PATTERN = /^[A-Z][A-Z0-9-]{1,19}$/;

describe("project codes", () => {
  it.each([
    ["Acme Website", "ACME-WEBSITE"],
    ["  acme   website!! ", "ACME-WEBSITE"],
    ["Café Société — Refonte", "CAFE-SOCIETE-REFONTE"],
    ["2026 Roadmap", "P-2026-ROADMAP"],
    ["A very long project name that goes on", "A-VERY-LONG-PROJECT"],
    ["X", "PRJ"],
    ["日本語", "PRJ"],
  ])("derives %j → %j", (name, code) => {
    const result = baseCodeFromName(name);
    expect(result).toBe(code);
    expect(result).toMatch(CONTRACT_PATTERN);
  });

  it("never ends with a dash after truncation", () => {
    expect(baseCodeFromName("Abcdefghijklmnopqrs tuv")).toBe("ABCDEFGHIJKLMNOPQRS");
  });

  it("suffixes collisions and keeps within the length limit", () => {
    const base = "ABCDEFGHIJKLMNOPQRST";
    expect(codeCandidate(base, 1)).toBe(base);
    expect(codeCandidate(base, 2)).toBe("ABCDEFGHIJKLMNOPQR-2");
    expect(codeCandidate(base, 12)).toBe("ABCDEFGHIJKLMNOPQ-12");
    for (const n of [2, 10, 100, 999]) {
      const candidate = codeCandidate(base, n);
      expect(candidate).toMatch(CONTRACT_PATTERN);
      expect(candidate.startsWith(codeSearchPrefix(base))).toBe(true);
    }
  });

  it("picks the first free candidate", () => {
    expect(nextAvailableCode("ACME", new Set())).toBe("ACME");
    expect(nextAvailableCode("ACME", new Set(["ACME"]))).toBe("ACME-2");
    expect(nextAvailableCode("ACME", new Set(["ACME", "ACME-2", "ACME-3"]))).toBe("ACME-4");
    expect(nextAvailableCode("ACME", new Set(["ACME-2"]))).toBe("ACME");
  });
});
