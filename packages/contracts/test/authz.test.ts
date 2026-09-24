import { describe, expect, it } from "vitest";
import { accessScope, can, permittedFields, redactFields, type Principal } from "../src/index.js";

const principal = (role: Principal["role"], overrides: Partial<Principal> = {}): Principal => ({
  id: "me",
  role,
  memberProjectIds: ["p1", "p2"],
  managedProjectIds: ["p1"],
  ...overrides,
});

describe("ABAC engine", () => {
  it("grants administrators everything, including ratings", () => {
    const admin = principal("ADMIN");
    expect(can(admin, "delete", "Project", { id: "zzz" })).toBe(true);
    expect(can(admin, "update", "UserSkill", { userId: "other" }, "rating")).toBe(true);
    expect(accessScope(admin, "read", "UserNote")).toEqual({ kind: "all" });
  });

  it("hides skill ratings from everyone but administrators", () => {
    for (const role of ["MANAGER", "MEMBER"] as const) {
      const p = principal(role);
      expect(can(p, "read", "UserSkill", { userId: "other" })).toBe(true);
      expect(can(p, "read", "UserSkill", { userId: "me" }, "rating")).toBe(false);
      expect(can(p, "update", "UserSkill", { userId: "me" }, "rating")).toBe(false);
      expect(can(p, "update", "UserSkill", { userId: "me" }, "level")).toBe(true);
    }
    const record = { level: 3, rating: 5, ratingNote: "x" };
    expect(redactFields(principal("MEMBER"), "UserSkill", record, ["rating", "ratingNote"])).toEqual({ level: 3 });
  });

  it("scopes members to their projects", () => {
    const member = principal("MEMBER");
    expect(can(member, "read", "Project", { id: "p2" })).toBe(true);
    expect(can(member, "read", "Project", { id: "p9" })).toBe(false);
    expect(can(member, "update", "Project", { id: "p2" })).toBe(false);
    expect(can(member, "update", "Project", { id: "p1" })).toBe(true);
    expect(can(member, "read", "Milestone", { projectId: "p2" })).toBe(true);
    expect(accessScope(member, "read", "Project")).toEqual({ kind: "conditional", anyOf: ["projectMember"] });
    expect(accessScope(member, "read", "Allocation")).toEqual({
      kind: "conditional",
      anyOf: ["self", "projectMember"],
    });
  });

  it("lets managers manage only the projects they own or lead", () => {
    const manager = principal("MANAGER");
    expect(can(manager, "read", "Project", { id: "p9" })).toBe(true);
    expect(can(manager, "update", "Project", { id: "p9" })).toBe(false);
    expect(can(manager, "create", "Milestone", { projectId: "p1" })).toBe(true);
    expect(can(manager, "create", "Milestone", { projectId: "p9" })).toBe(false);
  });

  it("restricts self-service profile edits to safe fields", () => {
    const member = principal("MEMBER");
    expect(
      permittedFields(member, "update", "User", ["firstName", "role", "costRate", "bio"], { id: "me" }),
    ).toEqual(["firstName", "bio"]);
    expect(can(member, "update", "User", { id: "someone" }, "firstName")).toBe(false);
  });

  it("keeps notes and integrations away from members and guests", () => {
    for (const role of ["MEMBER", "GUEST"] as const) {
      expect(can(principal(role), "read", "UserNote")).toBe(false);
      expect(can(principal(role), "read", "Integration")).toBe(false);
      expect(accessScope(principal(role), "read", "UserNote")).toEqual({ kind: "none" });
    }
  });

  it("answers resource-less questions optimistically for conditional rules", () => {
    expect(can(principal("MEMBER"), "update", "Project")).toBe(true);
    expect(can(principal("GUEST"), "create", "Project")).toBe(false);
  });
});
